import { IsEnum, IsInt, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';
import { CategoriaComidaEnum } from 'src/modules/restaurant/enum/categoriaComida.enum';

export class GetExploreFeedDto {
  @IsMongoId()
  userId: string;

  @IsOptional()
  @IsEnum(CategoriaComidaEnum)
  category?: CategoriaComidaEnum;   // filtrar explorar por categoría

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number;
}