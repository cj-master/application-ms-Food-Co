import { RestaurantDocument } from '../entities/entities';

export interface PaginatedRestaurants {
  restaurants: RestaurantDocument[];
  nextCursor: string | null;
}
