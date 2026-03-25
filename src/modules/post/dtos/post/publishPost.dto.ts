import { ArrayMaxSize, IsArray, IsMongoId, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { PostLocationDto } from './PostLocation.dto';
import { Type } from 'class-transformer';

// ─── Confirmar upload y publicar (paso 2) ─────────────────────────────────────
export class PublishPostDto {
  @IsMongoId()
  authorId: string;

  @IsMongoId()
  postId: string;                 // el draft que se creó en el paso 1

  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  dishName?: string;

  @IsOptional()
  @IsString()
  cuisineType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  ingredients?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  tags?: string[];

  @IsOptional()
  @IsMongoId()
  restaurantId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PostLocationDto)
  location?: PostLocationDto;
}