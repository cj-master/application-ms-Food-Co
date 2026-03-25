import { IsInt, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetFeedDto {
  @IsMongoId()
  userId: string;

  @IsOptional()
  @IsString()
  cursor?: string;        // token de paginación opaco (encripta offset + timestamp)

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number;
}
