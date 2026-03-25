// ─── Mensaje push interno ─────────────────────────────────────────────────────
import { NotificationTypeEnum } from '../enum/enum';

export interface IPushMessage {
  to: string;            // ExponentPushToken[xxx]
  sound: 'default';
  body: string;
  data: {
    type: NotificationTypeEnum;
    postId: string | null;
    commentId: string | null;
  };
}