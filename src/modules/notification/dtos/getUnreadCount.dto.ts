// ─── Conteo de no leídas ─────────────────────────────────────────────────────
import { IsMongoId } from 'class-validator';
export class GetUnreadCountDto {
  @IsMongoId()
  userId: string;
}