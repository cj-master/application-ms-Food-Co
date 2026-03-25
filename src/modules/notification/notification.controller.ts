import { RegisterPushTokenDto, RemovePushTokenDto, GetNotificationsDto, MarkAsReadDto, GetUnreadCountDto } from './dtos/dtos';
import { IPostLikedPayload, ICommentCreatedPayload, IUserFollowedPayload } from './interfaces/interfaces';
import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import { NotificationTypeEnum } from './enum/enum';
import { Controller } from '@nestjs/common';


@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  // ── Push Tokens ────────────────────────────────────────────────────────────

  // La app llama esto al iniciar sesión o cuando Expo entrega un nuevo token
  @MessagePattern('notifications.token.register')
  registerPushToken(@Payload() dto: RegisterPushTokenDto) {
    return this.notificationService.registerPushToken(dto);
  }

  // La app llama esto al cerrar sesión
  @MessagePattern('notifications.token.remove')
  removePushToken(@Payload() dto: RemovePushTokenDto) {
    return this.notificationService.removePushToken(dto);
  }

  // ── Queries ────────────────────────────────────────────────────────────────
  // Devuelve: IGetNotificationsResult { notifications, nextCursor, unreadCount }
  @MessagePattern('notifications.list')
  getNotifications(@Payload() dto: GetNotificationsDto) {
    return this.notificationService.getNotifications(dto);
  }

  // Devuelve: IUnreadCountResult { count }
  @MessagePattern('notifications.unread.count')
  getUnreadCount(@Payload() dto: GetUnreadCountDto) {
    return this.notificationService.getUnreadCount(dto);
  }

  @MessagePattern('notifications.read')
  markAsRead(@Payload() dto: MarkAsReadDto) {
    return this.notificationService.markAsRead(dto);
    // Sin notificationIds → marca todas como leídas
  }

  // ── Eventos de otros servicios ─────────────────────────────────────────────

  @EventPattern('social.post.liked')
  onPostLiked(@Payload() payload: IPostLikedPayload) {
    return this.notificationService.createNotification({
      recipientId: payload.authorId,
      actorId: payload.actorId,
      type: NotificationTypeEnum.LIKE,
      postId: payload.postId,
    });
  }

  @EventPattern('social.comment.created')
  onCommentCreated(@Payload() payload: ICommentCreatedPayload) {
    const notifications: Promise<void>[] = [];

    // Notificar al autor del POST si es comentario raíz
    if (!payload.parentId) {
      notifications.push(
        this.notificationService.createNotification({
          recipientId: payload.postAuthorId,
          actorId: payload.actorId,
          type: NotificationTypeEnum.COMMENT,
          postId: payload.postId,
          commentId: payload.commentId,
        }),
      );
    }

    // Notificar al autor del COMENTARIO PADRE si es una respuesta
    if (payload.parentId && payload.parentAuthorId) {
      notifications.push(
        this.notificationService.createNotification({
          recipientId: payload.parentAuthorId,  // corregido — antes usaba parentId como recipientId
          actorId: payload.actorId,
          type: NotificationTypeEnum.REPLY,
          postId: payload.postId,
          commentId: payload.commentId,
        }),
      );
    }

    // Notificar al usuario mencionado
    if (payload.mentionedUserId) {
      notifications.push(
        this.notificationService.createNotification({
          recipientId: payload.mentionedUserId,
          actorId: payload.actorId,
          type: NotificationTypeEnum.MENTION,
          postId: payload.postId,
          commentId: payload.commentId,
        }),
      );
    }

    return Promise.all(notifications);
  }

  @EventPattern('user.followed')
  onUserFollowed(@Payload() payload: IUserFollowedPayload) {
    return this.notificationService.createNotification({
      recipientId: payload.followingId,
      actorId: payload.followerId,
      type: NotificationTypeEnum.FOLLOW,
    });
  }
}