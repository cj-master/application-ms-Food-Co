import { FeedPost } from './feedPost';

export interface FeedResult {
  posts: FeedPost[];
  nextCursor: string | null;
}