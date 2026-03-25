import { RpcException } from '@nestjs/microservices';
import { S3Client} from '@aws-sdk/client-s3';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';

import {
  PublishPostDto,
  UpdatePostDto,
  DeletePostDto,
  GetUserPostsDto,
  GetRestaurantPostsDto,
  SearchPostsDto,
  GetPostsByIdsDto
} from '../dtos/dtos';

import { ImageUploadStatusEnum, PostStatusEnum } from '../enum/enum';
import { PaginatedPosts } from '../interfaces/interfaces';
import { Post, PostDocument } from '../entities/entities';

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name)
    private readonly postModel: Model<PostDocument>
  ) {}

  // ── Publicar el draft ─────────────────────────────────────────────
  async publishPost(dto: PublishPostDto): Promise<PostDocument> {
    const post = await this.postModel.findById(dto.postId);
    if (!post) throw new RpcException({ message: 'Post no encontrado', status: 404 });

    if (post.authorId.toString() !== dto.authorId) throw new RpcException({ message: 'No autorizado', status: 403 });

    if (post.status !== PostStatusEnum.DRAFT) throw new RpcException({ message: 'Este post ya fue publicado', status: 400 });

    // Verificar que todas las imágenes fueron subidas correctamente
    const pendingImages = post.images.filter(
      (img) => img.uploadStatus !== ImageUploadStatusEnum.UPLOADED,
    );

    if (pendingImages.length > 0) {
      throw new RpcException({
        message: `${pendingImages.length} imagen(es) aún no han sido subidas`,
        status: 400,
      });
    }

    const updatedPost = await this.postModel.findByIdAndUpdate(
      dto.postId,
      {
        $set: {
          status: PostStatusEnum.ACTIVE,
          caption: dto.caption ?? null,
          dishName: dto.dishName ?? null,
          cuisineType: dto.cuisineType ?? null,
          ingredients: dto.ingredients ?? [],
          tags: this.normalizeTags(dto.tags ?? []),
          restaurantId: dto.restaurantId ? new Types.ObjectId(dto.restaurantId) : null,
          location: dto.location ? this.buildLocation(dto.location) : null,
        },
      },
      { new: true },
    );

    return updatedPost;
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  async findById(postId: string): Promise<PostDocument> {
    const post = await this.postModel
      .findOne({ _id: postId, status: PostStatusEnum.ACTIVE })
      .exec();

    if (!post) throw new RpcException({ message: 'Post no encontrado', status: 404 });
    return post;
  }

  async findByIds(dto: GetPostsByIdsDto): Promise<PostDocument[]> {
    // Usado por el Feed Service para hidratar el feed con datos completos
    const posts = await this.postModel
      .find({
        _id: { $in: dto.postIds.map((id) => new Types.ObjectId(id)) },
        status: PostStatusEnum.ACTIVE,
      })
      .exec();

    // Devolver en el mismo orden que se pidieron
    const postMap = new Map(posts.map((p) => [p._id.toString(), p]));
    return dto.postIds.map((id) => postMap.get(id)).filter(Boolean) as PostDocument[];
  }

  async updatePost(dto: UpdatePostDto): Promise<PostDocument> {
    const post = await this.postModel.findById(dto.postId);
    if (!post) throw new RpcException({ message: 'Post no encontrado', status: 404 });
    if (post.authorId.toString() !== dto.authorId) {
      throw new RpcException({ message: 'No autorizado', status: 403 });
    }

    const setFields: Record<string, any> = {};
    if (dto.caption !== undefined) setFields.caption = dto.caption;
    if (dto.dishName !== undefined) setFields.dishName = dto.dishName;
    if (dto.cuisineType !== undefined) setFields.cuisineType = dto.cuisineType;
    if (dto.ingredients !== undefined) setFields.ingredients = dto.ingredients;
    if (dto.tags !== undefined) setFields.tags = this.normalizeTags(dto.tags);
    if (dto.restaurantId !== undefined) {
      setFields.restaurantId = dto.restaurantId ? new Types.ObjectId(dto.restaurantId) : null;
    }
    if (dto.location !== undefined) {
      setFields.location = dto.location ? this.buildLocation(dto.location) : null;
    }

    return this.postModel.findByIdAndUpdate(dto.postId,
      { $set: setFields },
      { new: true },
    );
  }

  async deletePost(dto: DeletePostDto): Promise<void> {
    const post = await this.postModel.findById(dto.postId);
    if (!post) throw new RpcException({ message: 'Post no encontrado', status: 404 });
    if (post.authorId.toString() !== dto.authorId) {
      throw new RpcException({ message: 'No autorizado', status: 403 });
    }

    // Soft delete — marcamos como DELETED, no borramos físicamente
    // Las imágenes en R2 se pueden limpiar con un job nocturno
    await this.postModel.findByIdAndUpdate(dto.postId, {
      $set: { status: PostStatusEnum.DELETED },
    });
  }

  // ── Listados paginados ────────────────────────────────────────────────────
  async getUserPosts(dto: GetUserPostsDto): Promise<PaginatedPosts> {
    const limit = dto.limit ?? 18;   // 18 = grid de 3 columnas × 6 filas

    const filter: any = {
      authorId: new Types.ObjectId(dto.authorId),
      status: PostStatusEnum.ACTIVE,
    };
    if (dto.cursor) filter._id = { $lt: new Types.ObjectId(dto.cursor) };

    const posts = await this.postModel
      .find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .exec();

    return this.paginate(posts, limit);
  }

  async getRestaurantPosts(dto: GetRestaurantPostsDto): Promise<PaginatedPosts> {
    const limit = dto.limit ?? 18;

    const filter: any = {
      restaurantId: new Types.ObjectId(dto.restaurantId),
      status: PostStatusEnum.ACTIVE,
    };
    if (dto.cursor) filter._id = { $lt: new Types.ObjectId(dto.cursor) };

    const posts = await this.postModel
      .find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .exec();

    return this.paginate(posts, limit);
  }

  async searchPosts(dto: SearchPostsDto): Promise<PaginatedPosts> {
    const limit = dto.limit ?? 20;

    const filter: any = {
      $text: { $search: dto.query },
      status: PostStatusEnum.ACTIVE,
    };

    if (dto.cuisineType) filter.cuisineType = dto.cuisineType;
    if (dto.tags?.length) filter.tags = { $in: dto.tags };
    if (dto.cursor) filter._id = { $lt: new Types.ObjectId(dto.cursor) };

    const posts = await this.postModel
      .find(filter, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' }, _id: -1 })
      .limit(limit + 1)
      .exec();

    return this.paginate(posts, limit);
  }

  // ── Actualización de contadores (llamados desde Social Service via NATS) ──
  async incrementLikes(postId: string): Promise<void> {
    await this.postModel.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } });
  }

  async decrementLikes(postId: string): Promise<void> {
    await this.postModel.findByIdAndUpdate(postId, { $inc: { likesCount: -1 } });
  }

  async incrementComments(postId: string): Promise<void> {
    await this.postModel.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
  }

  async decrementComments(postId: string): Promise<void> {
    await this.postModel.findByIdAndUpdate(postId, { $inc: { commentsCount: -1 } });
  }

  async incrementSaved(postId: string): Promise<void> {
    await this.postModel.findByIdAndUpdate(postId, { $inc: { savedCount: 1 } });
  }

  async decrementSaved(postId: string): Promise<void> {
    await this.postModel.findByIdAndUpdate(postId, { $inc: { savedCount: -1 } });
  }

  // ─── Helpers privados ──────────────────────────────────────────────────────
  private paginate(posts: PostDocument[], limit: number): PaginatedPosts {
    const hasMore = posts.length > limit;
    if (hasMore) posts.pop();
    return {
      posts,
      nextCursor: hasMore ? posts[posts.length - 1]._id.toString() : null,
    };
  }

  private normalizeTags(tags: string[]): string[] {
    // Asegurar que todos empiecen con # y estén en minúsculas
    return tags.map((t) => {
      const clean = t.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9áéíóúñ#]/g, '');
      return clean.startsWith('#') ? clean : `#${clean}`;
    });
  }

  private buildLocation(dto: { name: string; latitude?: number; longitude?: number }) {
    return {
      name: dto.name,
      geoPoint: dto.latitude != null && dto.longitude != null
        ? { type: 'Point' as const, coordinates: [dto.longitude, dto.latitude] }
        : undefined,
    };
  }
}