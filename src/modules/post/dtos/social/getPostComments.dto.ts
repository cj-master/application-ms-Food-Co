import { IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';

export class GetPostCommentsDto {
  @IsMongoId()
  postId: string;

  @IsOptional()
  @IsMongoId()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number;
}