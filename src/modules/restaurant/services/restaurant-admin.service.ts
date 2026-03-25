import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import {
  CreateRestaurantDto,
  UpdateRestaurantDto,
  SetMenuLinkDto,
  SetMenuStructuredDto,
  UpdateRestaurantStatusDto,
  AddressRestaurantDto,
  CreateManyRestaurants
} from '../dtos/dtos';
import {
  buildQueryPage,
  buildRestaurantCoverUrls,
  buildRestaurantGalleryImageUrls,
  buildRestaurantLogoUrls,
  MongoIdDto,
  PaginationDto,
  pipePaginationPage
} from 'src/common';
import { Restaurant, RestaurantDocument } from '../entities/entities';
import { MenuTypeEnum, RestaurantStatusEnum } from '../enum/enum';

@Injectable()
export class RestaurantsAdminService {
  constructor(
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
  ) { }

  // ── Tabla de datos (solo admin) ─────────────────────────────────────────────────────
  async lts(paginationDto: PaginationDto) {
    try {
      const { perPage, currentPage, search, matchStage, skip } = buildQueryPage(paginationDto);
      const aggregation = await this.restaurantModel.aggregate(pipePaginationPage({ matchStage, perPage, search, skip })); // Productos

      const result = aggregation[0];

      const total = result.totalCount[0]?.total || 0;
      const totalPages = Math.ceil(total / perPage);

      return {
        data: result.data.map((item) => this.serialize(item)),
        total,
        perPage,
        currentPage,
        totalPages,
        startItem: skip + 1,
        endItem: skip + result.data.length,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      };
    } catch (error) {
      console.log(error);
    }
  }

  // -- buscar por id --
  async findById(mongoIdDto: MongoIdDto) {
    const { id } = mongoIdDto

    const restaurant = await this.restaurantModel.findOne({ _id: id }).lean().exec()
    if (!restaurant) throw new RpcException({ message: 'Información no encontrada', status: 400 })

    return restaurant
  }

  // ── Crear (solo admin) ─────────────────────────────────────────────────────
  async create(dto: CreateRestaurantDto) {
    const { name, address, ...rest } = dto
    const slug = await this.generateUniqueSlug(name, this.restaurantModel);

    await this.restaurantModel.create({
      name,
      slug,
      address: this.buildAddress(dto.address),
      ...rest
    });

    return ({
      message: 'Registro exito!'
    })
  }

  // ── Crear (solo admin) ─────────────────────────────────────────────────────
  async createMany({ data }: CreateManyRestaurants) {
    data.forEach(
      async (item) => await this.create(item)
    );

    return ({ message: 'Registro exito!' })
  }

