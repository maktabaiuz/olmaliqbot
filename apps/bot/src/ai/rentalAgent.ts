import { Context, InlineKeyboard } from 'grammy';
import crypto from 'crypto';
import { db } from '@kimbor/db';
import { normalizeText, extractRentalFilters, reserveGeminiCallSlot, convertPrice } from '@kimbor/core';
import { redisConnection } from '../queue/deleteQueue';

/**
 * Shaxsiy chatdagi ijara suhbati (2026-10-08).
 *
 * Ikki yo'nalish:
 *  - SEEK  — "uy qidiryapman": bazadagi HAQIQIY e'lonlardan mosini chatda
 *            kartochka qilib ko'rsatadi + ilovada hammasini ochish tugmasi.
 *  - OFFER — "uyim bor": kerakli ma'lumotni birma-bir so'rab, e'lonni
 *            o'zi tuzadi va API orqali ilovadagi bilan BIR XIL tekshiruv/
 *            moderatsiyadan o'tkazib joylaydi.
 *
 * Suhbat oqimini KOD boshqaradi (qaysi ma'lumot yetishmayapti, qachon
 * qidirish/joylash) — AI faqat erkin matndan ma'lumot ajratadi va javobni
 * samimiy qilib yozadi. AI ishlamasa (limit/429) — qoidali ajratish va
 * tayyor matnlar bilan suhbat to'xtamaydi. Raqam, narx, e'lon ma'lumoti
 * hech qachon AI'dan olinmaydi — faqat bazadan yoki foydalanuvchi matnidan.
 */

type Kind = 'kvartira' | 'hovli' | 'xona' | 'ofis' | 'dokon';
type Step = 'kind' | 'rooms' | 'price' | 'landmark' | 'phone' | 'photos' | 'confirm';

interface RentState {
  mode: 'seek' | 'offer';
  kind?: Kind;
  rooms?: number;
  price?: number;
  currency?: 'USD' | 'UZS';
  term?: 'KUNLIK' | 'OYLIK' | 'YILLIK';
  landmarkId?: string;
  landmarkName?: string;
  phone?: string;
  description?: string;
  photos: string[];
  photosDone?: boolean;
  shownIds: string[];
  /** Rad etilgan e'lonni tuzatish rejimi */
  editId?: string;
  keepPhotos?: string[];
}

const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const STATE_TTL = 24 * 60 * 60;
const USER_APP_URL = `https://${process.env.DOMAIN || 'olmaliq.online'}/app/`;
const PUBLIC_BASE = process.env.WEBAPP_URL || `https://${process.env.DOMAIN || 'olmaliq.online'}`;
const INTERNAL_API = process.env.INTERNAL_API_URL || 'http://api:4000';
const PLACEHOLDER_MFY = 'MFY tanlanmagan';

