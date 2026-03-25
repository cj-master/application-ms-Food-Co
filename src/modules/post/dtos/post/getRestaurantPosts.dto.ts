// ─── Posts de un restaurante ──────────────────────────────────────────────────
import { IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';

export class GetRestaurantPostsDto {
  @IsMongoId()
  restaurantId: string;

  @IsOptional()
  @IsMongoId()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number;
}