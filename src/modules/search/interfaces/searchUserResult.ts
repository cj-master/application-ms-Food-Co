export interface SearchUserResult {
  userId:      string;
  username:    string;
  displayName: string;
  avatarUrl:   string | null;
  followersCount: number;
  isVerified:  boolean;
}