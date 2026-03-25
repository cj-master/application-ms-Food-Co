import { SearchDto, SearchPostsDto, SearchUsersDto, SearchRestaurantsDto, SearchSuggestionsDto, SearchTargetEnum} from './dtos/dtos';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SearchService } from './search.service';
import { Controller } from '@nestjs/common';

@Controller()
export class SearchController {
  constructor(private readonly searchService: SearchService) { }

  // ── Búsqueda global ────────────────────────────────────────────────────────

  @MessagePattern('search.all')
  search(@Payload() dto: SearchDto) {
    // Si viene target específico, redirige al handler correcto
    // Si no viene (o es 'all'), busca en todo en paralelo
    switch (dto.target) {
      case SearchTargetEnum.POSTS:
        return this.searchService.searchPosts(dto);
      case SearchTargetEnum.USERS:
        return this.searchService.searchUsers(dto);
      case SearchTargetEnum.RESTAURANTS:
        return this.searchService.searchRestaurants(dto);
      default:
        return this.searchService.searchAll(dto);
    }
  }

  // ── Búsquedas específicas (para paginación por tab) ───────────────────────

  @MessagePattern('search.posts')
  searchPosts(@Payload() dto: SearchPostsDto) {
    return this.searchService.searchPosts(dto);
    // Devuelve: { items: SearchPostResult[], nextCursor }
  }

  @MessagePattern('search.users')
  searchUsers(@Payload() dto: SearchUsersDto) {
    return this.searchService.searchUsers(dto);
    // Devuelve: { items: SearchUserResult[], nextCursor }
  }

  @MessagePattern('search.restaurants')
  searchRestaurants(@Payload() dto: SearchRestaurantsDto) {
    return this.searchService.searchRestaurants(dto);
    // Devuelve: { items: SearchRestaurantResult[], nextCursor }
  }

  // ── Sugerencias mientras el usuario escribe ────────────────────────────────

  @MessagePattern('search.suggestions')
  getSuggestions(@Payload() dto: SearchSuggestionsDto) {
    return this.searchService.getSuggestions(dto);
    // Devuelve: { posts, users, restaurants, tags }
    // El gateway lo llama con debounce desde la barra de búsqueda
  }
}