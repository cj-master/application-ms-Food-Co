import { IsMongoId } from 'class-validator';

export class DeleteCommentDto {
  @IsMongoId()
  authorId: string;               // para verificar que es el dueño

  @IsMongoId()
  commentId: string;
}