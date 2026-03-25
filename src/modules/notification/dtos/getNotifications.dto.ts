// ─── Leer notificaciones ──────────────────────────────────────────────────────
import { IsInt, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetNotificationsDto {
  @IsMongoId()
  userId: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number;
}