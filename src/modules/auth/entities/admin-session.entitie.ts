import { SessionAdminStatusEnum, DeviceTypeEnum } from '../enum/enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SessionDocument = HydratedDocument<AdminSession>;

@Schema({
  timestamps: true,
  collection: 'admin_sessions',
})
export class AdminSession {
  // ─── Relación con Admin ─────────────────────────────────────────────────────
  @Prop({
    type: Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true,
  })
  adminId: Types.ObjectId;

  // ─── Token ──────────────────────────────────────────────────────────────────
  @Prop({
    required: true,
    unique: true,
    index: true,
    select: false,         // no se expone en queries por defecto
  })
  refreshToken: string;   // guardado como hash (bcrypt)

  @Prop({
    required: true,
    index: true,
  })
  jti: string;            // JWT ID — identificador único del access token

  // ─── Fechas ─────────────────────────────────────────────────────────────────
  @Prop({ required: true, type: Date })
  expiresAt: Date;        // expiración del refresh token

  @Prop({ type: Date, default: null })
  lastUsedAt: Date | null; // última vez que se usó esta sesión

  @Prop({ type: Date, default: null })
  revokedAt: Date | null;

  // ─── Estado ─────────────────────────────────────────────────────────────────
  @Prop({
    type: String,
    enum: SessionAdminStatusEnum,
    default: SessionAdminStatusEnum.ACTIVE,
    index: true,
  })
  status: SessionAdminStatusEnum;

  // ─── Dispositivo ────────────────────────────────────────────────────────────
  @Prop({
    type: String,
    enum: DeviceTypeEnum,
    default: DeviceTypeEnum.UNKNOWN,
  })
  deviceType: DeviceTypeEnum;

  @Prop({ type: String, default: null })
  deviceName: string | null;  // ej: "Chrome on Windows", "Safari on iPhone"

  @Prop({ type: String, default: null })
  userAgent: string | null;

  @Prop({ type: String, default: null })
  os: string | null;          // ej: "Windows 11", "iOS 17"

  @Prop({ type: String, default: null })
  browser: string | null;     // ej: "Chrome 120"

  // ─── Ubicación / Red ────────────────────────────────────────────────────────
  @Prop({ required: true })
  ipAddress: string;

  @Prop({ type: String, default: null })
  country: string | null;     // ej: "Mexico"

  @Prop({ type: String, default: null })
  city: string | null;        // ej: "Mexico City"

  // ─── Razón de revocación ────────────────────────────────────────────────────
  @Prop({ type: String, default: null })
  revokeReason: string | null; // ej: "logout", "forced_logout", "password_changed"
}

export const AdminSessionSchema = SchemaFactory.createForClass(AdminSession);

// ─── TTL Index ────────────────────────────────────────────────────────────────
// MongoDB elimina automáticamente los documentos expirados
AdminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ─── Índices compuestos ───────────────────────────────────────────────────────
AdminSessionSchema.index({ adminId: 1, status: 1 });
AdminSessionSchema.index({ adminId: 1, ipAddress: 1 });

// ─── toJSON ───────────────────────────────────────────────────────────────────
AdminSessionSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.refreshToken;  // nunca exponer el token hasheado
    delete ret.__v;
    return ret;
  },
});