import { SearchRestaurantResult } from './searchRestaurantResult';
import { SearchPostResult } from './searchPostResult';
import { SearchUserResult } from './searchUserResult';

export interface SearchAllResult {
  posts: { items: SearchPostResult[]; nextCursor: string | null };
  users: { items: SearchUserResult[]; nextCursor: string | null };
  restaurants: { items: SearchRestaurantResult[]; nextCursor: string | null };
}