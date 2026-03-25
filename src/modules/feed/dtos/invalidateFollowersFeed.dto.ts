// ─── Invalidar feeds de múltiples usuarios (cuando alguien publica) ───────────

import { IsMongoId } from 'class-validator';

export class InvalidateFollowersFeedDto {
  @IsMongoId()
  authorId: string;       // el que publicó — buscamos sus seguidores y los invalidamos
}