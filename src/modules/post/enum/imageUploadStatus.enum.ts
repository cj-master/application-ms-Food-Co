export enum ImageUploadStatusEnum {
  PENDING   = 'pending',    // presigned URL generada, esperando upload
  UPLOADED  = 'uploaded',   // R2 confirmó la recepción
  FAILED    = 'failed',     // falló el upload
}