  // ── Actualizar  ────────────────────────────────────────────────
  async update(dto: UpdateRestaurantDto) {
    const { restaurantId, data } = dto;
    const { address, ...rest } = data

    const setFields: Record<string, any> = {};

    // Campos simples — solo los que llegaron en el payload
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) setFields[key] = value;
    }

    // Address — construir con GeoPoint correcto si viene
    if (address) {
      setFields.address = this.buildAddress(address);
    }

    const restaurant = await this.restaurantModel.findByIdAndUpdate(
      restaurantId,
      { $set: setFields },
      { new: true, runValidators: true },
    );

    if (!restaurant) throw new RpcException({ message: 'Restaurante no encontrado', status: 404 });
    return ({
      message: 'Se actualizo el registro!'
    })
  }

  // ── Estado (publicar, desactivar) ─────────────────────────────────────────
  async updateStatus(dto: UpdateRestaurantStatusDto) {
    const restaurant = await this.restaurantModel.findByIdAndUpdate(
      dto.id, { $set: { status: dto.status } }, { new: true },);

    if (!restaurant) throw new RpcException({ message: 'Restaurante no encontrado', status: 404 });

    return ({
      message: 'Se actualizo el estado'
    });
  }

  // ── Menú ───────────────────────────────────────────────────────────────────
  async setMenuLink(dto: SetMenuLinkDto): Promise<RestaurantDocument> {
    const restaurant = await this.restaurantModel.findByIdAndUpdate(dto.restaurantId,
      {
        $set: {
          hasMenu: true,
          menu: { type: MenuTypeEnum.LINK, url: dto.url, sections: [] },
        },
      },
      { new: true },
    );

    if (!restaurant) throw new RpcException({ message: 'Restaurante no encontrado', status: 404 });
    return restaurant;
  }

  async setMenuStructured(dto: SetMenuStructuredDto): Promise<RestaurantDocument> {
    const restaurant = await this.restaurantModel.findByIdAndUpdate(
      dto.restaurantId,
      {
        $set: {
          hasMenu: true,
          menu: { type: MenuTypeEnum.STRUCTURED, url: null, sections: dto.sections },
        },
      },
      { new: true },
    );
    if (!restaurant) {
      throw new RpcException({ message: 'Restaurante no encontrado', status: 404 });
    }
    return restaurant;
  }

  // ── Stadisct ──────────────────────────────────────────────────────────────────
  public async statistics() {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [total, active, inactive, totalLastMonth, activeLastMonth, inactiveLastMonth] = await Promise.all([
      this.restaurantModel.countDocuments(),
      this.restaurantModel.countDocuments({ status: RestaurantStatusEnum.ACTIVE }),
      this.restaurantModel.countDocuments({ status: RestaurantStatusEnum.INACTIVE }),

      // Conteo del mes anterior
      this.restaurantModel.countDocuments({ createdAt: { $lt: startOfThisMonth, $gte: startOfLastMonth } }),
      this.restaurantModel.countDocuments({ status: RestaurantStatusEnum.ACTIVE, createdAt: { $lt: startOfThisMonth, $gte: startOfLastMonth } }),
      this.restaurantModel.countDocuments({ status: RestaurantStatusEnum.INACTIVE, createdAt: { $lt: startOfThisMonth, $gte: startOfLastMonth } }),
    ]);

    const calcGrowth = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return parseFloat((((current - previous) / previous) * 100).toFixed(2));
    };

    return {
      total,
      active,
      inactive,
      growth: {
        total: calcGrowth(total, totalLastMonth),
        active: calcGrowth(active, activeLastMonth),
        inactive: calcGrowth(inactive, inactiveLastMonth),
      }
    };
  }
  // ── Media ──────────────────────────────────────────────────────────────────
  async onLogoProcessed(payload: { key: string; entityId: string }): Promise<void> {
    await this.restaurantModel.findByIdAndUpdate(payload.entityId, { $set: { logoKey: payload.key } });
  }

  async onCoverProcessed(payload: { key: string; entityId: string }): Promise<void> {
    await this.restaurantModel.findByIdAndUpdate(payload.entityId, { $set: { coverKey: payload.key } });
  }

  async onGalleryImageProcessed(payload: { key: string; entityId: string }): Promise<void> {
    await this.restaurantModel.findByIdAndUpdate(
      payload.entityId,
      {
        $push: {
          gallery: {
            key: payload.key,
            order: 0,
            blurHash: null,
            caption: null,
            uploadedBy: null,
          },
        },
      },
    );
  }

  async onGalleryImageDeleted(payload: { key: string; entityId: string }): Promise<void> {
    await this.restaurantModel.findByIdAndUpdate(
      payload.entityId,
      {
        $pull: {
          gallery: { key: payload.key },
        },
      },
    );
  }

  // ─── Helpers privados ──────────────────────────────────────────────────────
  private buildAddress(dto: AddressRestaurantDto) {
    return {
      name: dto.name,
      city: dto.city ?? null,
      state: dto.state ?? null,
      country: dto.country ?? null,
      geoPoint: (dto.latitude && dto.longitude)
        ? {
          type: 'Point' as const,
          coordinates: [dto.longitude, dto.latitude] as [number, number],
        }
        : null,
    };
  }

  private async generateUniqueSlug(name: string, model: Model<any>): Promise<string> {
    const baseSlug = this.generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    while (await model.exists({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private generateSlug(text: string): string {
    return text
      .normalize('NFD')                     // separa acentos
      .replace(/[\u0300-\u036f]/g, '')      // elimina acentos
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')         // elimina caracteres raros
      .replace(/\s+/g, '-')                 // espacios → -
      .replace(/-+/g, '-');                 // evita --
  }

  // ── Serializar ─────────────────────────────────────────────────────────────
  private serialize(restaurant: RestaurantDocument) {

    return {
      ...restaurant,
      logo: buildRestaurantLogoUrls(restaurant.logoKey),
      cover: buildRestaurantCoverUrls(restaurant.coverKey),
      gallery: restaurant.gallery.map((img) => ({ ...buildRestaurantGalleryImageUrls(img.key) }))
    };
  }
}