const KIND_LABEL: Record<Kind, string> = { kvartira: 'kvartira', hovli: 'hovli uy', xona: 'xona', ofis: 'ofis', dokon: "do'kon / joy" };
const KIND_WORDS: Record<Kind, RegExp> = {
  kvartira: /\b(kvartir|dom\b)/,
  hovli: /\b(hovli|uchastka|chastn\S* dom|dacha)/,
  xona: /\b(xona(?!li)|komnat|yotoqxona)/,
  ofis: /\b(ofis)/,
  dokon: /\b(do'?kon|savdo joy|ombor|magazin|sklad)/,
};

// ---------------------------------------------------------------- intent

const OFFER_RE =
  /(ijara|arenda|ijaraga|arendaga|kvartirantga)\s*(ga\s*)?(beraman|beramiz|berib|bermoqchi|bermoqchiman|qo'?ymoqchi|qo'?yaman)|\b(uy|uyim|uyimiz|kvartiram|kvartiramiz|hovlim|hovlimiz|xonam|xonamiz|ofisim)\s+(bor|bo'?sh)\b|ijarachi\s+(kerak|qidir)|kvartirant\s+(kerak|qidir)|\b(sdayu|sdam|sdayotsya|sdaetsya)\b/;
const SEEK_RE =
  /\b(uy|kvartira|kvartir|hovli|xona|ofis)\S{0,6}\s+(kerak|qidir|izlay|topib|bormi|bor\s*mi)|(ijara|arenda)\S*\s+(uy|kvartira|hovli|xona)|(ijaraga|arendaga)\s+(olaman|olmoqchi|olib|kerak)|\b(snimu|snyat|ishchu (kvartir|dom|komnat))|\d\s*xonali/;

export type RentIntent = 'seek' | 'offer' | null;

/**
 * Suhbat davomida rejimni ALMASHTIRISH uchun faqat aniq iboralar hisobga
 * olinadi: uy egasi "3 xonali, remonti yangi" desa, "xonali" so'zi uni
 * qidiruvchiga aylantirib yubormasligi kerak (2026-10-08 sinovda topilgan).
 */
function detectExplicitIntent(text: string): RentIntent {
  const n = normalizeText(text);
  if (OFFER_RE.test(n)) return 'offer';
  if (SEEK_RE.test(n.replace(/\d\s*xonali/g, ''))) return 'seek';
  return null;
}

export function detectRentIntent(text: string): RentIntent {
  const n = normalizeText(text);
  if (!n) return null;
  if (OFFER_RE.test(n)) return 'offer';
  if (SEEK_RE.test(n)) return 'seek';
  return null;
}

// ---------------------------------------------------------------- state

const stateKey = (uid: number) => `kimbor:rent:${uid}`;

async function loadState(uid: number): Promise<RentState | null> {
  try {
    const raw = await redisConnection.get(stateKey(uid));
    return raw ? (JSON.parse(raw) as RentState) : null;
  } catch {
    return null;
  }
}

async function saveState(uid: number, s: RentState): Promise<void> {
  try {
    await redisConnection.del(`kimbor:biz:${uid}`); // bir vaqtda faqat bitta suhbat
    await redisConnection.set(stateKey(uid), JSON.stringify(s), 'EX', STATE_TTL);
  } catch {
    /* ignore */
  }
}

export async function clearRentState(uid: number): Promise<void> {
  try {
    await redisConnection.del(stateKey(uid));
  } catch {
    /* ignore */
  }
}

export async function hasRentState(uid: number): Promise<boolean> {
  return !!(await loadState(uid));
}

// ---------------------------------------------------------------- landmarks

let lmCache: { items: { id: string; name: string; terms: string[] }[]; exp: number } | null = null;

export async function landmarks(cityId: string) {
  if (lmCache && lmCache.exp > Date.now()) return lmCache.items;
  const rows = await db.landmark.findMany({ where: { cityId }, select: { id: true, name: true, synonyms: true }, orderBy: { name: 'asc' } });
  const items = rows
    .filter((r) => r.name !== PLACEHOLDER_MFY)
    .map((r) => {
      const base = normalizeText(r.name.replace(/\s*MFY$/i, ''));
      return { id: r.id, name: r.name, terms: Array.from(new Set([base, ...r.synonyms.map((x) => normalizeText(x))])).filter((t) => t && t.length >= 2) };
    });
  lmCache = { items, exp: Date.now() + 60_000 };
  return items;
}

export async function matchLandmark(cityId: string, text: string) {
  // Telefon raqamlari mahalla emas: "…45 67" "67" jargonli mahallaga
  // tushib qolgan edi (2026-10-08 sinov).
  const n = ` ${normalizeText(text.replace(/\+?\d[\d\s\-()]{7,}\d/g, ' '))} `;
  let best: { id: string; name: string; len: number } | null = null;
  for (const l of await landmarks(cityId)) {
    for (const t of l.terms) {
      const re = new RegExp(`(^|[^a-z0-9'])${t.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}`);
      if (re.test(n) && (!best || t.length > best.len)) best = { id: l.id, name: l.name, len: t.length };
    }
  }
  return best;
}

// ---------------------------------------------------------------- extraction

function detectKind(n: string): Kind | undefined {
  return (Object.keys(KIND_WORDS) as Kind[]).find((k) => KIND_WORDS[k].test(n));
}

export function extractPhone(text: string): string | undefined {
  const m = text.replace(/[\s\-()]/g, '').match(/(\+?998)?(\d{9})(?!\d)/);
  return m ? `+998${m[2]}` : undefined;
}

/** Narx: "300$", "300 dollar", "3 mln", "2.5 million so'm", "300" (taklif rejimida). */
function extractOfferPrice(n: string): { price: number; currency: 'USD' | 'UZS' } | undefined {
  const mln = n.match(/(\d+(?:[.,]\d+)?)\s*(mln|million|млн)/);
  if (mln) return { price: Math.round(parseFloat(mln[1].replace(',', '.')) * 1_000_000), currency: 'UZS' };
  const usd = n.match(/(\d[\d\s]{0,6})\s*(\$|dollar|долл|usd|у\.е)/) || n.match(/\$\s*(\d[\d\s]{0,6})/);
  if (usd) return { price: parseInt(usd[1].replace(/\s/g, ''), 10), currency: 'USD' };
  const som = n.match(/(\d[\d\s]{3,12})\s*(so'?m|sum|сум)/);
  if (som) return { price: parseInt(som[1].replace(/\s/g, ''), 10), currency: 'UZS' };
  return undefined;
}

function applyRules(s: RentState, text: string, cityIdLandmark: { id: string; name: string } | null) {
  const n = normalizeText(text);
  const kind = detectKind(n);
  if (kind) s.kind = kind;
  const f = extractRentalFilters(text);
  if (f.roomCount) s.rooms = f.roomCount;
  if (f.termType) s.term = f.termType;
  if (s.mode === 'seek' && f.maxPrice) {
    s.price = f.maxPrice;
    s.currency = f.currency || (f.maxPrice < 10_000 ? 'USD' : 'UZS');
  }
  if (s.mode === 'offer') {
    const p = extractOfferPrice(n);
    if (p && p.price > 0) {
      s.price = p.price;
      s.currency = p.currency;
    }
    const ph = extractPhone(text);
    if (ph) s.phone = ph;
  }
  // Tanlangan mahalla faqat foydalanuvchi mahallani aniq aytsa almashadi
  if (cityIdLandmark && (!s.landmarkId || /mahalla|mfy|mavze|dahasi/.test(n))) {
    s.landmarkId = cityIdLandmark.id;
    s.landmarkName = cityIdLandmark.name;
  }
}

// ---------------------------------------------------------------- AI

interface AiOut {
  reply?: string;
  kind?: string | null;
  rooms?: number | null;
  price?: number | null;
  currency?: string | null;
  term?: string | null;
  mahalla?: string | null;
  description?: string | null;
  wantsOtherTopic?: boolean | null;
}

const AI_SCHEMA = {
  type: 'OBJECT',
  properties: {
    reply: { type: 'STRING' },
    kind: { type: 'STRING', nullable: true },
    rooms: { type: 'INTEGER', nullable: true },
    price: { type: 'NUMBER', nullable: true },
    currency: { type: 'STRING', nullable: true },
    term: { type: 'STRING', nullable: true },
    mahalla: { type: 'STRING', nullable: true },
    description: { type: 'STRING', nullable: true },
    wantsOtherTopic: { type: 'BOOLEAN', nullable: true },
  },
  required: ['reply'],
};

const AI_PROMPT = `Sen — Olmaliq shahridagi "Olmaliq" botining samimiy yordamchisisan. Hozir foydalanuvchi bilan UY IJARASI haqida gaplashyapsan.
Bizning bot — maklersiz: uy egasi e'lonni o'zi bepul joylaydi, ijarachi egasining o'zi bilan gaplashadi, komissiya yo'q.

XARAKTER: iliq, sodda, hurmat bilan (sizlab). Uy foydalanuvchiniki — «uyingiz» de, hech qachon «uyimiz» dema. 1–2 qisqa gap. Ko'pi bilan bitta emoji. Foydalanuvchi qaysi tilda yozsa (o'zbek lotin/kirill, rus) — shu tilda.

VAZIFA: foydalanuvchi xabaridan ma'lumot ajrat va "reply" yoz.
- kind: kvartira | hovli | xona | ofis | dokon (aniq aytilmagan bo'lsa null)
- rooms: xonalar soni; price: narx raqami; currency: USD | UZS; term: KUNLIK | OYLIK | YILLIK
- mahalla: foydalanuvchi aytgan joy/mahalla nomi aynan uning so'zi bilan (bo'lmasa null)
- description: uy haqida qo'shimcha tafsilot (remont, mebel, qavat va h.k.) — faqat taklif rejimida
- wantsOtherTopic: foydalanuvchi ijaradan butunlay boshqa narsa so'rayapti (usta, do'kon va h.k.) — true

QAT'IY QOIDALAR:
- Hech qachon telefon raqam, aniq e'lon, narx yoki manzil O'YLAB TOPMA. E'lonlarni tizim o'zi ko'rsatadi.
- "E'lon joylandi", "topdim" kabi natijani o'zing AYTMA — buni tizim aytadi.
- reply — "KEYINGI SAVOL" ko'rsatmasiga mos bo'lsin: o'sha narsani samimiy so'ra. Ko'rsatma bo'sh bo'lsa — qisqa samimiy javob ber.
- Foydalanuvchi savol bersa (bepulmi? qanday ishlaydi?) — avval qisqa javob ber, keyin keyingi savolni so'ra.
Javob: faqat JSON.`;

async function askAi(s: RentState, text: string, nextQuestion: string): Promise<AiOut | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here' || !reserveGeminiCallSlot()) return null;
  const known = {
    rejim: s.mode === 'seek' ? 'foydalanuvchi uy QIDIRYAPTI' : 'foydalanuvchi uyini ijaraga BERMOQCHI',
    turi: s.kind || null,
    xona: s.rooms || null,
    narx: s.price ? `${s.price} ${s.currency || ''}` : null,
    mahalla: s.landmarkName || null,
  };
  const abort = new AbortController();
  const t = setTimeout(() => abort.abort(), 7000);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: AI_PROMPT }] },
        contents: [
          {
            role: 'user',
            parts: [{ text: `MA'LUM: ${JSON.stringify(known)}\nKEYINGI SAVOL: ${nextQuestion || '(yo\'q)'}\nFOYDALANUVCHI XABARI: "${text.slice(0, 800)}"` }],
          },
        ],
        generationConfig: { responseMimeType: 'application/json', responseSchema: AI_SCHEMA, maxOutputTokens: 300, temperature: 0.5 },
      }),
      signal: abort.signal,
    });
    if (!res.ok) {
      console.warn(`⚠️ Ijara AI HTTP ${res.status}`);
      return null;
    }
    const j: any = await res.json();
    const raw = j.candidates?.[0]?.content?.parts?.[0]?.text;
    return raw ? (JSON.parse(raw) as AiOut) : null;
  } catch (err) {
    console.warn('⚠️ Ijara AI xatosi:', (err as Error).message);
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** AI ajratgan maydonlar faqat qoida topmagan joylarni to'ldiradi va qat'iy tekshiriladi. */
async function applyAi(s: RentState, ai: AiOut, cityId: string) {
  if (!s.kind && ai.kind && ai.kind in KIND_LABEL) s.kind = ai.kind as Kind;
  if (!s.rooms && ai.rooms && ai.rooms > 0 && ai.rooms <= 20) s.rooms = Math.round(ai.rooms);
  if (!s.price && ai.price && ai.price > 0) {
    s.price = Math.round(ai.price);
    s.currency = ai.currency === 'UZS' ? 'UZS' : ai.currency === 'USD' ? 'USD' : s.price < 10_000 ? 'USD' : 'UZS';
  }
  if (!s.term && ai.term && ['KUNLIK', 'OYLIK', 'YILLIK'].includes(ai.term)) s.term = ai.term as RentState['term'];
  if (!s.landmarkId && ai.mahalla) {
    const lm = await matchLandmark(cityId, ai.mahalla);
    if (lm) {
      s.landmarkId = lm.id;
      s.landmarkName = lm.name;
    }
  }
  if (s.mode === 'offer' && ai.description && ai.description.length > 3) s.description = ai.description.slice(0, 500);
}

// ---------------------------------------------------------------- formatting

export const esc = (x: string) => x.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!);

