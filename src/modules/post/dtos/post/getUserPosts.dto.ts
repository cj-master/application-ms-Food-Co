import { IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';

// ─── Posts de un autor (grid de perfil) ───────────────────────────────────────
export class GetUserPostsDto {
  @IsMongoId()
  authorId: string;

  @IsOptional()
  @IsMongoId()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number;
}
