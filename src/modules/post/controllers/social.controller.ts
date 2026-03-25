import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  LikePostDto,
  UnlikePostDto,
  CheckLikeDto,
  CheckLikesBulkDto,
  CreateCommentDto,
  DeleteCommentDto,
  GetPostCommentsDto,
  GetCommentRepliesDto,
} from '../dtos/dtos';
import { SocialService } from '../services/services';

@Controller()
export class SocialController {
  constructor(private readonly socialService: SocialService) { }

  // ── Likes ──────────────────────────────────────────────────────────────────

  @MessagePattern('social.post.like')
  async likePost(@Payload() dto: LikePostDto) {
    await this.socialService.likePost(dto);
    // Emitir evento para que Post Service actualice su contador
    return { success: true, event: 'social.post.liked', postId: dto.postId };
    // El gateway se encarga de emitir el EventPattern al recibir este resultado
  }

  @MessagePattern('social.post.unlike')
  async unlikePost(@Payload() dto: UnlikePostDto) {
    await this.socialService.unlikePost(dto);
    return { success: true, event: 'social.post.unliked', postId: dto.postId };
  }

  @MessagePattern('social.post.like.check')
  isLiked(@Payload() dto: CheckLikeDto) {
    return this.socialService.isLiked(dto);
    // Devuelve: { isLiked: boolean }
  }

  // Devuelve: [{ postId, isLiked }] — el feed lo usa para cada carga de posts
  @MessagePattern('social.post.like.check.bulk')
  isLikedBulk(@Payload() dto: CheckLikesBulkDto) {
    return this.socialService.isLikedBulk(dto);
  }

  // ── Comentarios ────────────────────────────────────────────────────────────
  @MessagePattern('social.comment.create')
  async createComment(@Payload() dto: CreateCommentDto) {
    const comment = await this.socialService.createComment(dto);
    return { comment, event: 'social.comment.created', postId: dto.postId };
  }

  @MessagePattern('social.comment.delete')
  async deleteComment(@Payload() dto: DeleteCommentDto) {
    await this.socialService.deleteComment(dto);
    return { success: true };
    // El servicio internamente ya sabe el postId para emitir el evento
  }

  @MessagePattern('social.comment.list')
  getPostComments(@Payload() dto: GetPostCommentsDto) {
    return this.socialService.getPostComments(dto);
    // Devuelve: { comments, nextCursor }
  }

  @MessagePattern('social.comment.replies')
  getCommentReplies(@Payload() dto: GetCommentRepliesDto) {
    return this.socialService.getCommentReplies(dto);
    // Devuelve: { comments, nextCursor }
  }
}