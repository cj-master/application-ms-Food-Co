// ─── Invalidar cache de un usuario ────────────────────────────────────────────
import { IsMongoId } from 'class-validator';

export class InvalidateFeedDto {
  @IsMongoId()
  userId: string;
}