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

/**
 * Telegram Rich Messages (Bot API 10.1+, `sendRichMessage`) uchun HTML
 * fragmenti quradi — bir nechta rasmni HAQIQIY suriladigan (swipeable)
 * albom sifatida, VA shu bilan bir vaqtda tugmalar (reply_markup) bilan
 * BITTA postda birlashtirish uchun. Bu `sendMediaGroup`dan farqli — unga
 * tugma umuman biriktirib bo'lmaydi (Telegram'ning qat'iy cheklovi), lekin
 * `sendRichMessage`ning o'zi `reply_markup`ni to'liq qo'llab-quvvatlaydi.
 *
 * Rasm sintaksisi: `<tg-slideshow><img src="..."/>...</tg-slideshow>` —
 * maxsus HTML tegi, faqat Rich HTML formatida tan olinadi (oddiy
 * parse_mode=HTML'da emas). Bitta rasm bo'lsa slideshow o'ramisiz, alohida
 * `<img>` sifatida qo'shiladi (Telegram'ning kamida 2 element talab
 * qiladigan eski sendMediaGroup'idan farqli, bu yerda 1 tasi ham xavfsiz).
 */
export function buildSlideshowHtml(photoUrls: string[] | null | undefined, baseUrl?: string): string {
  const items = buildMediaGroupItems(photoUrls, baseUrl);
  if (items.length === 0) return '';
  const imgTags = items.map((p) => `<img src="${p.media}"/>`).join('');
  return items.length === 1 ? imgTags : `<tg-slideshow>${imgTags}</tg-slideshow>`;
}
