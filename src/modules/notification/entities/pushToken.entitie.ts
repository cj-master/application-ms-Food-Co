import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

// ─── Schema: PushToken ────────────────────────────────────────────────────────
// Guarda el Expo Push Token de cada dispositivo del usuario
export type PushTokenDocument = HydratedDocument<PushToken>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'push_tokens',
})
export class PushToken extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  token: string;              // ExponentPushToken[xxxxxx]

  @Prop({ default: null })
  deviceName: string | null;  // ej: "iPhone 15 Pro"

  @Prop({ default: true })
  active: boolean;            // false si Expo reporta que el token es inválido

  createdAt: Date;
}

export const PushTokenSchema = SchemaFactory.createForClass(PushToken);

PushTokenSchema.index({ userId: 1, active: 1 });

PushTokenSchema.set('toJSON', {
  virtuals: true,
  transform: (_: any, ret: Record<string, any>) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});