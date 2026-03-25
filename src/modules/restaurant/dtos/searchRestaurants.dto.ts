import { IsArray, IsEnum, IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { CategoriaComidaEnum, PriceRangeEnum, RestaurantFeatureEnum, SubcategoriaComidaEnum } from '../enum/enum';

export class SearchRestaurantsDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  query?: string;

  @IsOptional()
  @IsEnum(CategoriaComidaEnum)
  category?: CategoriaComidaEnum;

  @IsOptional()
  @IsArray()
  @IsEnum(SubcategoriaComidaEnum, { each: true })
  subCategories?: SubcategoriaComidaEnum[];

  @IsOptional()
  @IsEnum(PriceRangeEnum)
  priceRange?: PriceRangeEnum;

  @IsOptional()
  @IsArray()
  @IsEnum(RestaurantFeatureEnum, { each: true })
  features?: RestaurantFeatureEnum[];   // filtra por $all — deben tener TODAS las features

  @IsOptional()
  @IsMongoId()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number;
}