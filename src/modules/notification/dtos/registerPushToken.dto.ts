// ─── Push Token ───────────────────────────────────────────────────────────────
import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterPushTokenDto {
  @IsMongoId()
  userId: string;

  @IsString()
  @IsNotEmpty()
  token: string;              // ExponentPushToken[xxxxxx]

  @IsOptional()
  @IsString()
  deviceName?: string;
}

export class RemovePushTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}