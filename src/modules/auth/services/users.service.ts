import { Follow, FollowDocument, Saved, SavedDocument, User, UserDocument } from '../entities/entities';
import { SavedTargetTypeEnum } from '../enum/savedTargetType.enum';
import { UpdateProfilePayload } from '../interface/inteface';
import { PaginationOptions } from 'src/interface/interface';
import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(Follow.name)
    private readonly followModel: Model<FollowDocument>,

    @InjectModel(Saved.name)
    private readonly savedModel: Model<SavedDocument>,
  ) { }

  // ── Perfil ─────────────────────────────────────────────────────────────────
  async findById(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new RpcException({ message: 'Usuario no encontrado', status: 404 });
    return user;
  }

  async findByUsername(username: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ username }).exec();
    if (!user) throw new RpcException({ message: 'Usuario no encontrado', status: 404 });
    return user;
  }

  async updateProfile(userId: string, payload: UpdateProfilePayload): Promise<UserDocument> {
    // Si viene nuevo username verificar que no esté tomado
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: payload },
      { new: true, runValidators: true },
    ).exec();

    if (!user) throw new RpcException({ message: 'Usuario no encontrado', status: 404 });
    return user;
  }

  async updateUsername(userId: string, username: string): Promise<UserDocument> {
    const taken = await this.userModel.exists({ username, _id: { $ne: userId } });
    if (taken) throw new RpcException({ message: 'El username ya está en uso', statatus: 409 });

    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { username } },
      { new: true, runValidators: true },
    ).exec();

    if (!user) throw new RpcException({ message: 'Usuario no encontrado', status: 404 });
    return user;
  }

  // ── Follows ────────────────────────────────────────────────────────────────
  async follow(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) throw new RpcException({ message: 'No puedes seguirte a ti mismo', status: 400 })

    const targetExists = await this.userModel.exists({ _id: followingId });
    if (!targetExists) throw new RpcException({ message: 'Usuario no encontrado', status: 404 });

    const alreadyFollowing = await this.followModel.exists({
      followerId: new Types.ObjectId(followerId),
      followingId: new Types.ObjectId(followingId),
    });

    if (alreadyFollowing) throw new RpcException({ message: 'Ya sigues a este usuario', status: 409 });

    await this.followModel.create({
      followerId: new Types.ObjectId(followerId),
      followingId: new Types.ObjectId(followingId),
    });

    // Actualizar contadores en ambos usuarios de forma atómica
    await Promise.all([
      this.userModel.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } }),
      this.userModel.findByIdAndUpdate(followingId, { $inc: { followersCount: 1 } }),
    ]);
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    const result = await this.followModel.findOneAndDelete({
      followerId: new Types.ObjectId(followerId),
      followingId: new Types.ObjectId(followingId),
    });

    if (!result) throw new RpcException({ message: 'No sigues a este usuario', status: 404 });

    await Promise.all([
      this.userModel.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } }),
      this.userModel.findByIdAndUpdate(followingId, { $inc: { followersCount: -1 } }),
    ]);
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    return !!(await this.followModel.exists({
      followerId: new Types.ObjectId(followerId),
      followingId: new Types.ObjectId(followingId),
    }));
  }

  // Lista de seguidores de un usuario (quien lo sigue)
  async getFollowers(userId: string, options: PaginationOptions = {}): Promise<{ users: UserDocument[]; nextCursor: string | null }> {
    const limit = options.limit ?? 20;

    const query: any = { followingId: new Types.ObjectId(userId) };
    if (options.cursor) {
      query._id = { $lt: new Types.ObjectId(options.cursor) };
    }

    const follows = await this.followModel
      .find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean()
      .exec();

    const hasMore = follows.length > limit;
    if (hasMore) follows.pop();

    const followerIds = follows.map((f) => f.followerId);
    const users = await this.userModel.find({ _id: { $in: followerIds } }).exec();

    return {
      users,
      nextCursor: hasMore ? follows[follows.length - 1]._id.toString() : null,
    };
  }

  // Lista de seguidos de un usuario (a quien sigue)
  async getFollowing(userId: string, options: PaginationOptions = {}): Promise<{ users: UserDocument[]; nextCursor: string | null }> {
    const limit = options.limit ?? 20;

    const query: any = { followerId: new Types.ObjectId(userId) };
    if (options.cursor) {
      query._id = { $lt: new Types.ObjectId(options.cursor) };
    }

    const follows = await this.followModel
      .find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean()
      .exec();

    const hasMore = follows.length > limit;
    if (hasMore) follows.pop();

    const followingIds = follows.map((f) => f.followingId);
    const users = await this.userModel.find({ _id: { $in: followingIds } }).exec();

    return {
      users,
      nextCursor: hasMore ? follows[follows.length - 1]._id.toString() : null,
    };
  }

  // ── Guardados ──────────────────────────────────────────────────────────────
  async save(userId: string, targetId: string, targetType: SavedTargetTypeEnum): Promise<void> {
    const alreadySaved = await this.savedModel.exists({
      userId: new Types.ObjectId(userId),
      targetId: new Types.ObjectId(targetId),
      targetType,
    });

    if (alreadySaved) throw new RpcException({ message: 'Ya guardaste este elemento', status: 409 });

    await this.savedModel.create({
      userId: new Types.ObjectId(userId),
      targetId: new Types.ObjectId(targetId),
      targetType,
    });

    await this.userModel.findByIdAndUpdate(userId, { $inc: { savedCount: 1 } });
  }

  async unsave(userId: string, targetId: string, targetType: SavedTargetTypeEnum): Promise<void> {
    const result = await this.savedModel.findOneAndDelete({
      userId: new Types.ObjectId(userId),
      targetId: new Types.ObjectId(targetId),
      targetType,
    });

    if (!result) throw new RpcException({ message: 'No habías guardado este elemento', status: 404 });

    await this.userModel.findByIdAndUpdate(userId, { $inc: { savedCount: -1 } });
  }

  async isSaved(userId: string, targetId: string, targetType: SavedTargetTypeEnum): Promise<boolean> {
    return !!(await this.savedModel.exists({
      userId: new Types.ObjectId(userId),
      targetId: new Types.ObjectId(targetId),
      targetType,
    }));
  }

  // Retorna los IDs guardados por tipo — el servicio correspondiente
  // (PostService / RestaurantService) se encarga de hidratar los datos
  async getSavedIds(
    userId: string,
    targetType: SavedTargetTypeEnum,
    options: PaginationOptions = {}
  ): Promise<{ ids: string[]; nextCursor: string | null }> {
    const limit = options.limit ?? 18;  // 18 para grid 3 columnas

    const query: any = {
      userId: new Types.ObjectId(userId),
      targetType,
    };

    if (options.cursor) {
      query._id = { $lt: new Types.ObjectId(options.cursor) };
    }

    const saved = await this.savedModel
      .find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean()
      .exec();

    const hasMore = saved.length > limit;
    if (hasMore) saved.pop();

    return {
      ids: saved.map((s) => s.targetId.toString()),
      nextCursor: hasMore ? saved[saved.length - 1]._id.toString() : null,
    };
  }

  // ── Buscar múltiples usuarios por IDs ────────────────────────────────────
  // Usado por el Notification Service para hidratar actores en una sola query
  async findByIds(userIds: string[]): Promise<UserDocument[]> {
    const users = await this.userModel
      .find({ _id: { $in: userIds.map((id) => new Types.ObjectId(id)) } })
      .select('username displayName avatarUrl isVerified followersCount')
      .exec();

    // Preservar el orden de los IDs recibidos
    const map = new Map(users.map((u) => [u._id.toString(), u]));
    return userIds.map((id) => map.get(id)).filter(Boolean) as UserDocument[];
  }

  // ── Búsqueda de usuarios ───────────────────────────────────────────────────
  async searchUsers(query: string, options: PaginationOptions = {}): Promise<{ users: UserDocument[]; nextCursor: string | null }> {
    const limit = options.limit ?? 20;

    // MongoDB text search sobre el índice { username: 'text', displayName: 'text' }
    const filter: any = { $text: { $search: query } };
    if (options.cursor) { filter._id = { $lt: new Types.ObjectId(options.cursor) }; }

    const users = await this.userModel
      .find(filter, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit + 1)
      .exec();

    const hasMore = users.length > limit;
    if (hasMore) users.pop();

    return {
      users,
      nextCursor: hasMore ? users[users.length - 1]._id.toString() : null,
    };
  }

  // ── Contadores (para sincronizar si se desincronizaran) ────────────────────
  async recalculateCounters(userId: string): Promise<void> {
    const id = new Types.ObjectId(userId);

    const [followersCount, followingCount, savedCount] = await Promise.all([
      this.followModel.countDocuments({ followingId: id }),
      this.followModel.countDocuments({ followerId: id }),
      this.savedModel.countDocuments({ userId: id }),
    ]);

    await this.userModel.findByIdAndUpdate(userId, {
      $set: { followersCount, followingCount, savedCount },
    });
  }

  async incrementPostsCount(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { $inc: { postsCount: 1 } });
  }

  async decrementPostsCount(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { $inc: { postsCount: -1 } });
  }
}