import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from '../services/auth.service';
import { Controller } from '@nestjs/common';

@Controller()
export class AuthController {
  constructor(private readonly service: AuthService) { }

  // ── Registro ───────────────────────────────────────────────────────────────
  @MessagePattern('auth.register')
  register(
    @Payload()
    payload: { email: string; password: string; username: string; displayName: string; }) {

    return this.service.register(payload); // Devuelve: { accessToken, refreshToken }
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  @MessagePattern('auth.login')
  login(@Payload() payload: { email: string; password: string; ipAddress: string; userAgent: string; }) {

    return this.service.login(payload); // Devuelve: { accessToken, refreshToken }
  }

  // ── OAuth ──────────────────────────────────────────────────────────────────
  @MessagePattern('auth.oauth.login')
  loginWithOAuth(
    @Payload()
    payload: {
      provider: string;
      providerId: string;
      email: string;
      displayName: string;
      avatarUrl?: string;
      accessToken?: string;
      tokenExpiresAt?: Date;
      ipAddress: string;
      userAgent: string;
    },
  ) {

    return this.service.loginWithOAuth(payload as any); // Devuelve: { accessToken, refreshToken }
  }

  // ── Refresh ────────────────────────────────────────────────────────────────
  @MessagePattern('auth.refresh')
  refresh(@Payload() payload: { refreshToken: string; ipAddress: string; }) {

    return this.service.refresh(payload.refreshToken, payload.ipAddress); // Devuelve: { accessToken, refreshToken } nuevos (rotación)
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  @MessagePattern('auth.logout')
  logout(@Payload() payload: { jti: string }) {
    return this.service.logout(payload.jti);
  }

  @MessagePattern('auth.logout.all')
  logoutAll(@Payload() payload: { userId: string }) {
    return this.service.logoutAll(payload.userId);
  }

  // ── Sesiones activas ───────────────────────────────────────────────────────
  @MessagePattern('auth.sessions.list')
  getActiveSessions(@Payload() payload: { userId: string }) {
    return this.service.getActiveSessions(payload.userId); // Devuelve: UserSession[] — para mostrar "dispositivos con sesión abierta"
  }

  @MessagePattern('auth.sessions.revoke')
  revokeSession(@Payload() payload: { sessionId: string; userId: string }) {
    // Revocar una sesión específica (cerrar sesión en un dispositivo en particular)
    return this.service.revokeSessionById(payload.sessionId, payload.userId);
  }

  // ── Validar access token — usado por el AuthGuard del gateway ────────────
  // Patrón equivalente a auth.admin.verify del Admin Service

  // Devuelve: { userId, username, displayName, role, jti, isVerified }
  @MessagePattern('auth.user.verify')
  validateAccessToken(@Payload() payload: { token: string }) {
    return this.service.validateAccessToken(payload.token);
  }

}