function fmtPrice(price: number | null | undefined, cur: string | null | undefined, term: string | null | undefined) {
  if (!price) return 'kelishiladi';
  const num = price.toLocaleString('ru-RU').replace(/,/g, ' ');
  const c = cur === 'UZS' ? " so'm" : '$';
  const t = term === 'KUNLIK' ? ' / kun' : term === 'YILLIK' ? ' / yil' : ' / oy';
  return cur === 'UZS' ? `${num}${c}${t}` : `${num}${c}${t}`;
}

// ---------------------------------------------------------------- SEEK

async function rentalCategoryIds(kind?: Kind): Promise<string[]> {
  const cats = await db.category.findMany({ select: { id: true, name: true } });
  const rent = cats.filter((c) => /arenda|ijara/i.test(c.name) && !/asbob|mashina|avto|uskuna/i.test(c.name));
  if (!kind) return rent.map((c) => c.id);
  const hit = rent.filter((c) => KIND_WORDS[kind].test(normalizeText(c.name)));
  return (hit.length ? hit : rent).map((c) => c.id);
}

async function findRentals(cityId: string, s: RentState, opts: { useLandmark: boolean; usePrice: boolean; useRooms: boolean }) {
  const catIds = await rentalCategoryIds(s.kind);
  const where: any = { cityId, type: 'ARENDA', status: 'ACTIVE', id: { notIn: s.shownIds } };
  if (catIds.length) where.categoryId = { in: catIds };
  if (opts.useRooms && s.rooms) where.roomCount = s.rooms;
  if (opts.useLandmark && s.landmarkId) where.primaryLandmarkId = s.landmarkId;
  if (opts.usePrice && s.price) {
    // 10% chegara bilan (kelishiladigan narxlar uchun), yagona kurs bo'yicha
    const cur = s.currency === 'UZS' ? 'UZS' : 'USD';
    where.OR = [
      { rentPriceCurrency: 'USD', rentPrice: { lte: Math.ceil(convertPrice(s.price, cur, 'USD') * 1.1) } },
      { rentPriceCurrency: 'UZS', rentPrice: { lte: Math.ceil(convertPrice(s.price, cur, 'UZS') * 1.1) } },
      { rentPrice: null },
    ];
  }
  return db.listing.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { id: true, name: true, phone: true, roomCount: true, rentPrice: true, rentPriceCurrency: true, rentTermType: true, photoUrls: true, description: true, primaryLandmark: { select: { name: true } } },
  });
}

