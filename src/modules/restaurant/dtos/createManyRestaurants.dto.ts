import { CreateRestaurantDto } from "./createRestaurant.dto";
import { ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class CreateManyRestaurants {
  @ValidateNested({ each: true })
  @Type(() => CreateRestaurantDto)
  data: CreateRestaurantDto[]
}