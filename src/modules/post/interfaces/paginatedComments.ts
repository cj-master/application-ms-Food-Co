import { CommentDocument } from '../entities/entities';

export interface PaginatedComments {
  comments: CommentDocument[];
  nextCursor: string | null;
}