// ─── Eliminar post ────────────────────────────────────────────────────────────
import { IsMongoId } from 'class-validator';

export class DeletePostDto {
  @IsMongoId()
  authorId: string;              // para verificar que es el dueño del post

  @IsMongoId()
  postId: string;
}
