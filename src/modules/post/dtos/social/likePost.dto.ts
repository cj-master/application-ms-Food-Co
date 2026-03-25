import { IsMongoId } from 'class-validator';

export class LikePostDto {
  @IsMongoId()
  userId: string;

  @IsMongoId()
  postId: string;
}