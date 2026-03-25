import { IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';

export class GetCommentRepliesDto {
  @IsMongoId()
  commentId: string;              // parentId del que queremos las respuestas

  @IsOptional()
  @IsMongoId()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number;
}