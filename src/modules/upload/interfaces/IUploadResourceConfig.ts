import { IImageDimensions } from './IImageDimensions';

export interface IUploadResourceConfig {
  path:       string;            // prefijo en R2, ej: 'avatars', 'posts'
  maxSizeMB:  number;            // tamaño máximo que acepta el endpoint
  original:   IImageDimensions;  // dimensiones de la imagen procesada
  thumbnail:  IImageDimensions;  // dimensiones del thumbnail generado
}