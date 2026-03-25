import { buildQueryPage, PaginationDto, pipePaginationPage } from 'src/common';
import { UserStatusEnum, AuthProviderEnum, UserRoleEnum } from '../enum/enum';
import { CreateAdminUserDto, UpdateAdminUserDto } from '../dtos/dtos';
import { User, UserDocument } from '../entities/entities';
import { RpcException } from '@nestjs/microservices';
import { paginationUserList } from '../const/const';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UpdateUserStatusDto } from '../dtos/admin/updateUserStatus.dto';

@Injectable()
export class CustomerAdminService {
  private readonly SALT_ROUNDS = 12;
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) { }

  // ── Create ───────────────────────────────────────────────────────────────
  async create(payload: CreateAdminUserDto): Promise<UserDocument> {
    const { email, username, displayName, password, bio, status } = payload;

    const [existingEmail, existingUsername] = await Promise.all([
      this.userModel.findOne({ email }).lean(),
      this.userModel.findOne({ username }).lean(),
    ]);

    if (existingEmail) throw new RpcException({ message: 'El email ya está registrado', status: 409 });
    if (existingUsername) throw new RpcException({ message: 'El username ya está en uso', status: 409 });

    const hashedPassword = password
      ? await bcrypt.hash(password, this.SALT_ROUNDS)
      : null;

    const user = await this.userModel.create({
      email,
      username,
      displayName,
      password: hashedPassword,
      authProvider: AuthProviderEnum.LOCAL,
      role: UserRoleEnum.USER,
      isVerified: false,
      bio: bio ?? null,
      status: status ? status : UserStatusEnum.INACTIVE
    });

    return user;
  }

  // ── List ─────────────────────────────────────────────────────────────────
  async findAll(paginationDto: PaginationDto) {
    const { perPage, currentPage, search, matchStage, skip } = buildQueryPage(paginationDto);

    const aggregation = await this.userModel.aggregate(pipePaginationPage({ matchStage, perPage, search, skip })); // Productos

    const result = aggregation[0];

    const total = result.totalCount[0]?.total || 0;
    const totalPages = Math.ceil(total / perPage);

    return {
      data: result.data.map(paginationUserList),
      total,
      perPage,
      currentPage,
      totalPages,
      startItem: skip + 1,
      endItem: skip + result.data.length,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    };
  }

  // ── Find One ─────────────────────────────────────────────────────────────
  async findById(id: string): Promise<UserDocument> {
    return this.findOrFail(id);
  }

  // ── Update ───────────────────────────────────────────────────────────────
  async update(payload: UpdateAdminUserDto) {
    const { id } = payload
    const objectId = this.toObjectId(id);
    await this.findOrFail(id);

    // Verificar unicidad de email / username si cambian
    if (payload.email || payload.username) {
      const orConditions: Record<string, string>[] = [];
      if (payload.email) orConditions.push({ email: payload.email });
      if (payload.username) orConditions.push({ username: payload.username });

      const conflict = await this.userModel.findOne({
        _id: { $ne: objectId },
        $or: orConditions,
      }).lean();

      if (conflict) {
        const field = (conflict as UserDocument).email === payload.email ? 'email' : 'username';
        throw new RpcException({ message: `Ya existe otro usuario con ese ${field}`, status: 409 });
      }
    }

    // Construir $set dinámico
    const $set: Record<string, unknown> = {};

    if (payload.displayName !== undefined) $set.displayName = payload.displayName;
    if (payload.email !== undefined) $set.email = payload.email;
    if (payload.username !== undefined) $set.username = payload.username;
    if (payload.status !== undefined) $set.status = payload.status;
    if (payload.avatarUrl !== undefined) $set.avatarUrl = payload.avatarUrl;
    if (payload.bio !== undefined) $set.bio = payload.bio;
    if (payload.isVerified !== undefined) $set.isVerified = payload.isVerified;
    if (payload.onboardingCompleted !== undefined) $set.onboardingCompleted = payload.onboardingCompleted;

    // Merge de sub-documentos — evitar pisar campos no enviados
    if (payload.socialLinks) {
      for (const [key, val] of Object.entries(payload.socialLinks)) {
        $set[`socialLinks.${key}`] = val;
      }
    }
    if (payload.preferences) {
      for (const [key, val] of Object.entries(payload.preferences)) {
        $set[`preferences.${key}`] = val;
      }
    }

    if (payload.password) {
      $set.password = await bcrypt.hash(payload.password, this.SALT_ROUNDS);
    }

    const updated = await this.userModel.findByIdAndUpdate(
      objectId,
      { $set },
      { new: true, runValidators: true },
    );

    if (!updated) throw new RpcException({ message: `Usuario con ID ${id} no encontrado`, status: 404 });

    return ({
      message: 'Registro actualizado!'
    })
  }

  // ── Estado (publicar, desactivar) ─────────────────────────────────────────
  async updateStatus(dto: UpdateUserStatusDto) {
    const user = await this.userModel.findByIdAndUpdate(dto.id, { $set: { status: dto.status } }, { new: true });
    if (!user) throw new RpcException({ message: 'Usuario no encontrado', status: 404 });

    return ({
      message: 'Se actualizo el estado'
    });
  }

  // ── Deactivate ───────────────────────────────────────────────────────────
  async deactivate(id: string): Promise<UserDocument> {
    const user = await this.findOrFail(id);

    if (user.status === UserStatusEnum.INACTIVE) throw new RpcException({ message: 'El usuario ya está desactivado', status: 409 });

    user.status = UserStatusEnum.INACTIVE;
    await user.save();

    return user;
  }

  // ── Reactivate ───────────────────────────────────────────────────────────
  async reactivate(id: string): Promise<UserDocument> {
    const user = await this.findOrFail(id);

    if (user.status === UserStatusEnum.ACTIVE) {
      throw new RpcException({ message: 'El usuario ya está activo', status: 409 });
    }

    user.status = UserStatusEnum.ACTIVE;
    user.lockUntil = null;
    user.loginAttempts = 0;
    await user.save();

    return user;
  }

  // ── Remove (hard delete) ─────────────────────────────────────────────────
  async remove(id: string): Promise<{ deleted: boolean; userId: string }> {
    await this.findOrFail(id);
    await this.userModel.deleteOne({ _id: this.toObjectId(id) });
    return { deleted: true, userId: id };
  }

  // ── Unlock account ───────────────────────────────────────────────────────
  async unlockAccount(id: string): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(
      this.toObjectId(id),
      { $set: { loginAttempts: 0, lockUntil: null } },
      { new: true },
    );

    if (!user) throw new RpcException({ message: `Usuario con ID ${id} no encontrado`, status: 404 });

    return user;
  }

  // ── Stats ───────────────────────────────────────────────────────────────
  async getStats(): Promise<{ total: number; active: number; inactive: number; verified: number; byRole: Record<string, number>; }> {
    const [total, active, inactive, verified, byRoleRaw] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ status: UserStatusEnum.ACTIVE }),
      this.userModel.countDocuments({ status: UserStatusEnum.INACTIVE }),
      this.userModel.countDocuments({ isVerified: true }),
      this.userModel.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
    ]);

    const byRole = byRoleRaw.reduce<Record<string, number>>((acc, cur) => {
      acc[cur._id] = cur.count;
      return acc;
    }, {});

    return { total, active, inactive, verified, byRole };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) throw new RpcException({ message: `ID inválido: ${id}`, status: 400 });
    return new Types.ObjectId(id);
  }

  private async findOrFail(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(this.toObjectId(id));
    if (!user) throw new RpcException({ message: `Usuario con ID ${id} no encontrado`, status: 404 });
    return user;
  }
}