import { IsMongoId, IsString } from 'class-validator';

export class AdminIdDto {
  @IsString()
  @IsMongoId()
  adminId: string
}