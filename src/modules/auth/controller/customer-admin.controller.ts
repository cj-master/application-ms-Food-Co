import { CreateAdminUserDto, UpdateAdminUserDto, UpdateUserStatusDto } from '../dtos/dtos';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CustomerAdminService } from '../services/services';
import { Controller } from '@nestjs/common';
import { PaginationDto } from 'src/common';

@Controller()
export class CustomerAdminController {
  constructor(private readonly service: CustomerAdminService) { }

  // ── Crear usuario ─────────────────────────────────────────────────────────
  @MessagePattern('customer.admin.create')
  create(@Payload() dto: CreateAdminUserDto) {
    return this.service.create(dto);
  }

  // ── Listar usuarios con filtros y paginación ──────────────────────────────
  @MessagePattern('customer.admin.find.all')
  findAll(@Payload() paginationDto: PaginationDto) {
    return this.service.findAll(paginationDto);
  }

  // ── Obtener usuario por ID ────────────────────────────────────────────────
  @MessagePattern('customer.admin.find.by.id')
  findById(@Payload() payload: { id: string }) {
    return this.service.findById(payload.id);
  }

  // ── Actualizar usuario ────────────────────────────────────────────────────
  @MessagePattern('customer.admin.update')
  update(@Payload() updateAdminUserDto: UpdateAdminUserDto) {
    return this.service.update(updateAdminUserDto);
  }
  
  // ── Actualizar estado del usuario ────────────────────────────────────────────────────
  @MessagePattern('customer.admin.update.status')
  updateStatus(@Payload() updateUserStatusDto: UpdateUserStatusDto) {
    return this.service.updateStatus(updateUserStatusDto);
  }
  
  // ── Desactivar usuario (soft delete) ─────────────────────────────────────
  @MessagePattern('customer.admin.deactivate')
  deactivate(@Payload() payload: { id: string }) {
    return this.service.deactivate(payload.id);
  }

  // ── Reactivar usuario ─────────────────────────────────────────────────────
  @MessagePattern('customer.admin.reactivate')
  reactivate(@Payload() payload: { id: string }) {
    return this.service.reactivate(payload.id);
  }

  // ── Eliminar usuario (hard delete) ────────────────────────────────────────
  @MessagePattern('customer.admin.remove')
  remove(@Payload() payload: { id: string }) {
    return this.service.remove(payload.id);
  }

  // ── Desbloquear cuenta ────────────────────────────────────────────────────
  @MessagePattern('customer.admin.unlock')
  unlockAccount(@Payload() payload: { id: string }) {
    return this.service.unlockAccount(payload.id);
  }

  // ── Estadísticas ──────────────────────────────────────────────────────────
  @MessagePattern('customer.admin.stats')
  getStats() {
    return this.service.getStats();
  }
}