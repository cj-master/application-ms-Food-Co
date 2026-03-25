// ─── Notificación hidratada (lo que ve el cliente) ────────────────────────────

export interface INotificationActor {
  userId:      string;
  username:    string;
  displayName: string;
  avatarUrl:   string | null;
}
