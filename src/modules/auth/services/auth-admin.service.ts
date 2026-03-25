import { AdminStatusEnum, AdminRoleEnum, SessionAdminStatusEnum, DeviceTypeEnum } from '../enum/enum';
import { Admin, AdminDocument, AdminSession, SessionDocument } from '../entities/entities';
import { DeviceInfoDto, LogOutDto, RefreshTokensDto, ValidateAccessDto } from 'src/common';
import { AdminIdDto, LoginAdminDto, RegisterAdminDto } from '../dtos/dtos';
import { RpcException } from '@nestjs/microservices';
import { TokenPair } from '../interface/inteface';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { JwtPayload } from 'jsonwebtoken';
import { JwtService } from '@nestjs/jwt';
import * as UAParser from 'ua-parser-js';
import { v4 as uuidv4 } from 'uuid';
import { envs } from 'src/config';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';


// ─── Tipos internos ───────────────────────────────────────────────────────────
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutos

// ─── Service ──────────────────────────────────────────────────────────────────
@Injectable()
export class AuthAdminService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    @InjectModel(AdminSession.name) private sessionModel: Model<SessionDocument>,
    private jwtService: JwtService,
  ) { }

  public async registerSeed(dto: RegisterAdminDto): Promise<{ admin: Partial<AdminDocument> }> {
    // 1. Verificar que no existe ningún admin en BD
    const adminCount = await this.adminModel.countDocuments().exec();
    if (adminCount > 0) throw new RpcException({ message: 'El registro seed ya fue ejecutado', status: 403, });

    // 2. Verificar que el email no esté registrado (doble seguridad)
    const exists = await this.adminModel
      .findOne({ email: dto.email.toLowerCase().trim() })
      .exec();

    if (exists) throw new RpcException({ message: 'El email ya está registrado', status: 409 });

    // 3. Hashear contraseña
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // 4. Crear el super_admin
    const admin = await this.adminModel.create({
      name: dto.name.trim(),
      email: dto.email.toLowerCase().trim(),
      password: hashedPassword,
      role: AdminRoleEnum.SUPER_ADMIN,   // el primer admin siempre es super_admin
      status: AdminStatusEnum.ACTIVE,
    });

    return { admin: admin.toJSON() };
  }

  public async register(dto: RegisterAdminDto): Promise<{ admin: Partial<AdminDocument> }> {
    // 2. Verificar que el email no esté registrado (doble seguridad)
    const exists = await this.adminModel
      .findOne({ email: dto.email.toLowerCase().trim() })
      .exec();

    if (exists) throw new RpcException({ message: 'El email ya está registrado', status: 409 });

    // 3. Hashear contraseña
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // 4. Crear el super_admin
    const admin = await this.adminModel.create({
      name: dto.name.trim(),
      email: dto.email.toLowerCase().trim(),
      password: hashedPassword,
      role: AdminRoleEnum.SUPER_ADMIN,   // el primer admin siempre es super_admin
      status: AdminStatusEnum.ACTIVE,
    });

    return { admin: admin.toJSON() };
  }

  // ─── LOGIN ──────────────────────────────────────────────────────────────────
  public async login(loginDto: LoginAdminDto): Promise<{ tokens: TokenPair; admin: Partial<AdminDocument> }> {
    const { email, password, deviceInfo } = loginDto

    // 1. Buscar admin incluyendo campos select:false necesarios
    const admin = await this.adminModel
      .findOne({ email: email.toLowerCase().trim() })
      .select('+password +refreshToken')
      .exec();

    if (!admin) throw new RpcException({ message: 'Credenciales inválidas', status: 400 });

    // 2. Verificar si la cuenta está suspendida/inactiva 
    if (admin.status !== AdminStatusEnum.ACTIVE) throw new RpcException({ message: `Cuenta ${admin.status}`, status: 403 });

    // 3. Verificar bloqueo por intentos fallidos
    const isLocked = !!(admin.lockUntil && admin.lockUntil > new Date());
    if (isLocked) {
      const minutesLeft = Math.ceil((admin.lockUntil!.getTime() - Date.now()) / 60000);
      throw new RpcException({ message: `Cuenta bloqueada. Intenta de nuevo en ${minutesLeft} minuto(s)`, status: 403 });
    }

    // 4. Verificar password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      await this.handleFailedAttempt(admin);
      throw new RpcException({ message: 'Credenciales inválidas', status: 401 });
    }

    // 5. Reset intentos fallidos + actualizar lastLogin
    await this.adminModel.updateOne(
      { _id: admin._id },
      {
        loginAttempts: 0,
        lockUntil: null,
        lastLogin: new Date(),
      },
    );

    // 6. Crear sesión y generar tokens
    const tokens = await this.createSession(admin, deviceInfo);

    // 7. Retornar sin campos sensibles
    const adminObj = admin.toJSON();
    return {
      tokens,
      admin: adminObj
    };
  }

  // ─── REFRESH TOKEN ──────────────────────────────────────────────────────────
  public async refreshTokens({ refreshToken, deviceInfo }: RefreshTokensDto): Promise<TokenPair> {
    // 1. Verificar firma del refresh token
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: envs.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new RpcException({ message: 'Refresh token inválido o expirado', status: 401 });
    }

    // 2. Buscar sesión en BD por jti
    const session = await this.sessionModel
      .findOne({ jti: payload.jti, status: SessionAdminStatusEnum.ACTIVE })
      .select('+refreshToken')
      .exec();

    if (!session) throw new RpcException({ message: 'Sesión no encontrada o revocada', status: 401 });

    // 3. Verificar que el refresh token coincide con el hash en BD
    const isTokenValid = await bcrypt.compare(refreshToken, session.refreshToken);
    if (!isTokenValid) {
      // Posible robo de token — revocar toda la sesión
      await this.revokeSession(session.jti, 'token_mismatch');
      throw new RpcException({ message: 'Token inválido', status: 401 });
    }

    // 4. Verificar que el admin sigue activo
    const admin = await this.adminModel.findById(payload.sub).exec();
    if (!admin || admin.status !== AdminStatusEnum.ACTIVE) {
      await this.revokeSession(session.jti, 'admin_inactive');
      throw new RpcException({ messsage: 'Cuenta inactiva', status: 403 });
    }

    // 5. Rotar tokens — invalidar sesión anterior y crear nueva
    await this.revokeSession(session.jti, 'token_rotated');
    const tokens = await this.createSession(admin, deviceInfo);

    return tokens;
  }

  // ─── LOGOUT ─────────────────────────────────────────────────────────────────
  public async logout(logOutDto: LogOutDto) {
    const { jti } = logOutDto;
    await this.revokeSession(jti, 'logout');

    return ({ message: 'Sesión Cerrada!' })
  }

  public async logoutAllSessions({ adminId }: AdminIdDto): Promise<void> {
    await this.sessionModel.updateMany(
      { adminId, status: SessionAdminStatusEnum.ACTIVE },
      {
        status: SessionAdminStatusEnum.REVOKED,
        revokedAt: new Date(),
        revokeReason: 'forced_logout_all',
      },
    );
  }

  // ─── SESIONES ACTIVAS ────────────────────────────────────────────────────────
  public async getActiveSessions({ adminId }: AdminIdDto): Promise<SessionDocument[]> {
    return this.sessionModel
      .find({ adminId, status: SessionAdminStatusEnum.ACTIVE })
      .select('-refreshToken')
      .sort({ lastUsedAt: -1 })
      .exec();
  }

  // ─── VALIDAR ACCESS TOKEN (usado por el Guard) ───────────────────────────────
  public async validateAccessToken({ token }: ValidateAccessDto) {
    // 1. Verificar firma y expiración del JWT
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token, { secret: envs.JWT_ACCESS_SECRET });
    } catch (error) {
      throw new RpcException({ message: 'Token inválido o expirado', status: 401 });
    }

    // 2. Verificar que la sesión sigue activa en BD
    const session = await this.sessionModel
      .findOne({ jti: payload.jti, status: SessionAdminStatusEnum.ACTIVE })
      .exec();

    if (!session) throw new RpcException({ message: 'Sesión revocada o no encontrada', status: 401 });

    // 3. Actualizar lastUsedAt sin bloquear el flujo
    this.sessionModel
      .updateOne({ _id: session._id }, { lastUsedAt: new Date() })
      .exec()
      .catch(() => { });

    // 4. Verificar que el admin sigue activo
    const admin = await this.adminModel.findById(payload.sub).exec();
    if (!admin || admin.status !== AdminStatusEnum.ACTIVE) throw new RpcException({ message: 'Cuenta inactiva o suspendida', status: 403 });

    return {
      email: admin.email,
      name: admin.name,
      jti: session.jti,
      adminId: admin._id,
      token
    }
  }

  // ─── HELPERS PRIVADOS ────────────────────────────────────────────────────────

  private async createSession(admin: AdminDocument, deviceInfo: DeviceInfoDto): Promise<TokenPair> {
    const jti = uuidv4();

    // Generar tokens
    const payload: JwtPayload = {
      sub: admin._id.toString(),
      email: admin.email,
      role: admin.role,
      jti,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: envs.JWT_ACCESS_SECRET
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: envs.JWT_REFRESH_SECRET,
      expiresIn: envs.JWT_ACCESS_EXPIRES_IN as any,
    });

    // Hashear refresh token antes de guardarlo
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    // Parsear user agent
    const { deviceType, deviceName, os, browser } = this.parseUserAgent(
      deviceInfo.userAgent,
    );

    // Calcular expiración del refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Guardar sesión en BD
    await this.sessionModel.create({
      adminId: admin._id,
      refreshToken: hashedRefreshToken,
      jti,
      expiresAt,
      lastUsedAt: new Date(),
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent ?? null,
      deviceType,
      deviceName,
      os,
      browser,
    });

    return { accessToken, refreshToken };
  }

  private async revokeSession(jti: string, reason: string): Promise<void> {
    await this.sessionModel.updateOne(
      { jti },
      {
        status: SessionAdminStatusEnum.REVOKED,
        revokedAt: new Date(),
        revokeReason: reason,
      },
    );
  }

  private async handleFailedAttempt(admin: AdminDocument): Promise<void> {
    const attempts = admin.loginAttempts + 1;
    const update: Record<string, unknown> = { loginAttempts: attempts };

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      update.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
    }

    await this.adminModel.updateOne({ _id: admin._id }, update);
  }

  private parseUserAgent(userAgent?: string): { deviceType: DeviceTypeEnum; deviceName: string | null; os: string | null; browser: string | null; } {
    if (!userAgent) return { deviceType: DeviceTypeEnum.UNKNOWN, deviceName: null, os: null, browser: null };

    const parser = new UAParser.UAParser(userAgent);
    const result = parser.getResult();

    const deviceKind = result.device.type;
    let deviceType = DeviceTypeEnum.DESKTOP;
    if (deviceKind === 'mobile') deviceType = DeviceTypeEnum.MOBILE;
    else if (deviceKind === 'tablet') deviceType = DeviceTypeEnum.TABLET;

    const os = result.os.name
      ? `${result.os.name}${result.os.version ? ' ' + result.os.version : ''}`
      : null;

    const browser = result.browser.name
      ? `${result.browser.name}${result.browser.version ? ' ' + result.browser.version : ''}`
      : null;

    const deviceName = browser && os ? `${browser} on ${os}` : null;

    return { deviceType, deviceName, os, browser };
  }
}