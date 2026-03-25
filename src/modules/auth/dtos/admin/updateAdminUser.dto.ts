import {
  IsEmail,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsArray,
  ValidateNested,
  IsMongoId,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { UserStatusEnum } from '../../enum/userStatus.enum';

export class SocialLinksDto {
  @IsOptional()
  @IsString()
  website?: string | null;

  @IsOptional()
  @IsString()
  instagram?: string | null;

  @IsOptional()
  @IsString()
  tiktok?: string | null;
}

export class PreferencesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  foodCategories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  foodSubCategories?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  priceRange?: string[]
}

export class UpdateAdminUserDto {
  @IsMongoId()
  id: string

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9._]+$/, { message: 'username solo permite letras minúsculas, números, puntos y guiones bajos' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }) => value?.trim())
  displayName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El email no es válido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(64)
  password?: string;

  @IsOptional()
  @IsEnum(UserStatusEnum, { message: `status debe ser uno de: ${Object.values(UserStatusEnum).join(', ')}` })
  status?: UserStatusEnum;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsBoolean()
  onboardingCompleted?: boolean;

  @IsOptional()
  @IsString()
  avatarUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PreferencesDto)
  preferences?: PreferencesDto;
}