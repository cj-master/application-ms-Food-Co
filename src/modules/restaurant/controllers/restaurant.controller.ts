import { GetRestaurantDto, GetRestaurantBySlugDto, SearchRestaurantsDto, GetRestaurantsByIdsDto} from '../dtos/dtos';
import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices';
import { RestaurantsService } from '../services/restaurant.service';
import { Controller } from '@nestjs/common';

@Controller()
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) { }

  @MessagePattern('restaurants.findById')
  findById(@Payload() dto: GetRestaurantDto) {
    return this.restaurantsService.findById(dto);
  }

  @MessagePattern('restaurants.findBySlug')
  findBySlug(@Payload() dto: GetRestaurantBySlugDto) {
    return this.restaurantsService.findBySlug(dto);
    // El gateway lo usa cuando alguien visita /restaurantes/pujol-cdmx
  }

  @MessagePattern('restaurants.findByIds')
  findByIds(@Payload() dto: GetRestaurantsByIdsDto) {
    return this.restaurantsService.findByIds(dto);
    // Post Service lo usa para hidratar el restaurante de un post
  }

  @MessagePattern('restaurants.search')
  search(@Payload() dto: SearchRestaurantsDto) {
    return this.restaurantsService.search(dto);
    // Devuelve: { restaurants, nextCursor }
  }

  // ── Eventos de otros servicios ─────────────────────────────────────────────
  // Cuando se publica o elimina un post que tagguea a este restaurante
  @EventPattern('post.created')
  onPostCreated(@Payload() payload: { restaurantId?: string }) {
    if (!payload.restaurantId) return;
    return this.restaurantsService.incrementPostsCount(payload.restaurantId);
  }

  @EventPattern('post.deleted')
  onPostDeleted(@Payload() payload: { restaurantId?: string }) {
    if (!payload.restaurantId) return;
    return this.restaurantsService.decrementPostsCount(payload.restaurantId);
  }

  // Cuando un usuario guarda o quita un restaurante (User Service lo emite)
  @EventPattern('users.restaurant.saved')
  onRestaurantSaved(@Payload() payload: { restaurantId: string }) {
    return this.restaurantsService.incrementSavedCount(payload.restaurantId);
  }

  @EventPattern('users.restaurant.unsaved')
  onRestaurantUnsaved(@Payload() payload: { restaurantId: string }) {
    return this.restaurantsService.decrementSavedCount(payload.restaurantId);
  }
}