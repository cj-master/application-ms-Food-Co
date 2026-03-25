import { IsEmail, IsObject, IsString } from 'class-validator'
import { DeviceInfoDto } from 'src/common'
import { Type } from 'class-transformer'

export class LoginAdminDto {
  @IsEmail()
  email: string

  @IsString()
  password: string

  @IsObject()
  @Type(() => DeviceInfoDto)
  deviceInfo: DeviceInfoDto
}