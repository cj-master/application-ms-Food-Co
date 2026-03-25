import { LogOutDto, RefreshTokensDto, ValidateAccessDto } from 'src/common';
import { AdminIdDto, LoginAdminDto, RegisterAdminDto } from '../dtos/dtos';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthAdminService } from '../services/services';
import { Controller } from '@nestjs/common';

@Controller()
export class AuthAdminController {
  constructor(private readonly service: AuthAdminService) { }

  // Register Seed
  @MessagePattern('auth.admin.register.seed')
  registerSeed(@Payload() registerAdminDto: RegisterAdminDto) {
    return this.service.register(registerAdminDto);
  }

  @MessagePattern('auth.admin.register')
  register(@Payload() registerAdminDto: RegisterAdminDto) {
    return this.service.register(registerAdminDto);
  }

  // Iniciar sesion
  @MessagePattern('auth.admin.login')
  loginUser(@Payload() loginDto: LoginAdminDto) {
    return this.service.login(loginDto);
  }

  // Cerrar sesion
  @MessagePattern('auth.admin.logout')
  logOut(@Payload() logOutDto: LogOutDto) {
    return this.service.logout(logOutDto);
  }

  // Cerrar session en todo los dispositivos
  @MessagePattern('auth.admin.logout.all.sessions')
  logOutAll(@Payload() adminIdDto: AdminIdDto) {
    return this.service.logoutAllSessions(adminIdDto);
  }

  // Refrescar token
  @MessagePattern('auth.admin.refresh.tokens')
  refreshTokens(@Payload() refreshTokensDto: RefreshTokensDto) {
    return this.service.refreshTokens(refreshTokensDto);
  }

  // Obtener sesiones activas
  @MessagePattern('auth.admin.get.active.sessions')
  getActiveSessions(@Payload() adminIdDto: AdminIdDto) {
    return this.service.getActiveSessions(adminIdDto);
  }

  // Verificar sesion
  @MessagePattern('auth.admin.verify')
  verifyUser(@Payload() validateAccessDto: ValidateAccessDto) {
    return this.service.validateAccessToken(validateAccessDto);
  }
}
