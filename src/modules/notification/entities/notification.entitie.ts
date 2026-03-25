import { NotificationStatusEnum, NotificationTypeEnum } from '../enum/enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

// ─── Schema: Notification ─────────────────────────────────────────────────────
export type NotificationDocument = HydratedDocument<Notification>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'notifications',
})
export class Notification extends Document {

  // ── Destinatario ───────────────────────────────────────────────────────────
  @Prop({ type: Types.ObjectId, required: true, index: true })
  recipientId: Types.ObjectId;    // usuario que recibe la notificación

  // ── Quien la genera ────────────────────────────────────────────────────────
  @Prop({ type: Types.ObjectId, required: true })
  actorId: Types.ObjectId;        // usuario que hizo la acción
  // Guardamos solo el ID — el nombre y avatar se leen del User Service al hidratar

  // ── Tipo y contexto ────────────────────────────────────────────────────────
  @Prop({ required: true, enum: NotificationTypeEnum, index: true })
  type: NotificationTypeEnum;

  @Prop({ type: Types.ObjectId, default: null })
  postId: Types.ObjectId | null;      // post relacionado (like, comment, mention)

  @Prop({ type: Types.ObjectId, default: null })
  commentId: Types.ObjectId | null;   // comentario relacionado (reply, mention)

  // ── Estado ────────────────────────────────────────────────────────────────
  @Prop({
    type: String,
    enum: NotificationStatusEnum,
    default: NotificationStatusEnum.UNREAD,
    index: true,
  })
  status: NotificationStatusEnum;

  createdAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Notificaciones de un usuario, ordenadas por más reciente
NotificationSchema.index({ recipientId: 1, status: 1, createdAt: -1 });

// TTL — eliminar notificaciones de más de 90 días automáticamente
NotificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 90 },
);

NotificationSchema.set('toJSON', {
  virtuals: true,
  transform: (_: any, ret: Record<string, any>) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});