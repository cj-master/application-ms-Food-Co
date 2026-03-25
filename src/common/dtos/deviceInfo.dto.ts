import { IsString } from 'class-validator';

export class DeviceInfoDto {
  @IsString()
  ipAddress: string;

  @IsString()
  userAgent?: string;
}