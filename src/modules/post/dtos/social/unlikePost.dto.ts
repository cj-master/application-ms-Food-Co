import { IsMongoId } from 'class-validator';

export class UnlikePostDto {
  @IsMongoId()
  userId: string;

  @IsMongoId()
  postId: string;
}