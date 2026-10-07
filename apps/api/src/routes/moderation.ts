import fs from 'fs';
import path from 'path';
import { db } from '@kimbor/db';
import { containsProfanity, reserveGeminiCallSlot } from '@kimbor/core';
import { UPLOADS_DIR } from '../uploadsPath';

/**
 * Aqlli nazorat (2026-10) — foydalanuvchi qo'shgan HAR qanday e'lon/ma'lumot
 * (ijara, usta/do'kon nomzodi) shu bitta qoidadan o'tadi.
 *
 *   ok          → darhol chiqadi
 *   suspicious  → chiqmaydi, admin "Shubhali e'lonlar"da ko'rib chiqadi
 *   spam        → rad etiladi, egasiga sababi aytiladi
 *
 * "Jim turish" tamoyili: AI ishlamasa yoki ishonmasa — avtomatik
 * chiqarilmaydi, odam ko'radi (lekin oddiy qoidalardan o'tgan toza e'lon
 * AI'siz ham chiqadi, aks holda AI uzilishida hamma narsa to'xtab qoladi).
 */
export type Verdict = 'ok' | 'suspicious' | 'spam';
export interface ModerationResult {
  verdict: Verdict;
  reasons: string[];
}

export interface Submission {
  kind: 'rental' | 'candidate';
  title: string;
  description?: string | null;
  phone: string; // faqat raqamlar
  ownerTelegramId: bigint;
  price?: number | null;
  currency?: 'USD' | 'UZS' | null;
  term?: 'KUNLIK' | 'OYLIK' | 'YILLIK' | null;
  rooms?: number | null;
  photos?: string[];
  excludeListingId?: string;
}

