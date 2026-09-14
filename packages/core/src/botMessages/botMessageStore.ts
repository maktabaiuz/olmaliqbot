import { db } from '@kimbor/db';

export type BotMessageCategory = 'REPLY' | 'EMERGENCY' | 'OTHER';
export type BotMessageLang = 'lotin' | 'kirill' | 'rus';

interface CachedMessage {
  key: string;
  category: BotMessageCategory;
  textLatin: string;
  textCyrillic: string;
  textRussian: string;
}

// Admin panelida tahrirlangan shablon matnlari SHU YERDAN o'qiladi —
// 2026-09'gacha bot bu jadvalni umuman o'qimasdi (admin tahrirlagan matn
// hech qachon foydalanuvchiga bormasdi). Har chaqiruvda bazaga
// murojaat qilmaslik uchun 60 soniyaga keshlanadi (bot va admin-panel
// alohida jarayon/konteyner bo'lgani uchun — tahrirlash natijasi
// eng ko'pi bilan 1 daqiqada real xabarlarga ta'sir qiladi).
let cache: CachedMessage[] | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 60_000;

async function loadAll(): Promise<CachedMessage[]> {
  if (cache && cacheExpiresAt > Date.now()) return cache;
  try {
    const rows = await db.botMessage.findMany();
    cache = rows.map((r) => ({
      key: r.key,
      category: r.category as BotMessageCategory,
      textLatin: r.textLatin,
      textCyrillic: r.textCyrillic,
      textRussian: r.textRussian,
    }));
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  } catch (err) {
    console.error('Failed to load bot messages from DB, keeping previous cache:', err);
    if (!cache) cache = [];
  }
  return cache;
}

const LANG_FIELD: Record<BotMessageLang, keyof CachedMessage> = {
  lotin: 'textLatin',
  kirill: 'textCyrillic',
  rus: 'textRussian',
};

/**
 * Bazadagi shablon matnini o'qiydi. Topilmasa, bo'sh bo'lsa, yoki bazaga
 * ulanib bo'lmasa — HAR DOIM `fallback` qaytariladi (bot xatolik tufayli
 * javobsiz qolib qolmasligi uchun — xavfsizlik-kritik favqulodda
 * xabarlarda ayniqsa muhim).
 */
export async function getBotMessageText(key: string, lang: BotMessageLang, fallback: string): Promise<string> {
  const all = await loadAll();
  const row = all.find((r) => r.key === key);
  if (!row) return fallback;
  const text = row[LANG_FIELD[lang]] as string;
  return text && text.trim().length > 0 ? text : fallback;
}

/**
 * Shablon qatorlarini tokenlarga (`{token}`) qarab render qiladi. Har bir
 * qator o'zida kamida bitta token bo'lsa VA shu token(lar)ning barchasi
 * qiymatga ega bo'lmasa — BUTUN QATOR chiqarib tashlanadi (masalan ish
 * vaqti kiritilmagan bo'lsa, "🕐 {ish_vaqti}" qatori umuman ko'rinmaydi).
 * Tokensiz (static) qatorlar har doim qoladi. Admin qatorlar tartibini
 * xohlagancha o'zgartirishi mumkin — tartib shu yerda hech qanday tarzda
 * qattiq belgilanmagan.
 */
export function renderLineTemplate(template: string, values: Record<string, string | null | undefined>): string {
  const lines = template.split('\n');
  const outLines: string[] = [];
  for (const line of lines) {
    const tokensInLine = [...line.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    if (tokensInLine.length === 0) {
      outLines.push(line);
      continue;
    }
    const allPresent = tokensInLine.every((t) => {
      const v = values[t];
      return v !== undefined && v !== null && String(v).trim().length > 0;
    });
    if (!allPresent) continue;
    let rendered = line;
    for (const t of tokensInLine) {
      rendered = rendered.split(`{${t}}`).join(String(values[t]));
    }
    outLines.push(rendered);
  }
  return outLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
