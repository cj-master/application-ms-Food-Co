export interface UpdateProfilePayload {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  socialLinks?: {
    website?: string | null;
    instagram?: string | null;
    tiktok?: string | null;
  };
}