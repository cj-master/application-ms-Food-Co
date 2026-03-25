// ─── Payload del evento user.followed ────────────────────────────────────────

export interface IUserFollowedPayload {
  followerId:  string;   // quien siguió — es el actor
  followingId: string;   // quien fue seguido — recibe la notificación
}