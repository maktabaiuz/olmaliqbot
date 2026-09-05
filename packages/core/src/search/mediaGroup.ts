/**
 * Ko'p-rasmli yozuvlar (masalan "uy arendaga") uchun Telegram media-group
 * ("suriladigan albom") payloadini quradi. Framework-agnostik — grammY
 * turlariga bog'liq emas, chunki bir xil mantiq guruh va DM handlerlarida
 * takrorlanadi (@kimbor/core orqali umumiy joydan olinadi).
 *
 * Telegram cheklovi: bitta media-group'da eng ko'pi bilan 10 ta element
 * bo'lishi mumkin.
 */
const MAX_MEDIA_GROUP_ITEMS = 10;

export interface MediaGroupPhotoItem {
  type: 'photo';
  media: string;
}

export function buildMediaGroupItems(photoUrls: string[] | null | undefined): MediaGroupPhotoItem[] {
  if (!Array.isArray(photoUrls) || photoUrls.length === 0) return [];
  return photoUrls
    .filter((url): url is string => typeof url === 'string' && url.length > 0)
    .slice(0, MAX_MEDIA_GROUP_ITEMS)
    .map((url) => ({ type: 'photo' as const, media: url }));
}
