export enum PostStatusEnum {
  ACTIVE  = 'active',
  DELETED = 'deleted',    // borrado por el usuario
  REMOVED = 'removed',    // removido por admin (moderación)
  DRAFT   = 'draft',      // subió imágenes pero no terminó de publicar
}