import { GetRestaurantDto, GetRestaurantBySlugDto, SearchRestaurantsDto, GetRestaurantsByIdsDto } from '../dtos/dtos';
import { Restaurant, RestaurantDocument } from '../entities/entities';
import { PaginatedRestaurants } from '../interfaces/interfaces';
import { RpcException } from '@nestjs/microservices';
import { RestaurantStatusEnum } from '../enum/enum';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
  ) { }

  // ── Leer ───────────────────────────────────────────────────────────────────
  async findById(dto: GetRestaurantDto): Promise<RestaurantDocument> {
    const restaurant = await this.restaurantModel.findOne({
      _id: new Types.ObjectId(dto.restaurantId),
      status: RestaurantStatusEnum.ACTIVE,
    });
    if (!restaurant) {
      throw new RpcException({ message: 'Restaurante no encontrado', status: 404 });
    }
    return restaurant;
  }

  async findBySlug(dto: GetRestaurantBySlugDto): Promise<RestaurantDocument> {
    const restaurant = await this.restaurantModel.findOne({
      slug: dto.slug,
      status: RestaurantStatusEnum.ACTIVE,
    });
    if (!restaurant) {
      throw new RpcException({ message: 'Restaurante no encontrado', status: 404 });
    }
    return restaurant;
  }

  // Para el Post Service — hidrata restaurantes desde sus IDs
  async findByIds(dto: GetRestaurantsByIdsDto): Promise<RestaurantDocument[]> {
    const restaurants = await this.restaurantModel
      .find({
        _id: { $in: dto.restaurantIds.map((id) => new Types.ObjectId(id)) },
        status: RestaurantStatusEnum.ACTIVE,
      })
      .select('name slug logoUrl coverUrl address.city category')  // solo lo necesario
      .exec();

    // Preservar el orden de los IDs recibidos
    const map = new Map(restaurants.map((r) => [r._id.toString(), r]));
    return dto.restaurantIds.map((id) => map.get(id)).filter(Boolean) as RestaurantDocument[];
  }

  // ── Búsqueda y listados ────────────────────────────────────────────────────
  async search(dto: SearchRestaurantsDto): Promise<PaginatedRestaurants> {
    const limit = dto.limit ?? 20;
    const filter: any = { status: RestaurantStatusEnum.ACTIVE };

    if (dto.query) {
      filter.$text = { $search: dto.query };
    }
    if (dto.category) filter.category = dto.category;
    if (dto.priceRange) filter.priceRange = dto.priceRange;

    if (dto.subCategories?.length) {
      filter.subCategories = { $in: dto.subCategories };
    }

    // Filtrar por features — el restaurante debe tener TODAS las features pedidas
    if (dto.features?.length) {
      filter.features = { $all: dto.features };
    }

    if (dto.cursor) filter._id = { $lt: new Types.ObjectId(dto.cursor) };

    const query = this.restaurantModel.find(filter);

    if (dto.query) {
      query.select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
    } else {
      query.sort({ _id: -1 });
    }

    const restaurants = await query.limit(limit + 1).exec();
    return this.paginate(restaurants, limit);
  }

  // ── Contadores (actualizados por eventos NATS) ─────────────────────────────
  async incrementPostsCount(restaurantId: string): Promise<void> {
    await this.restaurantModel.findByIdAndUpdate(restaurantId, {
      $inc: { postsCount: 1 },
    });
  }

  async decrementPostsCount(restaurantId: string): Promise<void> {
    await this.restaurantModel.findByIdAndUpdate(restaurantId, {
      $inc: { postsCount: -1 },
    });
  }

  async incrementSavedCount(restaurantId: string): Promise<void> {
    await this.restaurantModel.findByIdAndUpdate(restaurantId, {
      $inc: { savedCount: 1 },
    });
  }

  async decrementSavedCount(restaurantId: string): Promise<void> {
    await this.restaurantModel.findByIdAndUpdate(restaurantId, {
      $inc: { savedCount: -1 },
    });
  }

  // ─── Helpers privados ──────────────────────────────────────────────────────
  private paginate(restaurants: RestaurantDocument[], limit: number): PaginatedRestaurants {
    const hasMore = restaurants.length > limit;
    if (hasMore) restaurants.pop();
    return {
      restaurants,
      nextCursor: hasMore ? restaurants[restaurants.length - 1]._id.toString() : null,
    };
  }
}