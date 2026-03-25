// ────────────────────────────────────────────────────────────────────────────
// REPLACE — igual que request pero con currentKey obligatorio
// ────────────────────────────────────────────────────────────────────────────

import { ArrayMinSize, IsArray, IsString, ValidateNested } from 'class-validator';
import { RequestUploadUrlDto } from './requestUploadUrl.dto';
import { CarouselImageDto } from './carouselImage.dto';
import { Type } from 'class-transformer';

 
export class ReplaceUploadUrlDto extends RequestUploadUrlDto {
  @IsString()
  currentKey: string;   // key del archivo existente a borrar antes de generar la nueva URL
}
 
export class ReplaceCarouselImageDto extends CarouselImageDto {
  @IsString()
  currentKey: string;   // key de la imagen del carrusel a reemplazar
}
 
export class ReplaceMultipleUploadUrlsDto {
  @IsString()
  ownerId: string;
 
  @IsString()
  postId: string;
 
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReplaceCarouselImageDto)
  images: ReplaceCarouselImageDto[];   // cada imagen trae su currentKey
}