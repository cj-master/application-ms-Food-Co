import { IsMongoId, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
  @IsMongoId()
  authorId: string;

  @IsMongoId()
  postId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  text: string;

  @IsOptional()
  @IsMongoId()
  parentId?: string;              // si viene → es una respuesta

  @IsOptional()
  @IsMongoId()
  mentionedUserId?: string;
}