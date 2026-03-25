import { GetFeedDto, GetExploreFeedDto, InvalidateFeedDto, InvalidateFollowersFeedDto } from './dtos/dtos';
import { FeedPost, FeedResult, PostScore } from './interfaces/interfaces';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Redis } from 'ioredis';
import { NATS_SERVICE } from 'src/config';

const FEED_CACHE_TTL = 60 * 10;   // 10 minutos
const EXPLORE_CACHE_TTL = 60 * 5;    // 5 minutos
const FEED_MAX_SIZE = 200;        // máximo de posts guardados en Redis por usuario
const RECENCY_WINDOW_MS = 1000 * 60 * 60 * 48;  // 48 horas — posts más allá no entran al feed

// Pesos del algoritmo
const WEIGHT = {
  FOLLOW: 1.0,    // post de alguien que sigo
  PREFERENCE: 0.6,  // post cuyo cuisineType/tags coinciden con mis gustos
  LIKE: 0.01,  // +0.01 por cada like (popularidad)
  RECENCY: 0.3,   // bonus por ser reciente (decae con el tiempo)
};

// ─── Service ──────────────────────────────────────────────────────────────────
@Injectable()
export class FeedService {
  constructor(
    @InjectRedis()
    private readonly redis: Redis,

    // Clientes NATS para consultar otros servicios
    @Inject(NATS_SERVICE) private readonly client: ClientProxy
  ) { }

  async getFeed(dto: GetFeedDto): Promise<FeedResult> {
    const { userId, limit = 15 } = dto;
    const cacheKey = `feed:${userId}`;

    let postIds = await this.redis.lrange(cacheKey, 0, FEED_MAX_SIZE - 1);

    if (!postIds.length) {
      postIds = await this.buildFeed(userId);
    }

    const { page, nextCursor } = this.paginateIds(postIds, dto.cursor, limit);
    if (!page.length) return { posts: [], nextCursor: null };

    const posts = await this.hydratePosts(page);
    return { posts, nextCursor };
  }

  // ── Feed de Explorar ───────────────────────────────────────────────────────
  async getExploreFeed(dto: GetExploreFeedDto): Promise<FeedResult> {
    const { userId, limit = 20, category } = dto;
    const cacheKey = category ? `explore:${category}` : `explore:global`;

    let postIds = await this.redis.lrange(cacheKey, 0, FEED_MAX_SIZE - 1);

    if (!postIds.length) {
      postIds = await this.buildExploreFeed(category);
      if (postIds.length) {
        await this.redis.del(cacheKey);
        await this.redis.rpush(cacheKey, ...postIds);
        await this.redis.expire(cacheKey, EXPLORE_CACHE_TTL);
      }
    }

    const seen = await this.getSeenPostIds(userId);
    const unseen = postIds.filter((id) => !seen.has(id));

    const { page, nextCursor } = this.paginateIds(unseen, dto.cursor, limit);
    if (!page.length) return { posts: [], nextCursor: null };

    const posts = await this.hydratePosts(page);
    return { posts, nextCursor };
  }

  // ── Invalidación ───────────────────────────────────────────────────────────
  async invalidateFeed(dto: InvalidateFeedDto): Promise<void> {
    await this.redis.del(`feed:${dto.userId}`);
  }

  async invalidateFollowersFeed(dto: InvalidateFollowersFeedDto): Promise<void> {
    const res = await firstValueFrom(
      this.client.send('users.followers.list', { userId: dto.authorId, limit: 500 }),
    );

    const followerIds: string[] = (res.users ?? []).map((u: any) => u.id ?? u._id);
    if (!followerIds.length) return;

    const BATCH = 100;
    for (let i = 0; i < followerIds.length; i += BATCH) {
      const keys = followerIds.slice(i, i + BATCH).map((id) => `feed:${id}`);
      await this.redis.del(...keys);
    }
  }

  // ─── Construcción del feed ─────────────────────────────────────────────────
  private async buildFeed(userId: string): Promise<string[]> {
    // Traer follows y preferencias en paralelo via NATS
    const [followingRes, preferences] = await Promise.all([
      firstValueFrom(
        this.client.send('users.following.list', { userId, limit: 500 }),
      ).catch(() => ({ users: [] })),
      firstValueFrom(
        this.client.send('preferences.get', { userId }),
      ).catch(() => ({})),
    ]);

    const followingIds = (followingRes.users ?? []).map((u: any) => u.id ?? u._id);
    const followingSet = new Set<string>(followingIds);
    const prefCuisines = new Set<string>(preferences.cuisineTypes ?? []);
    const prefFoods = new Set<string>(preferences.foodCategories ?? []);

    // Candidatos A — posts de personas que sigo
    const followedPosts = followingIds.length
      ? await this.fetchPostsByAuthors(followingIds)
      : [];

    // Candidatos B — posts que coinciden con preferencias
    const prefTags = [...(preferences.cuisineTypes ?? []), ...(preferences.foodCategories ?? [])];
    const prefPosts = prefTags.length
      ? await this.fetchPostsByPreferences(prefTags)
      : [];

    // Candidatos C — populares recientes (fallback)
    const popularPosts = await this.fetchPopularPosts();

    // Deduplicar
    const seen = new Set<string>();
    const candidates: any[] = [];

    for (const post of [...followedPosts, ...prefPosts, ...popularPosts]) {
      if (!seen.has(post.postId)) {
        seen.add(post.postId);
        candidates.push(post);
      }
    }

    // Rankear
    const scored: PostScore[] = candidates.map((post) => ({
      postId: post.postId,
      score: this.scorePost(post, followingSet, prefCuisines, prefFoods),
    }));

    scored.sort((a, b) => b.score - a.score);

    const sortedIds = scored.slice(0, FEED_MAX_SIZE).map((s) => s.postId);

    // Guardar en Redis
    if (sortedIds.length) {
      const cacheKey = `feed:${userId}`;
      await this.redis.del(cacheKey);
      await this.redis.rpush(cacheKey, ...sortedIds);
      await this.redis.expire(cacheKey, FEED_CACHE_TTL);
    }

    return sortedIds;
  }

