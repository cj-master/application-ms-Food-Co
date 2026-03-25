export interface SearchPostResult {
  postId:      string;
  authorId:    string;
  imageUrl:    string | null;
  dishName:    string | null;
  cuisineType: string | null;
  tags:        string[];
  likesCount:  number;
}