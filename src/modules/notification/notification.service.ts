import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { RpcException } from '@nestjs/microservices';
import { Model, Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';

import {
  CreateNotificationDto,
  RegisterPushTokenDto,
  RemovePushTokenDto,
  GetNotificationsDto,
  MarkAsReadDto,
  GetUnreadCountDto,
} from './dtos/dtos';

import {
  INotificationItem,
  INotificationActor,
  IGetNotificationsResult,
  IUnreadCountResult,
  IPushMessage,
} from './interfaces/interfaces';
import { NotificationStatusEnum, NotificationTypeEnum } from './enum/enum';
import { Notification, NotificationDocument, PushToken, PushTokenDocument } from './entities/entities';
import { NATS_SERVICE } from 'src/config';

// ─── Textos de las notificaciones ─────────────────────────────────────────────

const NOTIFICATION_COPY: Record<NotificationTypeEnum, (actor: string) => string> = {
  [NotificationTypeEnum.LIKE]: (actor) => `${actor} le dio me gusta a tu post`,
  [NotificationTypeEnum.COMMENT]: (actor) => `${actor} comentó tu post`,
  [NotificationTypeEnum.REPLY]: (actor) => `${actor} respondió tu comentario`,
  [NotificationTypeEnum.FOLLOW]: (actor) => `${actor} empezó a seguirte`,
  [NotificationTypeEnum.MENTION]: (actor) => `${actor} te mencionó en un comentario`,
};

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class NotificationService {
  // private readonly expo: Expo;

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,

    @InjectModel(PushToken.name)
    private readonly pushTokenModel: Model<PushTokenDocument>,

    // Clientes NATS para consultar otros servicios
    @Inject(NATS_SERVICE) private readonly client: ClientProxy
  ) {
    // this.expo = new Expo();
  }

  // ── Push Tokens ────────────────────────────────────────────────────────────

  async registerPushToken(dto: RegisterPushTokenDto): Promise<void> {
    // if (!Expo.isExpoPushToken(dto.token)) {
    //   throw new RpcException({ message: 'Token de push inválido', status: 400 });
    // }

    await this.pushTokenModel.findOneAndUpdate(
      { token: dto.token },
      {
        $set: {
          userId: new Types.ObjectId(dto.userId),
          token: dto.token,
          deviceName: dto.deviceName ?? null,
          active: true,
        },
      },
      { upsert: true },
    );
  }

  async removePushToken(dto: RemovePushTokenDto): Promise<void> {
    await this.pushTokenModel.findOneAndUpdate(
      { token: dto.token },
      { $set: { active: false } },
    );
  }

  // ── Crear notificación + enviar push ──────────────────────────────────────

  async createNotification(dto: CreateNotificationDto): Promise<void> {
    if (dto.actorId === dto.recipientId) return;

    // Evitar likes duplicados del mismo usuario al mismo post
    if (dto.type === NotificationTypeEnum.LIKE) {
      const duplicate = await this.notificationModel.exists({
        recipientId: new Types.ObjectId(dto.recipientId),
        actorId: new Types.ObjectId(dto.actorId),
        type: dto.type,
        postId: dto.postId ? new Types.ObjectId(dto.postId) : null,
      });
      if (duplicate) return;
    }

    const notification = await this.notificationModel.create({
      recipientId: new Types.ObjectId(dto.recipientId),
      actorId: new Types.ObjectId(dto.actorId),
      type: dto.type,
      postId: dto.postId ? new Types.ObjectId(dto.postId) : null,
      commentId: dto.commentId ? new Types.ObjectId(dto.commentId) : null,
    });

    // Push en background — no bloqueamos la respuesta
    this.sendPushNotification(notification).catch(() => { });
  }

  // ── Leer notificaciones ────────────────────────────────────────────────────

  async getNotifications(dto: GetNotificationsDto): Promise<IGetNotificationsResult> {
    const limit = dto.limit ?? 20;

    const filter: any = { recipientId: new Types.ObjectId(dto.userId) };
    if (dto.cursor) filter._id = { $lt: new Types.ObjectId(dto.cursor) };

    const [rawNotifications, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ _id: -1 })
        .limit(limit + 1)
        .lean()
        .exec(),
      this.notificationModel.countDocuments({
        recipientId: new Types.ObjectId(dto.userId),
        status: NotificationStatusEnum.UNREAD,
      }),
    ]);

    const hasMore = rawNotifications.length > limit;
    if (hasMore) rawNotifications.pop();

    // Hidratar actores — una sola query al User Service con todos los IDs únicos
    const actorIds = [...new Set(rawNotifications.map((n) => n.actorId.toString()))];
    const actorMap = await this.hydrateActors(actorIds);

    const notifications: INotificationItem[] = rawNotifications.map((n) => ({
      id: n._id.toString(),
      type: n.type,
      status: n.status,
      actor: actorMap.get(n.actorId.toString()) ?? this.fallbackActor(n.actorId.toString()),
      postId: n.postId?.toString() ?? null,
      commentId: n.commentId?.toString() ?? null,
      createdAt: n.createdAt,
    }));

    return {
      notifications,
      nextCursor: hasMore ? rawNotifications[rawNotifications.length - 1]._id.toString() : null,
      unreadCount,
    };
  }

  async getUnreadCount(dto: GetUnreadCountDto): Promise<IUnreadCountResult> {
    const count = await this.notificationModel.countDocuments({
      recipientId: new Types.ObjectId(dto.userId),
      status: NotificationStatusEnum.UNREAD,
    });
    return { count };
  }

  // ── Marcar como leídas ─────────────────────────────────────────────────────

  async markAsRead(dto: MarkAsReadDto): Promise<void> {
    const filter: any = {
      recipientId: new Types.ObjectId(dto.userId),
      status: NotificationStatusEnum.UNREAD,
    };

    if (dto.notificationIds?.length) {
      filter._id = { $in: dto.notificationIds.map((id) => new Types.ObjectId(id)) };
    }

    await this.notificationModel.updateMany(filter, {
      $set: { status: NotificationStatusEnum.READ },
    });
  }

  // ─── Hidratar actores via NATS ────────────────────────────────────────────
  // Una sola llamada con todos los IDs — evita N queries

  private async hydrateActors(userIds: string[]): Promise<Map<string, INotificationActor>> {
    try {
      const users = await firstValueFrom(
        this.client.send('users.findByIds', { userIds }),
      );

      return new Map(
        (users ?? []).map((u: any) => [
          u.id ?? u._id,
          {
            userId: u.id ?? u._id,
            username: u.username,
            displayName: u.displayName,
            avatarUrl: u.avatarUrl ?? null,
          } as INotificationActor,
        ]),
      );
    } catch {
      return new Map();
    }
  }

  // Actor de fallback si el User Service no responde
  private fallbackActor(userId: string): INotificationActor {
    return {
      userId,
      username: 'usuario',
      displayName: 'Usuario',
      avatarUrl: null,
    };
  }

  // ─── Envío de push via Expo ────────────────────────────────────────────────

  private async sendPushNotification(notification: NotificationDocument): Promise<void> {
    const tokens = await this.pushTokenModel
      .find({ userId: notification.recipientId, active: true })
      .select('token')
      .lean()
      .exec();

    if (!tokens.length) return;

    // Hidratar el displayName del actor para el texto del push
    const actorMap = await this.hydrateActors([notification.actorId.toString()]);
    const actor = actorMap.get(notification.actorId.toString());
    const body = NOTIFICATION_COPY[notification.type](actor?.displayName ?? 'Alguien');

    // const messages: IPushMessage[] = tokens
    //   .filter((t) => Expo.isExpoPushToken(t.token))
    //   .map((t) => ({
    //     to: t.token,
    //     sound: 'default' as const,
    //     body,
    //     data: {
    //       type: notification.type,
    //       postId: notification.postId?.toString() ?? null,
    //       commentId: notification.commentId?.toString() ?? null,
    //     },
    //   }));

    // if (!messages.length) return;

    // const chunks = this.expo.chunkPushNotifications(messages);

    // for (const chunk of chunks) {
    //   try {
    //     const receipts = await this.expo.sendPushNotificationsAsync(chunk);

    //     for (let i = 0; i < receipts.length; i++) {
    //       const receipt = receipts[i];
    //       if (receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
    //         await this.pushTokenModel.findOneAndUpdate(
    //           { token: messages[i].to },
    //           { $set: { active: false } },
    //         );
    //       }
    //     }
    //   } catch { /* continuar con el siguiente chunk */ }
    // }
  }
}