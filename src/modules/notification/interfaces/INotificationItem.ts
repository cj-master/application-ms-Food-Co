import { NotificationStatusEnum, NotificationTypeEnum } from '../enum/enum';
import { INotificationActor } from './INotificationActor';

export interface INotificationItem {
  id:          string;
  type:        NotificationTypeEnum;
  status:      NotificationStatusEnum;
  actor:       INotificationActor;   // datos del usuario que generó la notificación
  postId:      string | null;
  commentId:   string | null;
  createdAt:   Date;
}