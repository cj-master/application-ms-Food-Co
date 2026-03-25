// ─── Payload del evento social.post.liked ────────────────────────────────────

export interface IPostLikedPayload {
  postId:   string;
  actorId:  string;   // quien dio like
  authorId: string;   // autor del post — recibe la notificación
}