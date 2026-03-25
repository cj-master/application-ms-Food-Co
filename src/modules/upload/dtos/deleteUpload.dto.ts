// ─── Eliminar una imagen de R2 ────────────────────────────────────────────────
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { UploadResourceEnum } from '../enum/upload_config.enum';

export class DeleteUploadDto {
  @IsString()
  @IsNotEmpty()
  key: string;                      // key en R2, ej: 'avatars/userId/uuid.jpg'

  @IsEnum(UploadResourceEnum)
  resource: UploadResourceEnum;

  @IsString()
  entityId: string;  // 👈 para saber qué registro actualizar en Mongo
}