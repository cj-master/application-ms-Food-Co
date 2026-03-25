// ─── Marcar como leídas ───────────────────────────────────────────────────────
import { IsArray, IsMongoId, IsOptional } from 'class-validator';

export class MarkAsReadDto {
  @IsMongoId()
  userId: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  notificationIds?: string[];  // si no viene → marca todas como leídas
}