import { IsMongoId, IsUrl } from 'class-validator';

export class SetMenuLinkDto {
  @IsMongoId()
  restaurantId: string;

  @IsUrl()
  url: string;
}