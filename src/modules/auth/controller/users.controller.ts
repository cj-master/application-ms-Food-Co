import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices';
import { UsersService } from '../services/services';
import { Controller } from '@nestjs/common';
import { SavedTargetTypeEnum } from '../enum/savedTargetType.enum';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // ── Perfil ─────────────────────────────────────────────────────────────────
  @MessagePattern('users.findById')
  findById(@Payload() payload: { userId: string }) {

    return this.usersService.findById(payload.userId);
  }

  @MessagePattern('users.findByUsername')
  findByUsername(@Payload() payload: { username: string }) {
    // Gateway lo usa cuando alguien visita /@username
    return this.usersService.findByUsername(payload.username);
  }

  @MessagePattern('users.profile.update')
  updateProfile(
    @Payload()
    payload: {
      userId: string;
      displayName?: string;
      bio?: string;
      avatarUrl?: string;
      socialLinks?: {
        website?: string | null;
        instagram?: string | null;
        tiktok?: string | null;
      };
    },
  ) {
    const { userId, ...data } = payload;
    return this.usersService.updateProfile(userId, data);
  }

  @MessagePattern('users.username.update')
  updateUsername(@Payload() payload: { userId: string; username: string }) {
    return this.usersService.updateUsername(payload.userId, payload.username);
  }

  // ── Follows ────────────────────────────────────────────────────────────────
  // El service emite el evento NATS 'user.followed' internamente
  @MessagePattern('users.follow')
  follow(@Payload() payload: { followerId: string; followingId: string }) {
    return this.usersService.follow(payload.followerId, payload.followingId);
  }

  @MessagePattern('users.unfollow')
  unfollow(@Payload() payload: { followerId: string; followingId: string }) {
    return this.usersService.unfollow(payload.followerId, payload.followingId);
  }

  // Devuelve: { isFollowing: boolean }
  @MessagePattern('users.follow.check')
  isFollowing(@Payload() payload: { followerId: string; followingId: string }) {
    return this.usersService.isFollowing(payload.followerId, payload.followingId);
  }

  // Devuelve: { users: User[], nextCursor: string | null }
  @MessagePattern('users.followers.list')
  getFollowers(
    @Payload() payload: { userId: string; cursor?: string; limit?: number; }
  ) {
    const { userId, ...options } = payload;
    return this.usersService.getFollowers(userId, options);
  }

  @MessagePattern('users.following.list')
  getFollowing(@Payload() payload: { userId: string; cursor?: string; limit?: number; }) {
    const { userId, ...options } = payload;
    return this.usersService.getFollowing(userId, options);
  }

  // ── Guardados ──────────────────────────────────────────────────────────────
  @MessagePattern('users.saved.add')
  save(@Payload() payload: { userId: string; targetId: string; targetType: SavedTargetTypeEnum; }) {

    return this.usersService.save(payload.userId, payload.targetId, payload.targetType);
  }

  @MessagePattern('users.saved.remove')
  unsave(@Payload() payload: { userId: string; targetId: string; targetType: SavedTargetTypeEnum; }
  ) {

    return this.usersService.unsave(payload.userId, payload.targetId, payload.targetType);
  }

  // Devuelve: { isSaved: boolean }
  @MessagePattern('users.saved.check')
  isSaved(@Payload() payload: { userId: string; targetId: string; targetType: SavedTargetTypeEnum; }) {
    return this.usersService.isSaved(payload.userId, payload.targetId, payload.targetType);
  }

  // Devuelve: { ids: string[], nextCursor: string | null }
  // El gateway pide los datos completos al PostService o RestaurantService con esos IDs
  @MessagePattern('users.saved.list')
  getSavedIds(@Payload() payload: { userId: string; targetType: SavedTargetTypeEnum; cursor?: string; limit?: number; }) {
    const { userId, targetType, ...options } = payload;

    return this.usersService.getSavedIds(userId, targetType, options);
  }

  // ── Buscar múltiples usuarios por IDs ────────────────────────────────────
  // Usado por el Notification Service para hidratar actores
  @MessagePattern('users.findByIds')
  findByIds(@Payload() payload: { userIds: string[] }) {
    return this.usersService.findByIds(payload.userIds);
  }

  // ── Búsqueda ───────────────────────────────────────────────────────────────
  @MessagePattern('users.search')
  searchUsers(@Payload() payload: { query: string; cursor?: string; limit?: number; }) {
    const { query, ...options } = payload;
    return this.usersService.searchUsers(query, options);
  }

  // ── Eventos que este servicio escucha de otros ─────────────────────────────
  // Cuando el PostService elimina un post, actualizamos el contador del usuario

  @EventPattern('post.deleted')
  onPostDeleted(@Payload() payload: { authorId: string }) {
    return this.usersService.decrementPostsCount(payload.authorId);
  }

  @EventPattern('post.created')
  onPostCreated(@Payload() payload: { authorId: string }) {
    return this.usersService.incrementPostsCount(payload.authorId);
  }
}