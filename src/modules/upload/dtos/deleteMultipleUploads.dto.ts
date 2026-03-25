// ─── Eliminar múltiples imágenes (al borrar un post con carrusel) ─────────────
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsString } from 'class-validator';
import { UploadResourceEnum } from '../enum/enum';

export class DeleteMultipleUploadsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  keys: string[];

  @IsEnum(UploadResourceEnum)
  resource: UploadResourceEnum;     // necesario para saber qué variantes eliminar
}