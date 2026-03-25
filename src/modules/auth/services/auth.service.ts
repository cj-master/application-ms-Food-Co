import { LoginPayload, OAuthPayload, RegisterPayload, TokenPair } from '../interface/inteface';
import { User, UserDocument, UserSession, UserSessionDocument } from '../entities/entities';
import { DeviceTypeEnum, UserSessionStatusEnum, UserStatusEnum } from '../enum/enum';
import { RpcException } from '@nestjs/microservices';
import { JwtPayload } from 'src/interface/interface';
import { AuthProviderEnum } from '../enum/enum';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import { UAParser } from 'ua-parser-js';
import { randomUUID } from 'node:crypto'
import * as bcrypt from 'bcrypt';
import { envs } from 'src/config';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCK_TIME_MS = 30 * 60 * 1000;        // 30 minutos
  private readonly REFRESH_TOKEN_DAYS = 30;

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(UserSession.name) private readonly sessionModel: Model<UserSessionDocument>,
    private readonly jwtService: JwtService,
  ) { }

  // ── Registro con email + password ─────────────────────────────────────────
  async register(payload: RegisterPayload): Promise<TokenPair> {
    const { email, password, username, displayName } = payload;

    // Verificar que email y username no estén en uso
    const [existingEmail, existingUsername] = await Promise.all([
      this.userModel.findOne({ email }).lean(),
      this.userModel.findOne({ username }).lean(),
    ]);

    if (existingEmail) throw new RpcException({ message: 'El email ya está registrado', status: 409 });
    if (existingUsername) throw new RpcException({ message: 'El username ya está en uso', status: 409 });

    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

    const user = await this.userModel.create({
      email,
      username,
      displayName,
      password: hashedPassword,
      authProvider: AuthProviderEnum.LOCAL,
    });

    // No creamos sesión aquí — el usuario debe hacer login
    // Esto es una decisión intencional: separar registro de autenticación
    return this.createSession(user, { ipAddress: '', userAgent: '' });
  }

  // ── Login con email + password ─────────────────────────────────────────────
  async login(payload: LoginPayload): Promise<TokenPair> {
    const { email, password, ipAddress, userAgent } = payload;

    // Traer el password que tiene select: false
    const user = await this.userModel
      .findOne({ email })
      .select('+password')
      .exec();

    if (!user) throw new RpcException({ message: 'Credenciales inválidas', status: 401 });

    // Verificar estado de la cuenta
    this.assertUserIsActive(user);

    // Verificar si la cuenta está bloqueada por intentos fallidos
    if (user.isLocked) throw new RpcException({ message: 'Cuenta bloqueada temporalmente. Intenta en 30 minutos.', status: 403 })

    const passwordMatch = await bcrypt.compare(password, user.password!);

    if (!passwordMatch) {
      await this.handleFailedLogin(user);
      throw new RpcException({ message: 'Credenciales inválidas', status: 401 });
    }

    // Login exitoso: resetear intentos fallidos y actualizar lastLogin
    await this.userModel.findByIdAndUpdate(user._id, {
      $set: { loginAttempts: 0, lockUntil: null, lastLogin: new Date() },
    });

    return this.createSession(user, { ipAddress, userAgent });
  }

  // ── Login / Registro con OAuth ─────────────────────────────────────────────
  async loginWithOAuth(payload: OAuthPayload): Promise<TokenPair> {
    const { provider, providerId, email, displayName, avatarUrl,
      accessToken, tokenExpiresAt, ipAddress, userAgent } = payload;

    // Buscar si ya existe una cuenta con este proveedor
    let user = await this.userModel.findOne({
      'oauthProviders.provider': provider,
      'oauthProviders.providerId': providerId,
    }).select('+oauthProviders').exec();

    if (user) {
      // Ya existe — actualizar el accessToken del proveedor
      await this.userModel.updateOne(
        { _id: user._id, 'oauthProviders.provider': provider },
        {
          $set: {
            'oauthProviders.$.accessToken': accessToken ?? null,
            'oauthProviders.$.tokenExpiresAt': tokenExpiresAt ?? null,
            lastLogin: new Date(),
          },
        },
      );
    } else {
      // No existe — buscar por email para vincular a una cuenta local
      user = await this.userModel.findOne({ email }).select('+oauthProviders').exec();

      if (user) {
        // El email ya existe: vincular el proveedor OAuth a la cuenta existente
        await this.userModel.findByIdAndUpdate(user._id, {
          $push: {
            oauthProviders: { provider, providerId, accessToken, tokenExpiresAt },
          },
          $set: { lastLogin: new Date() },
        });
      } else {
        // Primera vez: crear cuenta nueva
        const username = await this.generateUniqueUsername(email);

        user = await this.userModel.create({
          email,
          username,
          displayName,
          avatarUrl: avatarUrl ?? null,
          password: null,
          authProvider: provider,
          oauthProviders: [{ provider, providerId, accessToken, tokenExpiresAt }],
          lastLogin: new Date(),
        });
      }
    }

    this.assertUserIsActive(user);
    return this.createSession(user, { ipAddress, userAgent });
  }

  // ── Refresh — rotar el token de sesión ────────────────────────────────────
  async refresh(rawRefreshToken: string, ipAddress: string): Promise<TokenPair> {
    // Buscar la sesión por el hash del token
    const sessions = await this.sessionModel
      .find({ status: UserSessionStatusEnum.ACTIVE })
      .select('+refreshToken')
      .exec();

    // Comparar con bcrypt (no podemos buscar directamente por hash bcrypt)
    let session: UserSessionDocument | null = null;
    for (const s of sessions) {
      const match = await bcrypt.compare(rawRefreshToken, s.refreshToken);
      if (match) { session = s; break; }
    }

    if (!session) throw new RpcException({ message: 'Sesión inválida o expirada', status: 401 });

    if (session.expiresAt < new Date()) {
      await this.revokeSession(session, 'expired');
      throw new RpcException({ message: 'La sesión ha expirado. Inicia sesión nuevamente.', status: 401 });
    }

    const user = await this.userModel.findById(session.userId).exec();
    if (!user) throw new RpcException({ message: 'Usuario no encontrado', status: 401 });

    this.assertUserIsActive(user);

    // Revocar la sesión actual y crear una nueva (rotación)
    await this.revokeSession(session, 'rotated');
    return this.createSession(user, { ipAddress, userAgent: session.userAgent ?? '' });
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  async logout(jti: string) {
    await this.sessionModel.findOneAndUpdate(
      { jti, status: UserSessionStatusEnum.ACTIVE },
      { $set: { status: UserSessionStatusEnum.REVOKED, revokedAt: new Date(), revokeReason: 'logout' } },
    );

    return ({ message: 'Sesión cerrada!' })
  }

  // Cerrar todas las sesiones del usuario (logout en todos los dispositivos)
  async logoutAll(userId: string) {
    await this.sessionModel.updateMany(
      { userId: new Types.ObjectId(userId), status: UserSessionStatusEnum.ACTIVE },
      { $set: { status: UserSessionStatusEnum.REVOKED, revokedAt: new Date(), revokeReason: 'logout_all' } },
    );

    return ({ message: 'Sesiones cerradas!' })
  }

  // ── Validar access token (usado por el AuthGuard del gateway) ────────────
  // Mismo patrón que validateAccessToken del Admin Service:
  // 1. Verifica firma y expiración del JWT
  // 2. Verifica que la sesión sigue activa en BD
  // 3. Actualiza lastUsedAt sin bloquear el flujo
  // 4. Verifica que el usuario sigue activo

  async validateAccessToken(token: string): Promise<{
    userId: string;
    username: string;
    displayName: string;
    role: string;
    jti: string;
    isVerified: boolean;
  }> {
    // 1. Verificar firma y expiración del JWT
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token, {
        secret: envs.JWT_ACCESS_SECRET,
      });
    } catch {
      throw new RpcException({ message: 'Token inválido o expirado', status: 401 });
    }

    // 2. Verificar que la sesión sigue activa en BD
    const session = await this.sessionModel
      .findOne({ jti: payload.jti, status: UserSessionStatusEnum.ACTIVE })
      .exec();

    if (!session) throw new RpcException({ message: 'Sesión revocada o no encontrada', status: 401 });

    if (session.expiresAt < new Date()) {
      await this.revokeSession(session, 'expired');
      throw new RpcException({ message: 'La sesión ha expirado', status: 401 });
    }

    // 3. Actualizar lastUsedAt sin bloquear el flujo
    this.sessionModel
      .updateOne({ _id: session._id }, { lastUsedAt: new Date() })
      .exec()
      .catch(() => { });

    // 4. Verificar que el usuario sigue activo
    const user = await this.userModel.findById(payload.sub).exec();
    if (!user) {
      throw new RpcException({ message: 'Usuario no encontrado', status: 401 });
    }

    if (user.status === UserStatusEnum.BANNED) {
      throw new RpcException({ message: 'Cuenta suspendida', status: 403 });
    }
    if (user.status === UserStatusEnum.INACTIVE) {
      throw new RpcException({ message: 'Cuenta desactivada', status: 403 });
    }

    return {
      userId: user._id.toString(),
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      jti: payload.jti,
      isVerified: user.isVerified ?? false,
    };
  }


  // ── Sesiones activas del usuario ───────────────────────────────────────────
  async getActiveSessions(userId: string): Promise<UserSessionDocument[]> {
    return this.sessionModel
      .find({
        userId: new Types.ObjectId(userId),
        status: UserSessionStatusEnum.ACTIVE,
        expiresAt: { $gt: new Date() },
      })
      .sort({ lastUsedAt: -1 })
      .exec();
  }

  async revokeSessionById(sessionId: string, userId: string): Promise<void> {
    const session = await this.sessionModel.findOne({
      _id: sessionId,
      userId: new Types.ObjectId(userId),  // seguridad: el userId debe coincidir
    });
    if (!session) throw new RpcException({ message: 'Sesión no encontrada', status: 404 });
    await this.revokeSession(session, 'manual_revoke');
  }

  // ─── Helpers privados ──────────────────────────────────────────────────────
  private async createSession(user: UserDocument, meta: { ipAddress: string; userAgent: string }): Promise<TokenPair> {
    const jti = randomUUID();

    const jwtPayload: JwtPayload = {
      sub: user._id.toString(),
      username: user.username,
      role: user.role,
      jti,
    };

    const accessToken = this.jwtService.sign(jwtPayload, {
      expiresIn: '15m',
      secret: envs.JWT_ACCESS_SECRET,
    });

    // Generar refresh token como UUID y guardarlo hasheado
    const rawRefreshToken = randomUUID();
    const hashedRefreshToken = await bcrypt.hash(rawRefreshToken, this.SALT_ROUNDS);

    // Parsear el userAgent para información del dispositivo
    const ua = new UAParser(meta.userAgent);
    const osInfo = ua.getOS();
    const browser = ua.getBrowser();
    const device = ua.getDevice();

    const deviceType = this.resolveDeviceType(device.type);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_DAYS);

    await this.sessionModel.create({
      userId: user._id,
      refreshToken: hashedRefreshToken,
      jti,
      authProvider: user.authProvider,
      expiresAt,
      lastUsedAt: new Date(),
      ipAddress: meta.ipAddress || 'unknown',
      userAgent: meta.userAgent || null,
      deviceType,
      deviceName: device.model ?? null,
      os: osInfo.name ? `${osInfo.name} ${osInfo.version ?? ''}`.trim() : null,
      browser: browser.name ?? null,
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  private async handleFailedLogin(user: UserDocument): Promise<void> {
    const attempts = (user.loginAttempts ?? 0) + 1;

    if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
      await this.userModel.findByIdAndUpdate(user._id, {
        $set: {
          loginAttempts: attempts,
          lockUntil: new Date(Date.now() + this.LOCK_TIME_MS),
        },
      });
    } else {
      await this.userModel.findByIdAndUpdate(user._id, {
        $set: { loginAttempts: attempts },
      });
    }
  }

  private assertUserIsActive(user: UserDocument): void {
    if (user.status === UserStatusEnum.BANNED) throw new RpcException({ message: 'Esta cuenta ha sido suspendida.', status: 403 });
    if (user.status === UserStatusEnum.INACTIVE) throw new RpcException({ message: 'Esta cuenta está desactivada.', status: 403 });
  }

  private async revokeSession(session: UserSessionDocument, reason: string): Promise<void> {
    await this.sessionModel.findByIdAndUpdate(session._id, {
      $set: {
        status: UserSessionStatusEnum.REVOKED,
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });
  }

  // Genera un username único basado en el email (para OAuth)
  private async generateUniqueUsername(email: string): Promise<string> {
    const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._]/g, '_');
    let username = base;
    let attempt = 0;

    while (await this.userModel.exists({ username })) {
      attempt++;
      username = `${base}_${attempt}`;
    }

    return username;
  }

  private resolveDeviceType(type: string | undefined): DeviceTypeEnum {
    if (type === 'mobile') return DeviceTypeEnum.MOBILE;
    if (type === 'tablet') return DeviceTypeEnum.TABLET;
    if (type === 'console' || type === 'smarttv') return DeviceTypeEnum.DESKTOP;
    return DeviceTypeEnum.UNKNOWN;
  }
}