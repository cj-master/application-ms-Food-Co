import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';

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

import { CommentDocument, Comments, Like, LikeDocument } from '../entities/entities';
import { PaginatedComments } from '../interfaces/interfaces';
import { CommentStatusEnum } from '../enum/enum';

@Injectable()
export class SocialService {

  constructor(
    @InjectModel(Like.name)
    private readonly likeModel: Model<LikeDocument>,

    @InjectModel(Comments.name)
    private readonly commentModel: Model<CommentDocument>,
  ) { }

  // ── Likes ──────────────────────────────────────────────────────────────────
  async likePost(dto: LikePostDto): Promise<void> {
    const alreadyLiked = await this.likeModel.exists({
      userId: new Types.ObjectId(dto.userId),
      postId: new Types.ObjectId(dto.postId),
    });

    if (alreadyLiked) {
      throw new RpcException({ message: 'Ya diste like a este post', status: 409 });
    }

    await this.likeModel.create({
      userId: new Types.ObjectId(dto.userId),
      postId: new Types.ObjectId(dto.postId),
    });

    // El controller emite 'social.post.liked' → Post Service incrementa su contador
  }

  async unlikePost(dto: UnlikePostDto): Promise<void> {
    const result = await this.likeModel.findOneAndDelete({
      userId: new Types.ObjectId(dto.userId),
      postId: new Types.ObjectId(dto.postId),
    });

    if (!result) {
      throw new RpcException({ message: 'No habías dado like a este post', status: 404 });
    }

    // El controller emite 'social.post.unliked' → Post Service decrementa su contador
  }

  async isLiked(dto: CheckLikeDto): Promise<{ isLiked: boolean }> {
    const exists = await this.likeModel.exists({
      userId: new Types.ObjectId(dto.userId),
      postId: new Types.ObjectId(dto.postId),
    });
    return { isLiked: !!exists };
  }

  // Verifica likes de múltiples posts en una sola query
  // El feed necesita saber cuáles posts ya tiene likeados el usuario actual
  async isLikedBulk(dto: CheckLikesBulkDto): Promise<{ postId: string; isLiked: boolean }[]> {
    const likes = await this.likeModel
      .find({
        userId: new Types.ObjectId(dto.userId),
        postId: { $in: dto.postIds.map((id) => new Types.ObjectId(id)) },
      })
      .select('postId')
      .lean()
      .exec();

    const likedSet = new Set(likes.map((l) => l.postId.toString()));

    return dto.postIds.map((postId) => ({
      postId,
      isLiked: likedSet.has(postId),
    }));
  }

  // ── Comentarios ────────────────────────────────────────────────────────────
  async createComment(dto: CreateCommentDto): Promise<CommentDocument> {
    // Si es una respuesta, verificar que el comentario padre existe
    if (dto.parentId) {
      const parent = await this.commentModel.findOne({
        _id: new Types.ObjectId(dto.parentId),
        postId: new Types.ObjectId(dto.postId),
        status: CommentStatusEnum.ACTIVE,
      });

      if (!parent) throw new RpcException({ message: 'Comentario no encontrado', status: 404 });

      // Incrementar el contador de respuestas del padre
      await this.commentModel.findByIdAndUpdate(dto.parentId, {
        $inc: { repliesCount: 1 },
      });
    }

    const comment = await this.commentModel.create({
      postId: new Types.ObjectId(dto.postId),
      authorId: new Types.ObjectId(dto.authorId),
      text: dto.text.trim(),
      parentId: dto.parentId ? new Types.ObjectId(dto.parentId) : null,
      mentionedUserId: dto.mentionedUserId ? new Types.ObjectId(dto.mentionedUserId) : null,
    });

    // El controller emite 'social.comment.created' → Post Service incrementa commentsCount
    return comment;
  }

  async deleteComment(dto: DeleteCommentDto): Promise<void> {
    const comment = await this.commentModel.findById(dto.commentId);

    if (!comment || comment.status !== CommentStatusEnum.ACTIVE) {
      throw new RpcException({ message: 'Comentario no encontrado', status: 404 });
    }

    if (comment.authorId.toString() !== dto.authorId) {
      throw new RpcException({ message: 'No autorizado', status: 403 });
    }

    // Soft delete
    await this.commentModel.findByIdAndUpdate(dto.commentId, {
      $set: { status: CommentStatusEnum.DELETED },
    });

    // Si era una respuesta, decrementar el contador del padre
    if (comment.parentId) {
      await this.commentModel.findByIdAndUpdate(comment.parentId, {
        $inc: { repliesCount: -1 },
      });
    }

    // El controller emite 'social.comment.deleted' → Post Service decrementa commentsCount
  }

  async getPostComments(dto: GetPostCommentsDto): Promise<PaginatedComments> {
    const limit = dto.limit ?? 20;

    const filter: any = {
      postId: new Types.ObjectId(dto.postId),
      parentId: null,                           // solo comentarios raíz
      status: CommentStatusEnum.ACTIVE,
    };
    if (dto.cursor) filter._id = { $lt: new Types.ObjectId(dto.cursor) };

    const comments = await this.commentModel
      .find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .exec();

    return this.paginate(comments, limit);
  }

  async getCommentReplies(dto: GetCommentRepliesDto): Promise<PaginatedComments> {
    const limit = dto.limit ?? 10;

    const filter: any = {
      parentId: new Types.ObjectId(dto.commentId),
      status: CommentStatusEnum.ACTIVE,
    };
    if (dto.cursor) filter._id = { $gt: new Types.ObjectId(dto.cursor) };
    // Respuestas en orden cronológico ascendente (las más viejas primero)

    const comments = await this.commentModel
      .find(filter)
      .sort({ _id: 1 })
      .limit(limit + 1)
      .exec();

    return this.paginate(comments, limit);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private paginate(comments: CommentDocument[], limit: number): PaginatedComments {
    const hasMore = comments.length > limit;
    if (hasMore) comments.pop();
    return {
      comments,
      nextCursor: hasMore ? comments[comments.length - 1]._id.toString() : null,
    };
  }
}