export const MEDIA_EVENTS = {
  PROCESS: 'media.process',
  PROCESSED: (resource: string) => `media.processed.${resource}`,
  DELETED: (resource: string) => `media.deleted.${resource}`,  // 👈
} as const;