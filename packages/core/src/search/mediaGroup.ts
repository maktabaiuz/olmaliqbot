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

/**
 * `photoUrls` bazada NISBIY yo'l sifatida saqlanadi (masalan
 * "/api/uploads/listings/xxx.jpg") — admin panelidagi <img> teglar uchun shu
 * yetarli (brauzer joriy origin'ga nisbatan hal qiladi). LEKIN Telegram'ning
 * sendMediaGroup/sendPhoto'siga faqat TO'LIQ (https://...) URL yoki file_id
 * berish mumkin — nisbiy yo'l berilsa Telegram uni yuklab ololmaydi. Shuning
 * uchun bot tomonida `baseUrl` (masalan https://olmaliq.online) beriladi va
 * shu yerda nisbiy yo'llarga qo'shib qo'yiladi. Allaqachon to'liq (http/https
 * bilan boshlanadigan) URL bo'lsa, o'zgarishsiz qoldiriladi.
 */
export function buildMediaGroupItems(
  photoUrls: string[] | null | undefined,
  baseUrl?: string
): MediaGroupPhotoItem[] {
  if (!Array.isArray(photoUrls) || photoUrls.length === 0) return [];
  const trimmedBase = (baseUrl || '').replace(/\/$/, '');
  return photoUrls
    .filter((url): url is string => typeof url === 'string' && url.length > 0)
    .slice(0, MAX_MEDIA_GROUP_ITEMS)
    .map((url) => ({
      type: 'photo' as const,
      media: /^https?:\/\//i.test(url) ? url : `${trimmedBase}${url}`,
    }));
}
