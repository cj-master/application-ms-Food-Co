import { UserStatusEnum } from "../../enum/userStatus.enum";
import { IsEnum, IsMongoId } from "class-validator";

export class UpdateUserStatusDto {
  @IsMongoId()
  id: string;

  @IsEnum(UserStatusEnum)
  status: UserStatusEnum;
}