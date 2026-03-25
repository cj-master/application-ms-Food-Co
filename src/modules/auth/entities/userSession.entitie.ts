import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';
import { AuthProviderEnum } from '../enum/authProvider.enum';
import { UserSessionStatusEnum } from '../enum/userSessionStatus.enum';
import { DeviceTypeEnum } from '../enum/deviceType.enum';

export type UserSessionDocument = HydratedDocument<UserSession>;

@Schema({
  timestamps: true,
  collection: 'user_sessions',
})
export class UserSession extends Document {

  // ── Relación con User ──────────────────────────────────────────────────────

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  // ── Token ──────────────────────────────────────────────────────────────────

  @Prop({ required: true, unique: true, index: true, select: false })
  refreshToken: string;               // guardado como hash (bcrypt)

  @Prop({ required: true, index: true })
  jti: string;                        // JWT ID — puente entre el JWT y la BD
                                      // permite invalidar un access token específico

  // ── Proveedor de auth ──────────────────────────────────────────────────────
  @Prop({ type: String, enum: AuthProviderEnum, default: AuthProviderEnum.LOCAL })
  authProvider: AuthProviderEnum;     // saber si la sesión vino de Google, Apple, etc.

  // ── Fechas ─────────────────────────────────────────────────────────────────

  @Prop({ required: true, type: Date })
  expiresAt: Date;                    // 30 días desde la creación

  @Prop({ type: Date, default: null })
  lastUsedAt: Date | null;            // se actualiza en cada uso del refresh token

  @Prop({ type: Date, default: null })
  revokedAt: Date | null;

  // ── Estado ─────────────────────────────────────────────────────────────────

  @Prop({
    type: String,
    enum: UserSessionStatusEnum,
    default: UserSessionStatusEnum.ACTIVE,
    index: true,
  })
  status: UserSessionStatusEnum;      // 'active' | 'revoked' | 'expired'

  // ── Dispositivo ────────────────────────────────────────────────────────────

  @Prop({ type: String, enum: DeviceTypeEnum, default: DeviceTypeEnum.UNKNOWN })
  deviceType: DeviceTypeEnum;         // 'mobile' | 'tablet' | 'desktop' | 'unknown'

  @Prop({ type: String, default: null })
  deviceName: string | null;          // ej: "iPhone 15 Pro", "Chrome on Android"

  @Prop({ type: String, default: null })
  userAgent: string | null;

  @Prop({ type: String, default: null })
  os: string | null;                  // ej: "iOS 17", "Android 14"

  @Prop({ type: String, default: null })
  browser: string | null;             // ej: "Safari", "Chrome"

  // ── Red ────────────────────────────────────────────────────────────────────

  @Prop({ required: true })
  ipAddress: string;

  @Prop({ type: String, default: null })
  country: string | null;

  @Prop({ type: String, default: null })
  city: string | null;

  // ── Revocación ─────────────────────────────────────────────────────────────

  @Prop({ type: String, default: null })
  revokeReason: string | null;        // 'logout' | 'logout_all' | 'suspicious_activity'

  // timestamps
  createdAt: Date;
  updatedAt: Date;
}

export const UserSessionSchema = SchemaFactory.createForClass(UserSession);

// ─── TTL Index ────────────────────────────────────────────────────────────────
// MongoDB elimina automáticamente las sesiones expiradas — sin cron jobs

UserSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ─── Índices compuestos ───────────────────────────────────────────────────────

// Ver todas las sesiones activas de un usuario (pantalla "sesiones abiertas")
UserSessionSchema.index({ userId: 1, status: 1 });

// Revocar sesiones de un proveedor específico (ej: revocar solo las de Google)
UserSessionSchema.index({ userId: 1, authProvider: 1 });

// Validar un JWT por su jti
UserSessionSchema.index({ jti: 1, status: 1 });

// ─── toJSON ───────────────────────────────────────────────────────────────────

UserSessionSchema.set('toJSON', {
  virtuals: true,
  transform: (_: any, ret: Record<string, any>) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.refreshToken;          // nunca exponer el hash
    delete ret.__v;
    return ret;
  },
});