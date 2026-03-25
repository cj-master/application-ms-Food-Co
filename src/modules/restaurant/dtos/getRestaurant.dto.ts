import { IsMongoId } from 'class-validator';

export class GetRestaurantDto {
  @IsMongoId()
  restaurantId: string;
}