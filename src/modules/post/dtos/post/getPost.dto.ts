// ─── Obtener post por ID ──────────────────────────────────────────────────────
import { IsMongoId } from 'class-validator';

export class GetPostDto {
  @IsMongoId()
  postId: string;
}
