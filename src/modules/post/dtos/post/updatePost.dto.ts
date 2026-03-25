// ─── Editar post (solo campos de texto) ───────────────────────────────────────
import { ArrayMaxSize, IsArray, IsMongoId, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { PostLocationDto } from './postLocation.dto';
import { Type } from 'class-transformer';

export class UpdatePostDto {
  @IsMongoId()
  authorId: string;

  @IsMongoId()
  postId: string;

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
  restaurantId?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => PostLocationDto)
  location?: PostLocationDto | null;
}