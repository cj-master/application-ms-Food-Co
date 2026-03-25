import { ArrayMaxSize, ArrayMinSize, IsArray, IsMongoId, ValidateNested } from 'class-validator';
import { CarouselImageDto } from './carouselImage.dto';
import { Type } from 'class-transformer';

// ─── Solicitar múltiples presigned URLs (carrusel de posts) ───────────────────
export class RequestMultipleUploadUrlsDto {
  @IsMongoId()
  ownerId: string;                  // userId del autor

  @IsMongoId()
  postId: string;                   // draft al que pertenecen las imágenes

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => CarouselImageDto)
  images: CarouselImageDto[];       // metadata de cada imagen antes de subir
}