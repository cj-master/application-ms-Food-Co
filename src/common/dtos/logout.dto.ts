import { IsString, IsUUID } from 'class-validator';

export class LogOutDto {
  @IsString()
  @IsUUID()
  jti: string
}