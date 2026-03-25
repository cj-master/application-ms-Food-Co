import { IsArray, IsMongoId } from 'class-validator';

export class GetRestaurantsByIdsDto {
  @IsArray()
  @IsMongoId({ each: true })
  restaurantIds: string[];
}