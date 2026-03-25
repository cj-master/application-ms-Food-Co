import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AdminRoleEnum, AdminStatusEnum } from '../enum/enum';
import { Document, HydratedDocument } from 'mongoose';

export type AdminDocument = HydratedDocument<Admin>;

@Schema({
  timestamps: true,        // agrega createdAt y updatedAt automáticamente
  collection: 'admins',
})
export class Admin extends Document {
  @Prop({
    required: true,
    trim: true,
  })
  name: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({
    required: true,
    select: false,         // NO se retorna en queries por defecto (seguridad)
  })
  password: string;

  @Prop({
    type: String,
    enum: AdminRoleEnum,
    default: AdminRoleEnum.ADMIN,
  })
  role: AdminRoleEnum;

  @Prop({
    type: String,
    enum: AdminStatusEnum,
    default: AdminStatusEnum.ACTIVE,
  })
  status: AdminStatusEnum;

  @Prop({
    type: String,
    select: false,         // NO se retorna en queries por defecto (seguridad)
    default: null,
  })
  refreshToken: string | null;

  @Prop({
    type: Date,
    default: null,
  })
  lastLogin: Date | null;

  @Prop({
    type: Number,
    default: 0,
  })
  loginAttempts: number;

  @Prop({
    type: Date,
    default: null,
  })
  lockUntil: Date | null;

  @Prop({
    type: String,
    select: false,
    default: null,
  })
  resetPasswordToken: string | null;

  @Prop({
    type: Date,
    default: null,
  })
  resetPasswordExpires: Date | null;

  @Prop({
    type: String,
    default: null,
  })
  avatar: string | null;

  // Métodos virtuales (disponibles en instancias del documento)
  isLocked?: boolean;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);

// ─── Virtual: isLocked ────────────────────────────────────────────────────────
// Determina si la cuenta está bloqueada por múltiples intentos fallidos
AdminSchema.virtual('isLocked').get(function (this: AdminDocument) {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

// ─── Índices compuestos ───────────────────────────────────────────────────────
AdminSchema.index({ email: 1, status: 1 });

// ─── Método de instancia: toJSON ──────────────────────────────────────────────
// Elimina campos sensibles al serializar
AdminSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.refreshToken;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpires;
    delete ret.__v;
    return ret;
  },
});