  private async buildExploreFeed(category?: string): Promise<string[]> {
    const posts = await this.fetchPopularPosts(category);
    return posts.map((p) => p.postId);
  }

  // ─── Algoritmo de scoring ──────────────────────────────────────────────────
  private scorePost(post: any, followingSet: Set<string>, prefCuisines: Set<string>, prefFoods: Set<string>): number {
    let score = 0;

    if (followingSet.has(post.authorId)) score += WEIGHT.FOLLOW;
    if (post.cuisineType && prefCuisines.has(post.cuisineType)) score += WEIGHT.PREFERENCE;
    if ((post.tags ?? []).some((t: string) => prefFoods.has(t))) score += WEIGHT.PREFERENCE * 0.5;

    score += (post.likesCount ?? 0) * WEIGHT.LIKE;

    const ageMs = Date.now() - new Date(post.createdAt).getTime();
    const ageFactor = Math.max(0, 1 - ageMs / RECENCY_WINDOW_MS);
    score += ageFactor * WEIGHT.RECENCY;

    return score;
  }

  // ─── Consultas via NATS ───────────────────────────────────────────────────
  private async fetchPostsByAuthors(authorIds: string[]): Promise<any[]> {
    const results = await Promise.all(
      authorIds.map((authorId) =>
        firstValueFrom(
          this.client.send('posts.user.list', { authorId, limit: 10 }),
        ).catch(() => ({ posts: [] })),
      ),
    );
    return results.flatMap((r) => this.normalizePosts(r.posts ?? []));
  }

  private async fetchPostsByPreferences(tags: string[]): Promise<any[]> {
    const res = await firstValueFrom(
      this.client.send('posts.search', { query: tags.join(' '), limit: 50 }),
    ).catch(() => ({ posts: [] }));
    return this.normalizePosts(res.posts ?? []);
  }

  private async fetchPopularPosts(category?: string): Promise<any[]> {
    const res = await firstValueFrom(this.client.send('posts.search', { query: category ?? '', cuisineType: category, limit: 50 })).catch(() => ({ posts: [] }));
    return this.normalizePosts(res.posts ?? []);
  }

  private async hydratePosts(postIds: string[]): Promise<FeedPost[]> {
    const res = await firstValueFrom(
      this.client.send('posts.findByIds', { postIds }),
    ).catch(() => []);

    const map = new Map((res ?? []).map((p: any) => [p.id ?? p._id, p]));

    return postIds
      .map((id) => {
        const post = map.get(id) as any;
        if (!post) return null;
        return {
          postId: post.id ?? post._id,
          authorId: post.authorId,
          imageUrl: post.images?.[0]?.url ?? null,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          cuisineType: post.cuisineType ?? null,
          tags: post.tags ?? [],
          createdAt: post.createdAt,
        };
      })
      .filter(Boolean) as FeedPost[];
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private normalizePosts(posts: any[]): any[] {
    return posts.map((p) => ({
      postId: p.id ?? p._id,
      authorId: p.authorId,
      cuisineType: p.cuisineType ?? null,
      tags: p.tags ?? [],
      likesCount: p.likesCount ?? 0,
      createdAt: p.createdAt,
    }));
  }

  private paginateIds(ids: string[], cursor: string | undefined, limit: number): { page: string[]; nextCursor: string | null } {
    let startIndex = 0;

    if (cursor) {
      const decoded = parseInt(Buffer.from(cursor, 'base64').toString(), 10);
      startIndex = isNaN(decoded) ? 0 : decoded;
    }

    const page = ids.slice(startIndex, startIndex + limit);
    const nextIdx = startIndex + limit;
    const nextCursor = nextIdx < ids.length
      ? Buffer.from(String(nextIdx)).toString('base64')
      : null;

    return { page, nextCursor };
  }

  private async getSeenPostIds(userId: string): Promise<Set<string>> {
    const ids = await this.redis.lrange(`feed:${userId}`, 0, -1);
    return new Set(ids);
  }
}