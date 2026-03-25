// ─── Obtener múltiples posts por IDs (para el Feed Service) ──────────────────
import { ArrayMaxSize, ArrayMinSize, IsArray, IsMongoId } from 'class-validator';

export class GetPostsByIdsDto {
  @IsArray()
  @IsMongoId({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  postIds: string[];
}