import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';
import { AuthProviderEnum, UserRoleEnum, UserStatusEnum, } from '../enum/enum';

// ─── Sub-document: OAuthProvider ─────────────────────────────────────────────

@Schema({ _id: false })
export class OAuthProvider {
  @Prop({ required: true, enum: AuthProviderEnum })
  provider: AuthProviderEnum;         // 'google' | 'facebook' | 'apple'

  @Prop({ required: true })
  providerId: string;                 // ID que devuelve Google/Facebook/Apple

  @Prop({ default: null, select: false })
  accessToken: string | null;         // select: false — no exponer en queries

  @Prop({ type: Date, default: null })
  tokenExpiresAt: Date | null;
}

export const OAuthProviderSchema = SchemaFactory.createForClass(OAuthProvider);

// ─── Sub-document: Preferences ───────────────────────────────────────────────

@Schema({ _id: false })
export class Preferences {
  @Prop({ type: [String], default: [] })
  foodSubCategories: string[];

  @Prop({ type: [String], default: [] })
  foodCategories: string[];
  // 'vegano' | 'vegetariano' | 'mariscos' | 'carnes' | 'postres' | 'panadería'

  @Prop({ type: [String], default: [] })
  priceRange: string[];
  // '$' | '$$' | '$$$'
}

export const PreferencesSchema = SchemaFactory.createForClass(Preferences);

// ─── Sub-document: SocialLinks ────────────────────────────────────────────────

@Schema({ _id: false })
export class SocialLinks {
  @Prop({ default: null })
  website: string | null;

  @Prop({ default: null })
  instagram: string | null;

  @Prop({ default: null })
  tiktok: string | null;
}

export const SocialLinksSchema = SchemaFactory.createForClass(SocialLinks);

// ─── Main Schema: User ────────────────────────────────────────────────────────

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User extends Document {

  // ── Identidad ──────────────────────────────────────────────────────────────
  @Prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-z0-9._]+$/,
    index: true,
  })
  username: string;                   // @apodo único, ej: "chef_mario"

  @Prop({ required: true, trim: true, maxlength: 80 })
  displayName: string;                // nombre visible en el perfil

  @Prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  })
  email: string;

  // ── Auth ───────────────────────────────────────────────────────────────────
  @Prop({ type: String, default: null, select: false })
  password: string | null;            // null si se registró solo con OAuth

  @Prop({ type: String, enum: AuthProviderEnum, default: AuthProviderEnum.LOCAL })
  authProvider: AuthProviderEnum;     // proveedor con el que se registró originalmente

  @Prop({
    type: [
      {
        provider: { type: String, enum: AuthProviderEnum, required: true },
        providerId: { type: String, required: true },
        accessToken: { type: String, default: null, select: false },
        tokenExpiresAt: { type: Date, default: null },
      },
    ],
    default: [],
    select: false,                  // no exponer providers en queries normales
  })
  oauthProviders: OAuthProvider[];    // puede vincular Google + Apple en el futuro

  // ── Perfil ─────────────────────────────────────────────────────────────────
  @Prop({ default: null })
  avatarUrl: string | null;           // URL pública en Cloudflare R2

  @Prop({ default: null, maxlength: 200 })
  bio: string | null;

  @Prop({ type: SocialLinksSchema, default: () => ({}) })
  socialLinks: SocialLinks;

  // ── Contadores denormalizados ──────────────────────────────────────────────
  // Se actualizan vía eventos NATS para no calcularlos en cada request
  @Prop({ default: 0, min: 0 })
  followersCount: number;

  @Prop({ default: 0, min: 0 })
  followingCount: number;

  @Prop({ default: 0, min: 0 })
  postsCount: number;

  @Prop({ default: 0, min: 0 })
  savedCount: number;

  // ── Preferencias de comida ─────────────────────────────────────────────────
  @Prop({ type: PreferencesSchema, default: () => ({}) })
  preferences: Preferences;

  @Prop({ default: false })
  onboardingCompleted: boolean;       // false hasta completar el flujo de gustos

  // ── Estado y seguridad ─────────────────────────────────────────────────────
  @Prop({ type: String, enum: UserStatusEnum, default: UserStatusEnum.ACTIVE, index: true })
  status: UserStatusEnum;

  @Prop({ default: false })
  isVerified: boolean;                // badge de cuenta verificada, lo da el admin

  @Prop({ type: String, enum: UserRoleEnum, default: UserRoleEnum.USER })
  role: UserRoleEnum;

  @Prop({ type: Number, default: 0 })
  loginAttempts: number;              // contador de intentos fallidos

  @Prop({ type: Date, default: null })
  lockUntil: Date | null;             // cuenta bloqueada hasta esta fecha

  @Prop({ type: Date, default: null })
  lastLogin: Date | null;

  @Prop({ type: String, select: false, default: null })
  resetPasswordToken: string | null;

  @Prop({ type: Date, default: null })
  resetPasswordExpires: Date | null;

  // ── Virtual ────────────────────────────────────────────────────────────────
  isLocked?: boolean;

  // timestamps
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// ─── Virtual: isLocked ────────────────────────────────────────────────────────

UserSchema.virtual('isLocked').get(function (this: UserDocument) {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

// ─── Índices ──────────────────────────────────────────────────────────────────
UserSchema.index({ email: 1, status: 1 });

// Para buscar usuarios por su proveedor OAuth al momento del login
UserSchema.index(
  { 'oauthProviders.provider': 1, 'oauthProviders.providerId': 1 },
);

// Búsqueda de texto sobre username y displayName
UserSchema.index(
  { username: 'text', displayName: 'text' },
  { weights: { username: 2, displayName: 1 } },
);

// Para el algoritmo del feed (usuarios con gustos similares)
UserSchema.index({ 'preferences.cuisineTypes': 1 });
UserSchema.index({ 'preferences.foodCategories': 1 });

// ─── toJSON ───────────────────────────────────────────────────────────────────

UserSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.oauthProviders;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpires;
    delete ret.__v;
    return ret;
  },
});