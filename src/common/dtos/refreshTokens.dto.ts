import { IsObject, IsString } from 'class-validator'
import { DeviceInfoDto } from './deviceInfo.dto'
import { Type } from 'class-transformer'

export class RefreshTokensDto {
  @IsString()
  refreshToken: string

  @IsObject()
  @Type(() => DeviceInfoDto)
  deviceInfo: DeviceInfoDto
}