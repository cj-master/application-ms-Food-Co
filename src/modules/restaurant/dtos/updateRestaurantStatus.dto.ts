// ─── Publicar / cambiar estado ────────────────────────────────────────────────
import { IsEnum, IsMongoId } from 'class-validator';
import { RestaurantStatusEnum } from '../enum/enum';

export class UpdateRestaurantStatusDto {
  @IsMongoId()
  id: string;

  @IsEnum(RestaurantStatusEnum)
  status: RestaurantStatusEnum;
}