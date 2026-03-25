import { CreateManyRestaurants, SetMenuLinkDto, SetMenuStructuredDto, UpdateRestaurantStatusDto } from '../dtos/dtos';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { MEDIA_EVENTS } from 'src/modules/media/const/MEDIA_EVENTS';
import { RestaurantsAdminService } from '../services/services';
import { MongoIdDto, PaginationDto } from 'src/common';
import { Controller } from '@nestjs/common';

@Controller()
export class RestaurantsAdminController {
  constructor(private readonly service: RestaurantsAdminService) { }

  // Listado de restuarantes
  @MessagePattern('restaurant.admin.lts')
  lts(@Payload() paginationDto: PaginationDto) {
    return this.service.lts(paginationDto);
  }

  // Encontrar por id
  @MessagePattern('restaurant.admin.find.by.id')
  findById(@Payload() mongoIdDto: MongoIdDto) {
    return this.service.findById(mongoIdDto);
  }

  // Crear un registro
  @MessagePattern('restaurant.admin.create')
  create(@Payload() createRestaurantDto: any) {
    return this.service.create(createRestaurantDto);
  }

  // Crear varios registros
  @MessagePattern('restaurant.admin.create.many')
  createMany(@Payload() createManyRestaurants: CreateManyRestaurants) {
    return this.service.createMany(createManyRestaurants);
  }

  // Actulizar registro
  @MessagePattern('restaurants.admin.update')
  update(@Payload() dto: any) {
    return this.service.update(dto);
  }

  // Usado para publicar (draft → active) o desactivar temporalmente
  @MessagePattern('restaurants.admin.status.update')
  updateStatus(@Payload() dto: UpdateRestaurantStatusDto) {
    return this.service.updateStatus(dto);
  }

  // ── Menú ───────────────────────────────────────────────────────────────────
  @MessagePattern('restaurants.menu.link')
  setMenuLink(@Payload() dto: SetMenuLinkDto) {
    return this.service.setMenuLink(dto);
  }

  @MessagePattern('restaurants.menu.structured')
  setMenuStructured(@Payload() dto: SetMenuStructuredDto) {
    return this.service.setMenuStructured(dto);
  }

  // ── Media — escucha cuando el Media Service termina de procesar ────────────
  @EventPattern(MEDIA_EVENTS.PROCESSED('restaurant_logo'))
  onLogoProcessed(@Payload() payload: { key: string; entityId: string }) {
    return this.service.onLogoProcessed(payload);
  }

  @EventPattern(MEDIA_EVENTS.PROCESSED('restaurant_cover'))
  onCoverProcessed(@Payload() payload: { key: string; entityId: string }) {
    return this.service.onCoverProcessed(payload);
  }

  @EventPattern(MEDIA_EVENTS.PROCESSED('restaurant_gallery'))
  onGalleryImageProcessed(@Payload() payload: { key: string; entityId: string }) {
    return this.service.onGalleryImageProcessed(payload);
  }

  @EventPattern(MEDIA_EVENTS.DELETED('restaurant_gallery'))
  onGalleryImageDeleted(@Payload() payload: { key: string; entityId: string }) {
    return this.service.onGalleryImageDeleted(payload);
  }
}