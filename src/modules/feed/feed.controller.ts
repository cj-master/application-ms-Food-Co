import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices';
import { GetFeedDto, GetExploreFeedDto, InvalidateFeedDto } from './dtos/dtos';
import { FeedService } from './feed.service';
import { Controller } from '@nestjs/common';

@Controller()
export class FeedController {
  constructor(private readonly feedService: FeedService) { }

  // ── Feeds ──────────────────────────────────────────────────────────────────

  // Devuelve: { posts: FeedPost[], nextCursor }
  @MessagePattern('feed.get')

  getFeed(@Payload() dto: GetFeedDto) {

    return this.feedService.getFeed(dto);
  }

  // Descubrir contenido nuevo fuera de los follows del usuario
  @MessagePattern('feed.explore')
  getExploreFeed(@Payload() dto: GetExploreFeedDto) {

    return this.feedService.getExploreFeed(dto);
  }

  // ── Invalidación manual (desde el gateway si se necesita) ─────────────────
  @MessagePattern('feed.invalidate')
  invalidateFeed(@Payload() dto: InvalidateFeedDto) {

    return this.feedService.invalidateFeed(dto);
  }

  // ── Eventos que disparan reconstrucción del feed ───────────────────────────

  // Cuando alguien publica → invalidar feed de sus seguidores (push)
  @EventPattern('post.created')
  onPostCreated(@Payload() payload: { authorId: string }) {

    return this.feedService.invalidateFollowersFeed({ authorId: payload.authorId });
  }

  // Cuando alguien elimina un post → invalidar feed de sus seguidores
  @EventPattern('post.deleted')
  onPostDeleted(@Payload() payload: { authorId: string }) {

    return this.feedService.invalidateFollowersFeed({ authorId: payload.authorId });
  }

  // Cuando el usuario sigue a alguien → su feed cambia, invalidar
  @EventPattern('user.followed')
  onUserFollowed(@Payload() payload: { followerId: string }) {

    return this.feedService.invalidateFeed({ userId: payload.followerId });
  }

  // Cuando deja de seguir → su feed también cambia
  @EventPattern('user.unfollowed')
  onUserUnfollowed(@Payload() payload: { followerId: string }) {

    return this.feedService.invalidateFeed({ userId: payload.followerId });
  }

  // Cuando actualiza sus preferencias de comida → feed cambia
  @EventPattern('user.preferences.updated')
  onPreferencesUpdated(@Payload() payload: { userId: string }) {

    return this.feedService.invalidateFeed({ userId: payload.userId });
  }
}