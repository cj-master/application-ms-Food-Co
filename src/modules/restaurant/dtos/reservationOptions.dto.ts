import { IsBoolean, IsEmail, IsOptional, IsString, IsUrl } from 'class-validator';

export class ReservationOptionsDto {
  @IsBoolean()
  available: boolean;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}