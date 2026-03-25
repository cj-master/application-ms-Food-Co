export interface IPresignedUrlResult {
  uploadId:  string;   // ID interno del upload
  uploadUrl: string;   // URL para hacer PUT directo a R2
  key:       string;   // key base en R2 — para guardar en DB y eliminar después
  expiresIn: number;   // segundos hasta que expire (900 = 15 min)
}