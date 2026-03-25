// ─── Crear notificación (lo llaman otros servicios via NATS) ──────────────────
import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { NotificationTypeEnum } from '../enum/enum';

export class CreateNotificationDto {
  @IsMongoId()
  recipientId: string;

  @IsMongoId()
  actorId: string;

  @IsEnum(NotificationTypeEnum)
  type: NotificationTypeEnum;

  @IsOptional()
  @IsMongoId()
  postId?: string;

  @IsOptional()
  @IsMongoId()
  commentId?: string;
}