import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SavedTargetTypeEnum } from '../enum/enum';
import { Document, Types } from 'mongoose';

export type SavedDocument = Saved & Document;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'saved',
})
export class Saved {

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  targetId: Types.ObjectId;     // ID del post o del restaurante

  @Prop({ required: true, enum: Object.values(SavedTargetTypeEnum) })
  targetType: SavedTargetTypeEnum;  // 'post' | 'restaurant'

  createdAt: Date;
}

export const SavedSchema = SchemaFactory.createForClass(Saved);

// ─── Índices ──────────────────────────────────────────────────────────────────

// Evita guardar el mismo item dos veces
SavedSchema.index(
  { userId: 1, targetId: 1, targetType: 1 },
  { unique: true },
);

// Para listar todos los guardados de un usuario, ordenados por más reciente
SavedSchema.index({ userId: 1, targetType: 1, createdAt: -1 });

SavedSchema.set('toJSON', {
  virtuals: true,
  transform: (_: any, ret: Record<string, any>) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});