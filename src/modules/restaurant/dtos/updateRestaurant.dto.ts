// // ─── Actualizar restaurante ────────────────────────────────────────────────────
// import {
//   CategoriaComidaEnum,
//   DressCodeEnum,
//   IdiomaServicioEnum,
//   PaymentOptionsEnum,
//   PriceRangeEnum,
//   RestaurantFeatureEnum,
//   SubcategoriaComidaEnum
// } from '../enum/enum';
// import { IsArray, IsEnum, IsMongoId, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
// import { AboutItemDto, AddressRestaurantDto, AwardDto, ContactDto, ScheduleDayDto } from './createRestaurant.dto';
// import { ReservationOptionsDto } from './reservationOptions.dto';
// import { Type } from 'class-transformer';

// export class UpdateRestaurantDto {
//   @IsMongoId()
//   restaurantId: string;

//   @IsOptional()
//   @IsString()
//   @MaxLength(150)
//   name?: string;

//   @IsOptional()
//   @IsString()
//   @MaxLength(500)
//   description?: string;

//   @IsOptional()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => AboutItemDto)
//   about?: AboutItemDto[];

//   @IsOptional()
//   @ValidateNested()
//   @Type(() => AddressRestaurantDto)
//   address?: AddressRestaurantDto;

//   @IsOptional()
//   @IsEnum(CategoriaComidaEnum)
//   category?: CategoriaComidaEnum;

//   @IsOptional()
//   @IsArray()
//   @IsEnum(SubcategoriaComidaEnum, { each: true })
//   subCategories?: SubcategoriaComidaEnum[];

//   @IsOptional()
//   @IsEnum(PriceRangeEnum)
//   priceRange?: PriceRangeEnum;

//   @IsOptional()
//   @IsEnum(DressCodeEnum)
//   dressCode?: DressCodeEnum;

//   @IsOptional()
//   @IsString()
//   chef?: string;

//   @IsOptional()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => ScheduleDayDto)
//   schedule?: ScheduleDayDto[];

//   @IsOptional()
//   @ValidateNested()
//   @Type(() => ReservationOptionsDto)
//   reservationOptions?: ReservationOptionsDto;

//   @IsOptional()
//   @IsArray()
//   @IsEnum(PaymentOptionsEnum, { each: true })
//   paymentOptions?: PaymentOptionsEnum[];

//   @IsOptional()
//   @IsArray()
//   @IsEnum(IdiomaServicioEnum, { each: true })
//   languagesSpoken?: IdiomaServicioEnum[];

//   @IsOptional()
//   @IsArray()
//   @IsEnum(RestaurantFeatureEnum, { each: true })
//   features?: RestaurantFeatureEnum[];

//   @IsOptional()
//   @ValidateNested()
//   @Type(() => ContactDto)
//   contact?: ContactDto;

//   @IsOptional()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => AwardDto)
//   awards?: AwardDto[];
// }

// ─── Actualizar restaurante ────────────────────────────────────────────────────
import { CreateRestaurantDto } from './createRestaurant.dto';
import { IsMongoId, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRestaurantDto {
  @IsMongoId()
  restaurantId: string;

  @ValidateNested()
  @Type(() => CreateRestaurantDto)
  data: CreateRestaurantDto
}