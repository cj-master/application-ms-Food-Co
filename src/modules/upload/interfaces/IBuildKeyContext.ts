// ─── Contexto interno para construir el key en R2 ─────────────────────────────
import { UploadResourceEnum } from '../enum/enum';

export interface IBuildKeyContext {
  resource:      UploadResourceEnum;
  ownerId:       string;
  uploadId:      string;
  postId?:       string;   // solo POST_IMAGE
  restaurantId?: string;   // solo RESTAURANT_*
  order?:        number;   // solo POST_IMAGE (0-4)
}