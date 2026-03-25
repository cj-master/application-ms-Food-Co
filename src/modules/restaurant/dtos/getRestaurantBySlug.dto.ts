import { IsNotEmpty, IsString } from 'class-validator';

export class GetRestaurantBySlugDto {
  @IsString()
  @IsNotEmpty()
  slug: string;
}