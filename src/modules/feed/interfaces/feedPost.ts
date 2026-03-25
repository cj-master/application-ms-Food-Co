export interface FeedPost {
  postId:    string;
  authorId:  string;
  imageUrl:  string;       // primera imagen del carrusel para el grid
  likesCount: number;
  commentsCount: number;
  cuisineType: string | null;
  tags: string[];
  createdAt: string;
}