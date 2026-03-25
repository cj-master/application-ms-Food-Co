import { IsArray, IsMongoId, ValidateNested } from 'class-validator';
import { MenuSectionDto } from './createRestaurant.dto';
import { Type } from 'class-transformer';

export class SetMenuStructuredDto {
  @IsMongoId()
  restaurantId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuSectionDto)
  sections: MenuSectionDto[];
}
