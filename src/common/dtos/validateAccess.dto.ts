import { IsJWT, IsString } from 'class-validator';

export class ValidateAccessDto {
  @IsString()
  @IsJWT()
  token: string
}