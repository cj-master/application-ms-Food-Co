// ─── Búsqueda específica por entidad ─────────────────────────────────────────
import { IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class SearchPostsDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  query: string;

  @IsOptional()
  @IsString()
  cuisineType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number;
}
