// ─── Crear restaurante (solo admin) ───────────────────────────────────────────
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CategoriaComidaEnum,
  DressCodeEnum,
  IdiomaServicioEnum,
  MenuTypeEnum,
  PaymentOptionsEnum,
  PriceRangeEnum,
  RestaurantAwardEnum,
  RestaurantFeatureEnum,
  RestaurantStatusEnum,
  SubcategoriaComidaEnum
} from '../enum/enum';


export class AboutItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(600)
  description: string;
}

export class AwardDto {
  @IsOptional()
  @IsEnum(RestaurantAwardEnum)
  name?: RestaurantAwardEnum;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsString()
  organization?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsString()
  iconUrl?: string;
}

export class AddressRestaurantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  zipCode?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;
}

export class ScheduleDayDto {
  @IsString()
  @IsEnum(['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'])
  day: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Formato HH:mm requerido' })
  open: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Formato HH:mm requerido' })
  close: string;

  @IsOptional()
  @IsBoolean()
  closed?: boolean;
}

export class MenuItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class MenuSectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuItemDto)
  items: MenuItemDto[];
}

export class MenuEdit {
  @IsOptional()
  @IsEnum(MenuTypeEnum)
  type: MenuTypeEnum;        // 'link' | 'structured'

  @IsOptional()
  @IsString()
  url?: string;           // https://restaurante.com/menu o link a PDF en R2

  @IsOptional()
  @IsArray()
  sections?: MenuSectionDto[];
}

export class ContactDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;
}

export class CreateRestaurantDto {
  // ── Identidad ──────────────────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsArray()
  @ValidateNested()
  @Type(() => AboutItemDto)
  about?: AboutItemDto[];           // secciones "Nuestra historia", "El chef", etc.

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description: string;

  // ── Clasificación ──────────────────────────────────────────────────────────
  @IsEnum(CategoriaComidaEnum)
  category: CategoriaComidaEnum;

  @IsArray()
  @IsNotEmpty()
  subCategories: SubcategoriaComidaEnum[];

  @IsOptional()
  @IsEnum(PriceRangeEnum)
  priceRange?: PriceRangeEnum;   // 1=$  2=$$  3=$$$  4=$$$$

  @IsOptional()
  @IsEnum(DressCodeEnum)
  dressCode?: DressCodeEnum;

  @ValidateNested()
  @Type(() => AddressRestaurantDto)
  address: AddressRestaurantDto;

  // ── Equipo ─────────────────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(150)
  chef?: string;

  // ── Información práctica ───────────────────────────────────────────────────
  @IsOptional()
  @IsArray()
  schedule?: ScheduleDayDto[];

  @IsOptional()
  @IsArray()
  paymentOptions?: PaymentOptionsEnum[];

  @IsOptional()
  @IsArray()
  languagesSpoken?: IdiomaServicioEnum[];

  @IsOptional()
  @IsArray()
  features?: RestaurantFeatureEnum[];

  // ── Menú ───────────────────────────────────────────────────────────────────
  @IsOptional()
  @IsBoolean()
  hasMenu?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressRestaurantDto)
  menu: MenuEdit;

  // ── Contacto y redes ───────────────────────────────────────────────────────
  @IsOptional()
  @ValidateNested()
  @Type(() => ContactDto)
  contact?: ContactDto;

  // ── Premios ────────────────────────────────────────────────────────────────
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AwardDto)
  awards?: AwardDto[];

  // ── Estado ─────────────────────────────────────────────────────────────────
  @IsOptional()
  @IsEnum(RestaurantStatusEnum)
  status?: RestaurantStatusEnum;
}