const AD_PATTERNS = /(kredit|zaym|qarz beramiz|kazino|casino|stavka|1xbet|betting|daromad|pul ishlash|ish bor|vakansiya|obuna bo'ling|kanalimiz|t\.me\/|https?:\/\/|@\w{4,}|forex|kripto|crypto)/i;

/** Olmaliq uchun oylik ijara narxi (USD) — keng, faqat aniq bema'nilikni ushlaydi. */
function priceProblem(s: Submission): string | null {
  if (s.kind !== 'rental' || !s.price) return null;
  const usd = s.currency === 'UZS' ? s.price / 12800 : s.price;
  const monthly = s.term === 'KUNLIK' ? usd * 30 : s.term === 'YILLIK' ? usd / 12 : usd;
  if (monthly < 15) return `Narx juda past ko'rinadi (${s.price} ${s.currency === 'UZS' ? "so'm" : '$'})`;
  if (monthly > 5000) return `Narx juda baland ko'rinadi (${s.price} ${s.currency === 'UZS' ? "so'm" : '$'})`;
  return null;
}

async function historyProblems(s: Submission): Promise<{ spam: string[]; suspicious: string[] }> {
  const spam: string[] = [];
  const suspicious: string[] = [];
  const since = new Date(Date.now() - 30 * 86400_000);
  const phoneVariants = [s.phone, `+${s.phone}`, `+998${s.phone.slice(-9)}`, s.phone.slice(-9)];
  const samePhone = await db.listing.findMany({
    where: { phone: { in: phoneVariants }, createdAt: { gte: since }, ...(s.excludeListingId ? { NOT: { id: s.excludeListingId } } : {}) },
    select: { name: true, ownerTelegramId: true, status: true, moderationStatus: true },
  });
  if (samePhone.some((l) => l.moderationStatus === 'rejected')) suspicious.push('Shu raqamdan avval rad etilgan e\'lon bor');
  if (samePhone.length >= 5) suspicious.push(`Bitta raqamdan 30 kunda ${samePhone.length} ta e'lon (rieltor bo'lishi mumkin)`);
  if (samePhone.some((l) => l.ownerTelegramId != null && l.ownerTelegramId !== s.ownerTelegramId)) suspicious.push("Bu raqamni boshqa foydalanuvchi ham ishlatgan");
  if (samePhone.some((l) => l.name.toLowerCase() === s.title.toLowerCase() && l.status === 'ACTIVE')) spam.push("Xuddi shunday e'lon allaqachon joylangan");
  const reports = await db.correction.count({ where: { listing: { phone: { in: phoneVariants } }, createdAt: { gte: since } } });
  if (reports >= 2) suspicious.push(`Shu raqam bo'yicha ${reports} ta shikoyat tushgan`);
  return { spam, suspicious };
}

/** Gemini: matn + (bo'lsa) birinchi 2 rasm. JSON: {ok, problems[]} */
async function aiReview(s: Submission): Promise<{ ok: boolean; problems: string[] } | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'mock_key' || !reserveGeminiCallSlot()) return null;
  const parts: any[] = [
    {
      text:
        `You moderate a local classifieds app in Olmaliq, Uzbekistan. Check this user submission (${s.kind === 'rental' ? 'property rental ad' : 'local business/craftsman contact'}).\n` +
        `TITLE: ${s.title}\nDESCRIPTION: ${s.description || '-'}\n` +
        (s.kind === 'rental' ? `PRICE: ${s.price} ${s.currency} per ${s.term}, ROOMS: ${s.rooms ?? '-'}\n` : '') +
        `Problems to detect: spam or advertising of something else, scam signs, offensive text, text unrelated to the category` +
        (s.kind === 'rental' ? `, photos that are NOT of a real apartment/house/room/office (e.g. screenshots, memes, logos, people only, random objects)` : '') +
        `. Answer in Uzbek Latin, short. Return JSON {"ok": boolean, "problems": string[]}. ok=true only if nothing problematic.`,
    },
  ];
  for (const url of (s.photos || []).slice(0, 2)) {
    const m = url.match(/^\/api\/uploads\/listings\/([\w-]+\.(jpg|png|webp))$/);
    if (!m) continue;
    try {
      const buf = await fs.promises.readFile(path.join(UPLOADS_DIR, 'listings', m[1]));
      if (buf.length > 4_000_000) continue;
      parts.push({ inlineData: { mimeType: m[2] === 'jpg' ? 'image/jpeg' : `image/${m[2]}`, data: buf.toString('base64') } });
    } catch {
      /* rasm topilmadi */
    }
  }
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 9000);
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent', {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: { type: 'OBJECT', properties: { ok: { type: 'BOOLEAN' }, problems: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['ok', 'problems'] },
          maxOutputTokens: 300,
          temperature: 0,
        },
      }),
      signal: abort.signal,
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    const parsed = JSON.parse(j.candidates?.[0]?.content?.parts?.[0]?.text || 'null');
    if (typeof parsed?.ok !== 'boolean') return null;
    return { ok: parsed.ok, problems: Array.isArray(parsed.problems) ? parsed.problems.slice(0, 4).map(String) : [] };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function moderateSubmission(s: Submission): Promise<ModerationResult> {
  const spam: string[] = [];
  const suspicious: string[] = [];
  const text = `${s.title} ${s.description || ''}`;
  if (containsProfanity(text)) spam.push("Matnda nojo'ya so'zlar bor");
  if (AD_PATTERNS.test(s.description || '')) suspicious.push('Izohda reklama yoki havola bor');
  const pp = priceProblem(s);
  if (pp) suspicious.push(pp);
  const h = await historyProblems(s);
  spam.push(...h.spam);
  suspicious.push(...h.suspicious);
  if (spam.length) return { verdict: 'spam', reasons: spam };

  const ai = await aiReview(s);
  if (ai && !ai.ok) suspicious.push(...(ai.problems.length ? ai.problems.map((p) => `AI: ${p}`) : ['AI: shubhali deb baholadi']));
  return { verdict: suspicious.length ? 'suspicious' : 'ok', reasons: suspicious };
}

type OwnerListing = { id: string; name: string; ownerTelegramId: bigint | null; source: string; type: string };

