import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FollowDocument = Follow & Document;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },  // solo necesitamos cuándo se siguió
  collection: 'follows',
})
export class Follow {

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  followerId: Types.ObjectId;   // quien sigue

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  followingId: Types.ObjectId;  // a quien sigue

  createdAt: Date;
}

export const FollowSchema = SchemaFactory.createForClass(Follow);

// ─── Índices ──────────────────────────────────────────────────────────────────

// Índice compuesto único: un usuario no puede seguir dos veces a la misma persona
FollowSchema.index(
  { followerId: 1, followingId: 1 },
  { unique: true },
);

// Para consultar "quién sigue a X" (lista de seguidores de un perfil)
FollowSchema.index({ followingId: 1, createdAt: -1 });

// Para consultar "a quién sigue X" (lista de seguidos de un perfil)
FollowSchema.index({ followerId: 1, createdAt: -1 });

FollowSchema.set('toJSON', {
  virtuals: true,
  transform: (_: any, ret: Record<string, any>) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});