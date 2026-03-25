import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserStatusEnum } from '../../enum/userStatus.enum';

export class CreateAdminUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9._]+$/, { message: 'username solo permite letras minúsculas, números, puntos y guiones bajos' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  username: string;

  @IsString()
  @MaxLength(80)
  @Transform(({ value }) => value?.trim())
  displayName: string;

  @IsEmail({}, { message: 'El email no es válido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(64)
  password?: string;

  @IsOptional()
  @IsEnum(UserStatusEnum, { message: `role debe ser uno de: ${Object.values(UserStatusEnum).join(', ')}` })
  status?: UserStatusEnum;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;
}