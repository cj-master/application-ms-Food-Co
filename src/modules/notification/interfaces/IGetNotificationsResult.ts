// ─── Respuesta paginada de notificaciones ─────────────────────────────────────
import { INotificationItem } from './INotificationItem';

export interface IGetNotificationsResult {
  notifications: INotificationItem[];
  nextCursor:    string | null;
  unreadCount:   number;
}