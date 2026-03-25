export interface JwtPayload {
  sub: string;        // userId
  username: string;
  role: string;
  jti: string;        // JWT ID único por sesión
}