async function sendRentalCard(ctx: Context, l: Awaited<ReturnType<typeof findRentals>>[number]) {
  const lm = l.primaryLandmark?.name && l.primaryLandmark.name !== PLACEHOLDER_MFY ? `📍 ${esc(l.primaryLandmark.name)}\n` : '';
  const desc = l.description ? `\n<i>${esc(l.description.slice(0, 180))}${l.description.length > 180 ? '…' : ''}</i>\n` : '';
  const caption =
    `🏠 <b>${esc(l.name)}</b>\n💵 ${fmtPrice(l.rentPrice, l.rentPriceCurrency, l.rentTermType)}\n${lm}` +
    `📞 ${esc(l.phone)} — <i>egasining o'zi</i>${desc}`;
  const kb = new InlineKeyboard().webApp("🖼 Batafsil ko'rish", `${USER_APP_URL}?listing=${l.id}`);
  const photo = l.photoUrls[0];
  if (photo) {
    try {
      await ctx.replyWithPhoto(/^https?:/.test(photo) ? photo : PUBLIC_BASE + photo, { caption, parse_mode: 'HTML', reply_markup: kb });
      return;
    } catch {
      /* rasm ochilmasa — matn bilan */
    }
  }
  await ctx.reply(caption, { parse_mode: 'HTML', reply_markup: kb });
}

