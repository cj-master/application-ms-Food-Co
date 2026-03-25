import { IsEnum, IsMongoId, IsNotEmpty, IsString } from 'class-validator';
import { UploadResourceEnum } from '../enum/enum';

export class ConfirmUploadDto {
  @IsMongoId()
  entityId: string;          // restaurantId, userId, postId según el recurso

  @IsEnum(UploadResourceEnum)
  resource: UploadResourceEnum;

  @IsString()
  @IsNotEmpty()
  key: string;               // key en R2 del original ya subido
}