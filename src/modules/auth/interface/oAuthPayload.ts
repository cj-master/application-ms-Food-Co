import { AuthProviderEnum } from '../enum/enum';

export interface OAuthPayload {
  provider: AuthProviderEnum;
  providerId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  accessToken?: string;
  tokenExpiresAt?: Date;
  ipAddress: string;
  userAgent: string;
}