function seekSummary(s: RentState): string {
  const parts = [s.rooms ? `${s.rooms} xonali` : '', s.kind ? KIND_LABEL[s.kind] : 'uy', s.landmarkName ? `${s.landmarkName}da` : '', s.price ? `${fmtPrice(s.price, s.currency, null).replace(' / oy', '')} gacha` : ''];
  return parts.filter(Boolean).join(', ');
}

async function runSeek(ctx: Context, cityId: string, s: RentState, aiReply?: string) {
  let rows = await findRentals(cityId, s, { useLandmark: true, usePrice: true, useRooms: true });
  let relaxedNote = '';
  if (rows.length === 0 && (s.landmarkId || s.price || s.rooms)) {
    rows = await findRentals(cityId, s, { useLandmark: false, usePrice: true, useRooms: true });
    if (rows.length) relaxedNote = s.landmarkId ? `${s.landmarkName}da hozircha yo'q ekan — boshqa mahallalardan:` : '';
    if (!rows.length) {
      rows = await findRentals(cityId, s, { useLandmark: false, usePrice: false, useRooms: false });
      if (rows.length) relaxedNote = "Aynan siz aytgandek hozircha yo'q — lekin mana yaqin variantlar:";
    }
  }

  const intro = aiReply?.trim() || (s.shownIds.length ? "Mana yana variantlar 👇" : `Tushunarli, ${seekSummary(s) || 'ijara uy'} qidiryapsiz 🙂`);
  if (rows.length === 0) {
    await ctx.reply(
      `${esc(intro)}\n\nHozircha bazamizda bunday e'lon yo'q ekan 🙏 Yangi uylar har kuni qo'shilyapti — birozdan keyin yana so'rab ko'ring yoki ilovada barcha e'lonlarni ko'rib chiqing.`,
      { parse_mode: 'HTML', reply_markup: new InlineKeyboard().webApp("📱 Barcha ijara e'lonlari", `${USER_APP_URL}?go=rent`) }
    );
    return;
  }

  await ctx.reply(`${esc(intro)}${relaxedNote ? `\n\n${esc(relaxedNote)}` : ''}`, { parse_mode: 'HTML' });
  for (const r of rows) await sendRentalCard(ctx, r);
  s.shownIds.push(...rows.map((r) => r.id));

  const kb = new InlineKeyboard();
  if (rows.length === 3) kb.text("➕ Yana ko'rsat", 'rent:more');
  kb.webApp('📱 Hammasini ilovada', `${USER_APP_URL}?go=rent`);
  const hint = !s.landmarkId ? "Qaysi mahalla qulay? Yozsangiz, o'sha atrofdan ham qidiraman." : !s.price ? "Narx bo'yicha chegarangiz bormi? Masalan: «300$ gacha»." : "Egasiga to'g'ridan-to'g'ri qo'ng'iroq qilavering — makler yo'q 🙂";
  await ctx.reply(hint, { reply_markup: kb });
}

// ---------------------------------------------------------------- OFFER

function nextOfferStep(s: RentState): Step {
  if (!s.kind) return 'kind';
  if (!s.rooms && (s.kind === 'kvartira' || s.kind === 'hovli')) return 'rooms';
  if (!s.price) return 'price';
  if (!s.landmarkId) return 'landmark';
  if (!s.phone) return 'phone';
  if (!s.photosDone) return 'photos';
  return 'confirm';
}

const SEEK_AI_HINT =
  "Foydalanuvchi uy qidiryapti. Faqat 1 gaplik iliq tasdiq yoz (masalan «Tushunarli, hozir qarab ko'raman»). SAVOL BERMA va natija haqida HECH NARSA DEMA (topdim/topaman/yo'q) — e'lonlarni va savolni tizim o'zi beradi. Agar foydalanuvchi savol bergan yoki rahmat aytgan bo'lsa — qisqa javob ber.";

const STEP_QUESTION: Record<Step, string> = {
  kind: "Qanday joy ijaraga bermoqchisiz — kvartira, hovli uy, xona, ofis yoki do'kon?",
  rooms: 'Necha xonali?',
  price: "Oyiga qanchaga bermoqchisiz? Masalan: «300$» yoki «3 mln so'm».",
  landmark: "Uy qaysi mahallada joylashgan? Nomini yozing yoki ro'yxatdan tanlang.",
  phone: 'Ijarachilar qaysi raqamga qo\'ng\'iroq qilsin? Raqamni yozing yoki pastdagi tugmani bosing.',
  photos: "Endi uyning 2–3 ta rasmini yuboring — rasmli e'lonlar ancha tez beriladi 📷",
  confirm: '',
};

function offerSummary(s: RentState): string {
  return (
    `<b>E'loningiz tayyor — tekshirib ko'ring:</b>\n\n` +
    `🏠 ${esc(`${s.rooms ? `${s.rooms} xonali ` : ''}${s.kind ? KIND_LABEL[s.kind] : ''}`)}\n` +
    `💵 ${fmtPrice(s.price, s.currency, s.term)}\n` +
    `📍 ${esc(s.landmarkName || '')}\n` +
    `📞 ${esc(s.phone || '')}\n` +
    `📷 ${s.photos.length + (s.keepPhotos?.length || 0) ? `${s.photos.length + (s.keepPhotos?.length || 0)} ta rasm` : "rasmsiz"}` +
    (s.description ? `\n📝 ${esc(s.description)}` : '') +
    `\n\nO'zgartirmoqchi bo'lsangiz, shunchaki yozing (masalan: «narxi 350$»).`
  );
}

