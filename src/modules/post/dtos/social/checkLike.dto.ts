import { IsMongoId } from 'class-validator';

export class CheckLikeDto {
  @IsMongoId()
  userId: string;

  @IsMongoId()
  postId: string;
}