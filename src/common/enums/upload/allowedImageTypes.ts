export const ALLOWED_IMAGE_TYPES = {
  'image/jpeg':  'jpg',
  'image/jpg':   'jpg',
  'image/png':   'png',
  'image/webp':  'webp',
  'image/gif':   'gif',
  'image/avif':  'avif',
  'image/heic':  'heic',
} as const;

export type AllowedMimeType = keyof typeof ALLOWED_IMAGE_TYPES;