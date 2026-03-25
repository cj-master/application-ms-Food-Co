// ─── Resultado de múltiples presigned URLs (carrusel) ─────────────────────────
import { IPresignedUrlResult } from './IPresignedUrlResult';

export interface IMultiplePresignedUrlResult {
  postId:   string;                  // draft postId al que pertenecen
  uploads:  IPresignedUrlResult[];   // una entrada por imagen del carrusel
}
