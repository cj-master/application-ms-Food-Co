// Verifica likes de múltiples posts de una vez
import { IsMongoId } from 'class-validator';

// Útil cuando el feed carga 20 posts y necesita saber cuáles ya dio like el usuario
export class CheckLikesBulkDto {
  @IsMongoId()
  userId: string;

  @IsMongoId({ each: true })
  postIds: string[];
}