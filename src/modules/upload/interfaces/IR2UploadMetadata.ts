// ─── Metadata que se envía a R2 para que el Worker procese ───────────────────
// El Worker de Cloudflare lee estos headers al recibir el archivo
import { UploadResourceEnum } from '../enum/enum';

export interface IR2UploadMetadata {
  'x-original-width':   string;
  'x-original-height':  string;
  'x-thumbnail-width':  string;
  'x-thumbnail-height': string;
  'x-resource-type':    UploadResourceEnum;
  'x-upload-id':        string;
}