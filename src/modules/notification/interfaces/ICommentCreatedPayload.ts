// ─── Payload del evento social.comment.created ────────────────────────────────
// Define exactamente qué campos debe enviar el Social Service

export interface ICommentCreatedPayload {
  postId:          string;
  postAuthorId:    string;   // autor del post — recibe notif de COMMENT
  actorId:         string;   // quien comentó
  commentId:       string;
  parentId:        string | null;       // null si es comentario raíz
  parentAuthorId:  string | null;       // autor del comentario padre — recibe notif de REPLY
  mentionedUserId: string | null;       // usuario mencionado — recibe notif de MENTION
}