/**
 * Egasiga xabar — e'lon QAYSI botdan kelgan bo'lsa, o'sha bot orqali
 * (2026-10-08: @olmaliq_bot chatida joylangan e'lonning rad xabari
 * @uz11_bot orqali ketib, egasiga umuman yetmagan edi — Telegram faqat
 * foydalanuvchi ochgan botga yozishga ruxsat beradi). Ilovadan kelganlar
 * uchun ikkala bot ham sinab ko'riladi. true — xabar haqiqatan yetdi.
 */
async function sendToOwner(l: OwnerListing, text: string, buttons: (token: 'main' | 'user') => any[][]): Promise<boolean> {
  if (!l.ownerTelegramId) return false;
  const order: ('main' | 'user')[] = l.source === 'bot_chat' ? ['main'] : ['user', 'main'];
  for (const which of order) {
    const token = which === 'main' ? process.env.BOT_TOKEN : process.env.USER_BOT_TOKEN;
    if (!token) continue;
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: l.ownerTelegramId.toString(), text, parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons(which) } }),
      });
      if (res.ok) return true;
    } catch {
      /* keyingi botni sinaymiz */
    }
  }
  return false;
}

const APP_URL = `https://${process.env.DOMAIN || 'olmaliq.online'}/app/`;
const escHtml = (x: string) => x.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!);

/** Rad etilganda — aniq sabab, nimani to'g'rilash kerakligi va tuzatish tugmasi. */
export async function notifyOwnerRejected(l: OwnerListing, reason: string): Promise<boolean> {
  const rental = l.type === 'ARENDA';
  const tips = rental
    ? "• uy turi va xonalar soni\n• haqiqiy oylik narx\n• uy joylashgan mahalla\n• o'zingizning ishlaydigan raqamingiz\n• uyning o'z rasmlari (internetdan olingan emas)"
    : "• ismingiz yoki do'kon/ustaxona nomi\n• aniq sohangiz (masalan: santexnik, novvoyxona)\n• ishlaydigan telefon raqamingiz\n• qaysi mahallada ishlaysiz\n• ish vaqtingiz";
  const text =
    `Assalomu alaykum! 🙏\n\n«${escHtml(l.name)}» ${rental ? "e'loningizni" : "ma'lumotingizni"} ko'rib chiqdik, lekin hozircha joylay olmadik.\n\n` +
    `<b>Sababi:</b> ${escHtml(reason)}\n\n` +
    `Bu ayblov emas — odamlar faqat aniq va ishonchli ma'lumot ko'rishini xohlaymiz. Iltimos, quyidagilar to'g'ri ekanini tekshiring:\n${tips}\n\n` +
    `Tuzatib yuborsangiz, qayta ko'rib chiqamiz 😊`;
  return sendToOwner(l, text, (which) =>
    which === 'main'
      ? [[{ text: '✏️ Tuzatib qayta yuborish', callback_data: `fix:${l.id}` }]]
      : rental
        ? [[{ text: "✏️ E'lonni tahrirlash", web_app: { url: `${APP_URL}#/rent/edit/${l.id}` } }]]
        : []
  );
}

/** Tasdiqlanganda — egasiga quvonchli xabar. */
export async function notifyOwnerApproved(l: OwnerListing): Promise<boolean> {
  const rental = l.type === 'ARENDA';
  const text = rental
    ? `Xushxabar! 🎉\n\n«${escHtml(l.name)}» e'loningiz tekshiruvdan o'tdi va endi hamma ko'radi. Ijarachilar sizga to'g'ridan-to'g'ri qo'ng'iroq qiladi — maklersiz.\n\nUy berilgach, e'lonni yopib qo'yishni unutmang 🙂`
    : `Xushxabar! 🎉\n\n«${escHtml(l.name)}» Olmaliq bazasiga qo'shildi. Endi kimdir sizning xizmatingizni qidirsa, bot sizni taklif qiladi. Omad! 🙌`;
  return sendToOwner(l, text, () => [[{ text: '👀 Ilovada ko\'rish', web_app: { url: `${APP_URL}?listing=${l.id}` } }]]);
}
