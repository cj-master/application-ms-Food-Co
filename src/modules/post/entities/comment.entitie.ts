import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';
import { CommentStatusEnum } from '../enum/enum';

export type CommentDocument = HydratedDocument<Comments>;

@Schema({
  timestamps: true,
  collection: 'comments',
})
export class Comments extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  postId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  authorId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 300 })
  text: string;

  // ── Respuestas ─────────────────────────────────────────────────────────────
  // null = comentario raíz / ObjectId = es una respuesta a ese comentario

  @Prop({ type: Types.ObjectId, default: null, index: true })
  parentId: Types.ObjectId | null;    // ID del comentario al que responde

  @Prop({ type: Types.ObjectId, default: null })
  mentionedUserId: Types.ObjectId | null;  // usuario mencionado en la respuesta

  @Prop({ default: 0, min: 0 })
  repliesCount: number;               // denormalizado para no contar en cada request

  // ── Estado ─────────────────────────────────────────────────────────────────
  @Prop({ type: String, enum: CommentStatusEnum, default: CommentStatusEnum.ACTIVE, index: true })
  status: CommentStatusEnum;
}

export const CommentsSchema = SchemaFactory.createForClass(Comments);

// ─── Índices ──────────────────────────────────────────────────────────────────
// Comentarios raíz de un post, ordenados por más reciente
CommentsSchema.index({ postId: 1, parentId: 1, status: 1, createdAt: -1 });

// Respuestas a un comentario
CommentsSchema.index({ parentId: 1, status: 1, createdAt: 1 });

CommentsSchema.set('toJSON', {
  virtuals: true,
  transform: (_: any, ret: Record<string, any>) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});