import { UPLOAD_CONFIG, UploadResourceEnum } from 'src/modules/upload/enum/upload_config.enum';
import { envs } from 'src/config';

// ─── CDN Base ─────────────────────────────────────────────────────────────────

// Falla en runtime si no está configurado — intencional
const getCdnBase = (): string => {
  const cdn = envs.R2_CDN_URL;
  if (!cdn) throw new Error('CDN_BASE_URL is not defined');
  return cdn.replace(/\/$/, ''); // quitar trailing slash si lo hay
};

// ─── Helper base ──────────────────────────────────────────────────────────────
// 'avatars/userId/uuid.webp' + 'sm' → 'https://cdn.com/avatars/userId/uuid_sm.webp'
// 'avatars/userId/uuid.webp' + ''   → 'https://cdn.com/avatars/userId/uuid.webp'
export function buildVariantUrl(key: string, suffix: string = ''): string {
  const cdn = getCdnBase();
  if (!suffix) return `${cdn}/${key}`;

  const dot = key.lastIndexOf('.');
  const variantKey = `${key.substring(0, dot)}_${suffix}${key.substring(dot)}`;
  return `${cdn}/${variantKey}`;
}

// ─── Helpers por resource ─────────────────────────────────────────────────────
// Construyen todas las variantes de un key según el UPLOAD_CONFIG
// Devuelven null si no hay key — para campos opcionales como logo o cover

export function buildImageUrls(key: string | null, resource: UploadResourceEnum): Record<string, string> | null {
  if (!key) return null;

  const { variants } = UPLOAD_CONFIG[resource];

  return variants.reduce((acc, variant) => {
    const label = variant.suffix || 'original';
    acc[label] = buildVariantUrl(key, variant.suffix);
    return acc;
  }, {} as Record<string, string>);
}

// ─── Shortcuts por recurso ────────────────────────────────────────────────────
// Tipados explícitamente para que cada servicio sepa qué variantes esperar

export function buildAvatarUrls(key: string | null) {
  return buildImageUrls(key, UploadResourceEnum.AVATAR) as
    | { original: string; sm: string }
    | null;
}

export function buildRestaurantLogoUrls(key: string | null) {
  return buildImageUrls(key, UploadResourceEnum.RESTAURANT_LOGO) as
    | { original: string; sm: string }
    | null;
}

export function buildRestaurantCoverUrls(key: string | null) {
  return buildImageUrls(key, UploadResourceEnum.RESTAURANT_COVER) as
    | { original: string; md: string; sm: string }
    | null;
}

export function buildRestaurantGalleryImageUrls(key: string | null) {
  return buildImageUrls(key, UploadResourceEnum.RESTAURANT_GALLERY) as
    | { original: string; md: string; sm: string }
    | null;
}

export function buildPostImageUrls(key: string | null) {
  return buildImageUrls(key, UploadResourceEnum.POST_IMAGE) as
    | { original: string; sm: string }
    | null;
}