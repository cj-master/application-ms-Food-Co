import { SearchDto, SearchPostsDto, SearchUsersDto, SearchRestaurantsDto, SearchSuggestionsDto } from './dtos/dtos';
import { SearchAllResult, SearchPostResult, SearchRestaurantResult, SearchUserResult } from './interfaces/interfaces';
import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Paginated } from 'src/interface/interface';
import { NATS_SERVICE } from 'src/config';
import { firstValueFrom } from 'rxjs';

// ─── Service ──────────────────────────────────────────────────────────────────
@Injectable()
export class SearchService {
  constructor(
    // Clientes NATS para consultar otros servicios
    @Inject(NATS_SERVICE) private readonly client: ClientProxy
  ) { }

  // ── Búsqueda global (posts + users + restaurantes en paralelo) ────────────
  async searchAll(dto: SearchDto): Promise<SearchAllResult> {
    const limit = dto.limit ?? 5;   // 5 de cada tipo en la vista global

    const [postsRes, usersRes, restaurantsRes] = await Promise.all([
      this.searchPosts({ query: dto.query, limit }),
      this.searchUsers({ query: dto.query, limit }),
      this.searchRestaurants({ query: dto.query, limit }),
    ]);

    return {
      posts: postsRes,
      users: usersRes,
      restaurants: restaurantsRes,
    };
  }

  // ── Búsqueda de posts ─────────────────────────────────────────────────────
  async searchPosts(dto: SearchPostsDto): Promise<Paginated<SearchPostResult>> {
    const res = await firstValueFrom(
      this.client.send('posts.search', {
        query: dto.query,
        cuisineType: dto.cuisineType,
        tags: dto.tags,
        cursor: dto.cursor,
        limit: dto.limit ?? 20,
      }),
    ).catch(() => ({ posts: [], nextCursor: null }));

    return {
      items: (res.posts ?? []).map((p: any) => ({
        postId: p.id ?? p._id,
        authorId: p.authorId,
        imageUrl: p.images?.[0]?.url ?? null,
        dishName: p.dishName ?? null,
        cuisineType: p.cuisineType ?? null,
        tags: p.tags ?? [],
        likesCount: p.likesCount ?? 0,
      })),
      nextCursor: res.nextCursor ?? null,
    };
  }

  // ── Búsqueda de usuarios ──────────────────────────────────────────────────
  async searchUsers(dto: SearchUsersDto): Promise<Paginated<SearchUserResult>> {
    const res = await firstValueFrom(
      this.client.send('users.search', {
        query: dto.query,
        cursor: dto.cursor,
        limit: dto.limit ?? 20,
      }),
    ).catch(() => ({ users: [], nextCursor: null }));

    return {
      items: (res.users ?? []).map((u: any) => ({
        userId: u.id ?? u._id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl ?? null,
        followersCount: u.followersCount ?? 0,
        isVerified: u.isVerified ?? false,
      })),
      nextCursor: res.nextCursor ?? null,
    };
  }

  // ── Búsqueda de restaurantes ───────────────────────────────────────────────
  async searchRestaurants(dto: SearchRestaurantsDto): Promise<Paginated<SearchRestaurantResult>> {
    const res = await firstValueFrom(
      this.client.send('restaurants.search', {
        query: dto.query,
        category: dto.category,
        cursor: dto.cursor,
        limit: dto.limit ?? 20,
      }),
    ).catch(() => ({ restaurants: [], nextCursor: null }));

    return {
      items: (res.restaurants ?? []).map((r: any) => ({
        restaurantId: r.id ?? r._id,
        name: r.name,
        slug: r.slug,
        logoUrl: r.logoUrl ?? null,
        category: r.category,
        city: r.address?.city ?? null,
        priceRange: r.priceRange ?? null,
      })),
      nextCursor: res.nextCursor ?? null,
    };
  }

  // ── Sugerencias / autocompletado ──────────────────────────────────────────
  // Devuelve resultados rápidos mientras el usuario escribe
  // Busca en paralelo con límite bajo (3-4 por tipo)
  async getSuggestions(dto: SearchSuggestionsDto): Promise<{
    posts: SearchPostResult[];
    users: SearchUserResult[];
    restaurants: SearchRestaurantResult[];
    tags: string[];
  }> {
    const [postsRes, usersRes, restaurantsRes] = await Promise.all([
      this.searchPosts({ query: dto.query, limit: 3 }),
      this.searchUsers({ query: dto.query, limit: 3 }),
      this.searchRestaurants({ query: dto.query, limit: 3 }),
    ]);

    // Tags sugeridos — extraídos de los posts encontrados
    // Evita un endpoint extra al Post Service
    const tagSet = new Set<string>();
    postsRes.items.forEach((p) =>
      p.tags.forEach((t) => {
        if (t.toLowerCase().includes(dto.query.toLowerCase())) tagSet.add(t);
      }),
    );

    return {
      posts: postsRes.items,
      users: usersRes.items,
      restaurants: restaurantsRes.items,
      tags: Array.from(tagSet).slice(0, 5),
    };
  }
}