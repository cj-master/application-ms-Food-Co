import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices';
import { Controller } from '@nestjs/common';
import {
  PublishPostDto,
  UpdatePostDto,
  DeletePostDto,
  GetPostDto,
  GetUserPostsDto,
  GetRestaurantPostsDto,
  SearchPostsDto,
  GetPostsByIdsDto,
} from '../dtos/dtos';
import { PostsService } from '../services/post.service';

@Controller()
export class PostsController {
  constructor(private readonly service: PostsService) { }

  // ── Flujo de subida ────────────────────────────────────────────────────────
  // Devuelve: Post completo ya activo
  @MessagePattern('posts.publish')
  publishPost(@Payload() dto: PublishPostDto) {
    return this.service.publishPost(dto);
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  @MessagePattern('posts.findById')
  findById(@Payload() dto: GetPostDto) {
    return this.service.findById(dto.postId);
  }

  @MessagePattern('posts.findByIds')
  findByIds(@Payload() dto: GetPostsByIdsDto) {
    return this.service.findByIds(dto);
    // Usado por el Feed Service para hidratar el feed
  }

  @MessagePattern('posts.update')
  updatePost(@Payload() dto: UpdatePostDto) {
    return this.service.updatePost(dto);
  }

  @MessagePattern('posts.delete')
  deletePost(@Payload() dto: DeletePostDto) {
    return this.service.deletePost(dto);
  }

  // ── Listados ───────────────────────────────────────────────────────────────
  @MessagePattern('posts.user.list')
  getUserPosts(@Payload() dto: GetUserPostsDto) {
    return this.service.getUserPosts(dto);
    // Grid de perfil — devuelve: { posts, nextCursor }
  }

  @MessagePattern('posts.restaurant.list')
  getRestaurantPosts(@Payload() dto: GetRestaurantPostsDto) {
    return this.service.getRestaurantPosts(dto);
  }

  @MessagePattern('posts.search')
  searchPosts(@Payload() dto: SearchPostsDto) {
    return this.service.searchPosts(dto);
  }

  // ── Eventos de Social Service — actualizan contadores ─────────────────────
  @EventPattern('social.post.liked')
  onPostLiked(@Payload() payload: { postId: string }) {
    return this.service.incrementLikes(payload.postId);
  }

  @EventPattern('social.post.unliked')
  onPostUnliked(@Payload() payload: { postId: string }) {
    return this.service.decrementLikes(payload.postId);
  }

  @EventPattern('social.comment.created')
  onCommentCreated(@Payload() payload: { postId: string }) {
    return this.service.incrementComments(payload.postId);
  }

  @EventPattern('social.comment.deleted')
  onCommentDeleted(@Payload() payload: { postId: string }) {
    return this.service.decrementComments(payload.postId);
  }

  // Cuando un usuario guarda/quita un post (User Service lo emite)
  @EventPattern('users.post.saved')
  onPostSaved(@Payload() payload: { postId: string }) {
    return this.service.incrementSaved(payload.postId);
  }

  @EventPattern('users.post.unsaved')
  onPostUnsaved(@Payload() payload: { postId: string }) {
    return this.service.decrementSaved(payload.postId);
  }
}