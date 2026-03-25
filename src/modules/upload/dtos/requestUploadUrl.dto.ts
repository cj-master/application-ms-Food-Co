import { IsEnum, IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';
import { ALLOWED_IMAGE_TYPES, AllowedMimeType } from 'src/common/index';
import { UploadResourceEnum } from '../enum/enum';

export class RequestUploadUrlDto {
  @IsMongoId()
  ownerId: string;                  // userId o restaurantId según el contexto

  @IsEnum(UploadResourceEnum)
  resource: UploadResourceEnum;

  @IsEnum(Object.keys(ALLOWED_IMAGE_TYPES))
  mimeType: AllowedMimeType;   // 👈 nuevo campo

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4)
  order?: number;                   // solo POST_IMAGE — índice en el carrusel

  @IsOptional()
  @IsMongoId()
  postId?: string;                  // solo POST_IMAGE — draft al que pertenece

  @IsOptional()
  @IsMongoId()
  restaurantId?: string;            // solo RESTAURANT_* — id del restaurante
}