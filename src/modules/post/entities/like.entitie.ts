import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

export type LikeDocument = HydratedDocument<Like>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'likes',
})
export class Like extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  postId: Types.ObjectId;
}

export const LikeSchema = SchemaFactory.createForClass(Like);

// ─── Índices ──────────────────────────────────────────────────────────────────
// Evita que un usuario dé like dos veces al mismo post
LikeSchema.index({ userId: 1, postId: 1 }, { unique: true });

// Para saber si el usuario actual dio like a un post (check rápido)
LikeSchema.index({ postId: 1, userId: 1 });

LikeSchema.set('toJSON', {
  virtuals: true,
  transform: (_: any, ret: Record<string, any>) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});