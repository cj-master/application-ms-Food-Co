import { PostDocument } from '../entities/post.entitie';

export interface PaginatedPosts {
  posts: PostDocument[];
  nextCursor: string | null;
}