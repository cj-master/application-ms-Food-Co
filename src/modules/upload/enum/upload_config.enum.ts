// ─── Tipo de recurso ──────────────────────────────────────────────────────────
// Define el contexto del upload — determina el path en R2 y las dimensiones
export enum UploadResourceEnum {
  AVATAR = 'avatar',
  POST_IMAGE = 'post_image',
  RESTAURANT_LOGO = 'restaurant_logo',
  RESTAURANT_COVER = 'restaurant_cover',
  RESTAURANT_GALLERY = 'restaurant_gallery',
}

// ─── Configuración por tipo de recurso ────────────────────────────────────────
// Dimensiones en píxeles — el Worker de Cloudflare las aplica al procesar
export const UPLOAD_CONFIG: Record<UploadResourceEnum, {
  path: string;
  maxSizeMB: number;
  variants: {
    suffix: string;       // '' = original, 'sm', 'md', 'lg'
    width: number;
    height: number;
  }[];
}> = {
  [UploadResourceEnum.AVATAR]: {
    path: 'avatars',
    maxSizeMB: 5,
    variants: [
      { suffix: '', width: 400, height: 400 },
      { suffix: 'sm', width: 80, height: 80 },
    ],
  },
  [UploadResourceEnum.POST_IMAGE]: {
    path: 'posts',
    maxSizeMB: 10,
    variants: [
      { suffix: '', width: 1080, height: 1350 },
      { suffix: 'sm', width: 300, height: 300 },
    ],
  },
  [UploadResourceEnum.RESTAURANT_LOGO]: {
    path: 'restaurants/logos',
    maxSizeMB: 5,
    variants: [
      { suffix: '', width: 400, height: 400 },
      { suffix: 'sm', width: 80, height: 80 },
    ],
  },
  [UploadResourceEnum.RESTAURANT_COVER]: {
    path: 'restaurants/covers',
    maxSizeMB: 10,
    variants: [
      { suffix: '', width: 1200, height: 630 },
      { suffix: 'md', width: 800, height: 420 },
      { suffix: 'sm', width: 400, height: 210 },
    ],
  },
  [UploadResourceEnum.RESTAURANT_GALLERY]: {
    path: 'restaurants/gallery',
    maxSizeMB: 10,
    variants: [
      { suffix: '', width: 1080, height: 1080 },
      { suffix: 'md', width: 600, height: 600 },
      { suffix: 'sm', width: 300, height: 300 },
    ],
  },
}