export async function sendLandmarkPicker(ctx: Context, cityId: string, prefix = 'rent') {
  const items = await landmarks(cityId);
  const kb = new InlineKeyboard();
  items.forEach((l, i) => {
    kb.text(l.name.replace(/\s*MFY$/i, ''), `${prefix}:lm:${l.id}`);
    if (i % 2 === 1) kb.row();
  });
  await ctx.reply('Mahallani tanlang 👇', { reply_markup: kb });
}

async function askOfferStep(ctx: Context, cityId: string, s: RentState, step: Step, aiReply?: string) {
  const text = aiReply?.trim() || STEP_QUESTION[step];
  if (step === 'kind') {
    const kb = new InlineKeyboard()
      .text('🏢 Kvartira', 'rent:kind:kvartira').text('🏡 Hovli uy', 'rent:kind:hovli').row()
      .text('🚪 Xona', 'rent:kind:xona').text('💼 Ofis', 'rent:kind:ofis').text("🏪 Do'kon", 'rent:kind:dokon');
    await ctx.reply(text, { reply_markup: kb });
  } else if (step === 'rooms') {
    const kb = new InlineKeyboard();
    [1, 2, 3, 4, 5].forEach((n) => kb.text(`${n}${n === 5 ? '+' : ''}`, `rent:rooms:${n}`));
    await ctx.reply(text, { reply_markup: kb });
  } else if (step === 'price') {
    await ctx.reply(text);
  } else if (step === 'landmark') {
    await ctx.reply(text, { reply_markup: new InlineKeyboard().text("📍 Mahallalar ro'yxati", 'rent:lmlist') });
  } else if (step === 'phone') {
    await ctx.reply(text, {
      reply_markup: { keyboard: [[{ text: '📱 Raqamimni yuborish', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true },
    });
  } else if (step === 'photos') {
    await ctx.reply(text, {
      reply_markup: s.photos.length
        ? new InlineKeyboard().text('Rasmlar yetarli ✅', 'rent:photosdone')
        : new InlineKeyboard().text('Rasmsiz davom etish', 'rent:nophoto'),
    });
  } else {
    await ctx.reply(offerSummary(s), {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text('✅ Joylash', 'rent:submit').text('❌ Bekor qilish', 'rent:cancel'),
    });
  }
}

export function internalKey(): string {
  return crypto.createHash('sha256').update(`internal:${process.env.BOT_TOKEN || ''}`).digest('hex');
}

async function submitOffer(ctx: Context, s: RentState) {
  const uid = ctx.from!.id;
  try {
    const res = await fetch(`${INTERNAL_API}/api/internal/rentals`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-key': internalKey() },
      body: JSON.stringify({
        telegramId: String(uid),
        kind: s.kind,
        rooms: s.rooms,
        price: s.price,
        currency: s.currency,
        term: s.term || 'OYLIK',
        landmarkId: s.landmarkId,
        phone: s.phone,
        description: s.description,
        photoFileIds: s.photos,
        editId: s.editId,
        keepPhotos: s.keepPhotos,
      }),
    });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok || !j.success) {
      await ctx.reply(`Kechirasiz, e'lonni joylab bo'lmadi: ${j.message || 'texnik xato'} 🙏\nKerak bo'lsa, o'zgartirib qayta urinib ko'ring.`);
      return;
    }
    await clearRentState(uid);
    const kb = new InlineKeyboard().webApp("📱 E'lonlarimni ko'rish", `${USER_APP_URL}?go=rent`);
    await ctx.reply(
      s.editId
        ? "Rahmat! 🙏 Tuzatilgan e'loningiz qayta ko'rib chiqishga yuborildi. Tasdiqlangach, sizga shu yerda xabar beramiz."
        : j.pending
        ? "Rahmat! 🙏 E'loningiz qabul qilindi va qisqa tekshiruvdan o'tmoqda. Tasdiqlangach, sizga shu yerda xabar beramiz."
        : "Tayyor! 🎉 E'loningiz joylandi — endi Olmaliqdagi ijarachilar uni ko'radi va sizga to'g'ridan-to'g'ri qo'ng'iroq qiladi. Maklersiz, bepul.",
      { reply_markup: kb }
    );
  } catch (err) {
    console.error('Ijara e\'lonini yuborish xatosi:', err);
    await ctx.reply("Kechirasiz, hozir texnik muammo bor 🙏 Birozdan keyin «Joylash»ni qayta bosing.");
  }
}

// ---------------------------------------------------------------- entry points

const CANCEL_RE = /^(bekor|bekor qil|to'?xtat|kerak emas|stop|otmena)\b/;

/**
 * Shaxsiy chatdagi matnli xabar. true — xabar ijara suhbatida qayta
 * ishlandi; false — oddiy qidiruv/AI yordamchiga o'tkazilsin.
 */
export async function handleRentalText(ctx: Context, cityId: string, text: string): Promise<boolean> {
  const uid = ctx.from!.id;
  let s = await loadState(uid);
  const intent = detectRentIntent(text);
  const n = normalizeText(text);

  if (s && CANCEL_RE.test(n)) {
    await clearRentState(uid);
    await ctx.reply("Mayli, to'xtatdim 🙂 Yana kerak bo'lsa, yozavering.", { reply_markup: { remove_keyboard: true } });
    return true;
  }

  if (!s) {
    if (!intent) return false;
    s = { mode: intent, photos: [], shownIds: [] };
  } else {
    const explicit = detectExplicitIntent(text);
    if (explicit && explicit !== s.mode) s = { mode: explicit, photos: [], shownIds: [] };
  }

  const lm = await matchLandmark(cityId, text);
  const before = JSON.stringify(s);
  applyRules(s, text, lm);
  const rulesChanged = JSON.stringify(s) !== before;

  if (s.mode === 'seek') {
    const ai = await askAi(s, text, SEEK_AI_HINT);
    if (ai) await applyAi(s, ai, cityId);
    const changed = JSON.stringify(s) !== before || !!intent;
    if (!changed) {
      if (ai?.reply && !ai.wantsOtherTopic) {
        // "rahmat", "qanday ishlaydi?" — qidiruvni takrorlamay, samimiy javob
        await ctx.reply(ai.reply);
        await saveState(uid, s);
        return true;
      }
      // ijaraga aloqasiz yangi so'rov — oddiy qidiruvga qaytaramiz
      await clearRentState(uid);
      return false;
    }
    await runSeek(ctx, cityId, s, ai?.reply);
    await saveState(uid, s);
    return true;
  }

  // OFFER
  const stepBefore = nextOfferStep(s);
  const ai = await askAi(s, text, STEP_QUESTION[stepBefore]);
  if (ai) await applyAi(s, ai, cityId);
  if (!rulesChanged && !intent && ai?.wantsOtherTopic) {
    await ctx.reply("E'loningizni keyinroq davom ettirsak ham bo'ladi 🙂 Hozir savolingizni ko'rib chiqaman.", { reply_markup: { remove_keyboard: true } });
    return false;
  }
  const step = nextOfferStep(s);
  await saveState(uid, s);
  if (stepBefore === 'phone' && s.phone) {
    await ctx.reply('Rahmat, raqam saqlandi ✅', { reply_markup: { remove_keyboard: true } });
  }
  // AI javobi oldingi savolga yozilgan — qadam o'zgargan bo'lsa tayyor savolni beramiz
  const reply = step === stepBefore || step === 'confirm' ? ai?.reply : undefined;
  if (intent === 'offer' && !ai && JSON.stringify(s) === before) {
    await ctx.reply("Ajoyib! 🙂 Uyingizni shu yerning o'zida, maklersiz va bepul joylab beraman — bir necha savol so'rayman.");
  }
  await askOfferStep(ctx, cityId, s, step, step === 'confirm' ? undefined : reply);
  return true;
}

/** Uy egasi rasm yuborsa (taklif rejimida). */
export async function handleRentalPhoto(ctx: Context, cityId: string): Promise<boolean> {
  const uid = ctx.from!.id;
  const s = await loadState(uid);
  if (!s || s.mode !== 'offer') return false;
  const sizes = ctx.message?.photo;
  if (!sizes?.length) return false;
  s.photos = [...s.photos, sizes[sizes.length - 1].file_id].slice(0, 8);
  const caption = ctx.message?.caption;
  if (caption) applyRules(s, caption, await matchLandmark(cityId, caption));
  await saveState(uid, s);

  // Albom bo'lib kelgan rasmlarga bitta javob
  const group = ctx.message?.media_group_id;
  if (group) {
    const first = await redisConnection.set(`kimbor:rent:mg:${group}`, '1', 'EX', 60, 'NX').catch(() => 'OK');
    if (first !== 'OK') return true;
    await new Promise((r) => setTimeout(r, 1500));
  }
  const fresh = (await loadState(uid)) || s;
  if (fresh.photosDone && nextOfferStep(fresh) === 'confirm') {
    await askOfferStep(ctx, cityId, fresh, 'confirm');
    return true;
  }
  await ctx.reply(`📷 Rasm qabul qilindi (${fresh.photos.length} ta). Yana yuborishingiz yoki davom etishingiz mumkin.`, {
    reply_markup: new InlineKeyboard().text('Rasmlar yetarli ✅', 'rent:photosdone'),
  });
  return true;
}

/** Uy egasi "Raqamimni yuborish" tugmasini bossa. */
export async function handleRentalContact(ctx: Context, cityId: string): Promise<boolean> {
  const uid = ctx.from!.id;
  const s = await loadState(uid);
  const c = ctx.message?.contact;
  if (!s || s.mode !== 'offer' || !c) return false;
  const ph = extractPhone(c.phone_number);
  if (ph) s.phone = ph;
  await saveState(uid, s);
  await ctx.reply('Rahmat, raqam saqlandi ✅', { reply_markup: { remove_keyboard: true } });
  await askOfferStep(ctx, cityId, s, nextOfferStep(s));
  return true;
}

/** rent:* tugmalari. */
export async function handleRentalCallback(ctx: Context, cityId: string, data: string): Promise<boolean> {
  if (!data.startsWith('rent:')) return false;
  const uid = ctx.from!.id;
  await ctx.answerCallbackQuery().catch(() => {});

  if (data === 'rent:start_seek' || data === 'rent:start_offer') {
    const mode = data === 'rent:start_seek' ? 'seek' : 'offer';
    const s: RentState = { mode, photos: [], shownIds: [] };
    await saveState(uid, s);
    if (mode === 'seek') {
      await ctx.reply("Zo'r! 🙂 Qanday uy kerak? Bir gap bilan yozing — masalan: «2 xonali kvartira, Kimyogarda, 300$ gacha». Hamma narsani aytish shart emas.");
    } else {
      await ctx.reply("Ajoyib! 🙂 Uyingizni shu yerning o'zida, maklersiz va bepul joylab beraman. Bir necha savol so'rayman.");
      await askOfferStep(ctx, cityId, s, 'kind');
    }
    return true;
  }

  const s = await loadState(uid);
  if (!s) {
    await ctx.reply("Bu suhbat eskirib qolibdi 🙏 Qaytadan yozing — masalan «uy qidiryapman» yoki «uyimni ijaraga beraman».");
    return true;
  }

  if (data === 'rent:more' && s.mode === 'seek') {
    await runSeek(ctx, cityId, s);
    await saveState(uid, s);
    return true;
  }
  if (data === 'rent:cancel') {
    await clearRentState(uid);
    await ctx.reply("Mayli, bekor qildim 🙂 Yana kerak bo'lsa, yozavering.", { reply_markup: { remove_keyboard: true } });
    return true;
  }
  if (s.mode !== 'offer') return true;

  if (data.startsWith('rent:kind:')) s.kind = data.slice(10) as Kind;
  else if (data.startsWith('rent:rooms:')) s.rooms = Number(data.slice(11)) || undefined;
  else if (data === 'rent:lmlist') {
    await sendLandmarkPicker(ctx, cityId);
    return true;
  } else if (data.startsWith('rent:lm:')) {
    const lm = (await landmarks(cityId)).find((l) => l.id === data.slice(8));
    if (lm) {
      s.landmarkId = lm.id;
      s.landmarkName = lm.name;
      await ctx.editMessageText(`📍 ${lm.name}`).catch(() => {});
    }
  } else if (data === 'rent:nophoto' || data === 'rent:photosdone') s.photosDone = true;
  else if (data === 'rent:submit') {
    if (nextOfferStep(s) !== 'confirm') {
      await askOfferStep(ctx, cityId, s, nextOfferStep(s));
      return true;
    }
    await ctx.editMessageReplyMarkup().catch(() => {});
    await ctx.reply("Joylayapman… ⏳");
    await submitOffer(ctx, s);
    return true;
  }
  await saveState(uid, s);
  await askOfferStep(ctx, cityId, s, nextOfferStep(s));
  return true;
}

/** Admin rad etgan ijara e'lonini chatda tuzatish — eski ma'lumotlar bilan ochiladi. */
export async function startRentalFix(
  ctx: Context,
  cityId: string,
  l: { id: string; roomCount: number | null; rentPrice: number | null; rentPriceCurrency: string | null; rentTermType: string | null; primaryLandmarkId: string; phone: string; description: string | null; photoUrls: string[]; categoryName: string; rejectionNote: string | null }
) {
  const n = normalizeText(l.categoryName);
  const kind = (Object.keys(KIND_WORDS) as Kind[]).find((k) => KIND_WORDS[k].test(n)) || 'kvartira';
  const lm = (await landmarks(cityId)).find((x) => x.id === l.primaryLandmarkId);
  const s: RentState = {
    mode: 'offer',
    kind,
    rooms: l.roomCount || undefined,
    price: l.rentPrice || undefined,
    currency: (l.rentPriceCurrency as RentState['currency']) || undefined,
    term: (l.rentTermType as RentState['term']) || undefined,
    landmarkId: lm?.id,
    landmarkName: lm?.name,
    phone: l.phone,
    description: l.description || undefined,
    photos: [],
    keepPhotos: l.photoUrls,
    photosDone: true,
    shownIds: [],
    editId: l.id,
  };
  await saveState(ctx.from!.id, s);
  await ctx.reply(
    `Keling, birga tuzatamiz 🙂${l.rejectionNote ? `\n\n<b>Admin izohi:</b> ${esc(l.rejectionNote)}` : ''}\n\n` +
      `Noto'g'ri joyini shunchaki yozing — masalan: «narxi 300$», «mahallasi Kimyogar», «2 xonali». Yangi rasm yuborsangiz, eskilariga qo'shiladi.`,
    { parse_mode: 'HTML' }
  );
  await askOfferStep(ctx, cityId, s, nextOfferStep(s));
}
