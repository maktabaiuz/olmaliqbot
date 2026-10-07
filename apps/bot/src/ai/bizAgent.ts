import { Context, InlineKeyboard } from 'grammy';
import { db } from '@kimbor/db';
import { normalizeText, matchCategoryFromText, reserveGeminiCallSlot } from '@kimbor/core';
import { redisConnection } from '../queue/deleteQueue';
import { landmarks, matchLandmark, extractPhone, internalKey, esc, sendLandmarkPicker, clearRentState } from './rentalAgent';

/**
 * Bazaga o'zi qo'shilish — usta, do'kon, kafe, xizmat, muassasa (2026-10-08).
 *
 * Ijara suhbati (rentalAgent) bilan bir xil tamoyil: oqimni KOD boshqaradi,
 * AI faqat erkin matndan ma'lumot ajratadi va samimiy so'raydi. Odam
 * hammasini bitta xabarda yozsa ham, birma-bir yozsa ham tushunadi.
 * Natija har doim admin tekshiruviga tushadi ("Shubhali e'lonlar"),
 * tasdiqlansa/rad etilsa egasiga shu chatda xabar boradi.
 */

type Step = 'category' | 'name' | 'phone' | 'landmark' | 'hours' | 'services' | 'photos' | 'confirm';

interface BizState {
  categoryId?: string;
  categoryName?: string;
  name?: string;
  phone?: string;
  landmarkId?: string;
  landmarkName?: string;
  workFrom?: string;
  workTo?: string;
  hoursDone?: boolean;
  services?: string;
  servicesDone?: boolean;
  description?: string;
  photos: string[];
  photosDone?: boolean;
  editId?: string;
}

const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const STATE_TTL = 24 * 60 * 60;
const INTERNAL_API = process.env.INTERNAL_API_URL || 'http://api:4000';

const key = (uid: number) => `kimbor:biz:${uid}`;

async function load(uid: number): Promise<BizState | null> {
  try {
    const raw = await redisConnection.get(key(uid));
    return raw ? (JSON.parse(raw) as BizState) : null;
  } catch {
    return null;
  }
}
async function save(uid: number, s: BizState) {
  try {
    await redisConnection.set(key(uid), JSON.stringify(s), 'EX', STATE_TTL);
  } catch {
    /* ignore */
  }
}
export async function clearBizState(uid: number) {
  try {
    await redisConnection.del(key(uid));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------- intent

const BIZ_RE =
  /o'?zimni\s+(qo'?sh|ro'?yxat|bazaga)|bazaga\s+(qo'?sh|kir)|qo'?shilmoqchi|ro'?yxatdan o'?tmoqchi|(do'?kon|ustaxona|kafe|sartaroshxona|salon|servis|apteka|dorixona|choyxona|oshxona)(im|imiz)\s+(bor|ochdim|ochdik)|xizmat\s+ko'?rsataman|reklama\s+(bermoqchi|qilmoqchi|beraman)|biznesim(ni)?\s/;

export function detectBizIntent(text: string): boolean {
  const n = normalizeText(text);
  return !!n && BIZ_RE.test(n);
}

// ---------------------------------------------------------------- categories

let catCache: { items: { id: string; name: string; synonyms: string[] }[]; exp: number } | null = null;

async function businessCategories() {
  if (catCache && catCache.exp > Date.now()) return catCache.items;
  const rows = await db.category.findMany({ select: { id: true, name: true, synonyms: true }, orderBy: { name: 'asc' } });
  // Ijara turlari bu yerda emas — ular uchun alohida ijara suhbati bor
  const items = rows.filter((c) => !(/arenda|ijara/i.test(c.name) && !/asbob|mashina|avto|uskuna/i.test(c.name)) && c.name.length <= 40);
  catCache = { items, exp: Date.now() + 10 * 60_000 };
  return items;
}

async function matchCategory(text: string) {
  const n = normalizeText(text);
  const items = await businessCategories();
  const dict = matchCategoryFromText(n);
  if (dict) {
    const hit = items.find((c) => normalizeText(c.name) === normalizeText(dict.canonicalName));
    if (hit) return hit;
  }
  return items.find((c) => {
    const terms = [c.name, ...c.synonyms].map((x) => normalizeText(x)).filter((x) => x.length >= 4);
    return terms.some((t) => new RegExp(`(^|[^a-z'])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(n));
  });
}

// ---------------------------------------------------------------- extraction

function extractHours(n: string): { from: string; to: string } | undefined {
  if (/24\s*\/\s*7|kecha[- ]kunduz|sutka|24 soat/.test(n)) return { from: '00:00', to: '23:59' };
  const m = n.match(/(\d{1,2})(?:[:.](\d{2}))?\s*(?:dan|-|–|—|gacha dan)\s*(\d{1,2})(?:[:.](\d{2}))?/);
  if (!m) return undefined;
  const h1 = +m[1];
  const h2 = +m[3];
  if (h1 > 23 || h2 > 24) return undefined;
  const p = (h: number, mm?: string) => `${String(h === 24 ? 23 : h).padStart(2, '0')}:${h === 24 ? '59' : mm || '00'}`;
  return { from: p(h1, m[2]), to: p(h2, m[4]) };
}

interface AiOut {
  reply?: string;
  category?: string | null;
  name?: string | null;
  mahalla?: string | null;
  workFrom?: string | null;
  workTo?: string | null;
  services?: string | null;
  wantsOtherTopic?: boolean | null;
}

const AI_SCHEMA = {
  type: 'OBJECT',
  properties: {
    reply: { type: 'STRING' },
    category: { type: 'STRING', nullable: true },
    name: { type: 'STRING', nullable: true },
    mahalla: { type: 'STRING', nullable: true },
    workFrom: { type: 'STRING', nullable: true },
    workTo: { type: 'STRING', nullable: true },
    services: { type: 'STRING', nullable: true },
    wantsOtherTopic: { type: 'BOOLEAN', nullable: true },
  },
  required: ['reply'],
};

const PROMPT = `Sen — Olmaliq shahridagi "Olmaliq" ma'lumotnoma botining samimiy yordamchisisan. Hozir usta, do'kon egasi yoki xizmat ko'rsatuvchi o'zini BEPUL bazaga qo'shmoqda. Bazaga qo'shilganlarni odamlar bot orqali topadi va ularga qo'ng'iroq qiladi.

XARAKTER: iliq, hurmatli (sizlab), qisqa — 1–2 gap, ko'pi bilan bitta emoji. Foydalanuvchi qaysi tilda yozsa — shu tilda.

AJRATISH (bo'lmasa null):
- category: SOHALAR ro'yxatidan AYNAN bitta nom (ro'yxatda yo'q bo'lsa null). Masalan "men kafel teraman" → "Kafelchi".
- name: odam ismi yoki do'kon/ustaxona nomi, faqat aniq aytilgan bo'lsa.
- mahalla: aytilgan joy nomi, uning o'z so'zi bilan.
- workFrom/workTo: "HH:MM" formatida.
- services: qanday ishlar qiladi/nima sotadi (qisqa, vergul bilan).
- wantsOtherTopic: foydalanuvchi bazaga qo'shilishdan butunlay boshqa narsa so'rayapti.

QAT'IY: telefon raqam, narx yoki boshqa ma'lumotni O'YLAB TOPMA. "Qo'shildi" deb AYTMA — buni tizim aytadi. "reply" — "KEYINGI SAVOL"ni samimiy so'rasin; foydalanuvchi savol bersa (pullikmi? qancha odam ko'radi?) avval qisqa javob ber: qo'shilish bepul, Olmaliqdagi ko'plab odamlar bot orqali usta va xizmat qidiradi.
Javob: faqat JSON.`;

async function askAi(s: BizState, text: string, nextQuestion: string): Promise<AiOut | null> {
  const k = process.env.GEMINI_API_KEY;
  if (!k || k === 'your_gemini_api_key_here' || !reserveGeminiCallSlot()) return null;
  const cats = (await businessCategories()).map((c) => c.name).join(', ');
  const known = { soha: s.categoryName || null, nomi: s.name || null, mahalla: s.landmarkName || null };
  const abort = new AbortController();
  const t = setTimeout(() => abort.abort(), 7000);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': k, 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: `SOHALAR: ${cats}\nMA'LUM: ${JSON.stringify(known)}\nKEYINGI SAVOL: ${nextQuestion || "(yo'q)"}\nFOYDALANUVCHI XABARI: "${text.slice(0, 800)}"` }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: AI_SCHEMA, maxOutputTokens: 300, temperature: 0.4 },
      }),
      signal: abort.signal,
    });
    if (!res.ok) {
      console.warn(`⚠️ Biznes AI HTTP ${res.status}`);
      return null;
    }
    const j: any = await res.json();
    const raw = j.candidates?.[0]?.content?.parts?.[0]?.text;
    return raw ? (JSON.parse(raw) as AiOut) : null;
  } catch (err) {
    console.warn('⚠️ Biznes AI xatosi:', (err as Error).message);
    return null;
  } finally {
    clearTimeout(t);
  }
}

// ---------------------------------------------------------------- flow

function nextStep(s: BizState): Step {
  if (!s.categoryId) return 'category';
  if (!s.name) return 'name';
  if (!s.phone) return 'phone';
  if (!s.landmarkId) return 'landmark';
  if (!s.hoursDone && !s.workFrom) return 'hours';
  if (!s.servicesDone && !s.services) return 'services';
  if (!s.photosDone) return 'photos';
  return 'confirm';
}

const QUESTION: Record<Step, string> = {
  category: 'Qaysi sohada ishlaysiz? Masalan: santexnik, elektrik, kafe, kiyim do\'koni, sartaroshxona.',
  name: "Odamlar sizni qanday nom bilan topsin? Ismingiz yoki do'kon/ustaxona nomini yozing.",
  phone: "Mijozlar qaysi raqamga qo'ng'iroq qilsin? Raqamni yozing yoki pastdagi tugmani bosing.",
  landmark: "Qaysi mahallada ishlaysiz (yoki joylashgansiz)? Nomini yozing yoki ro'yxatdan tanlang.",
  hours: 'Ish vaqtingiz qanday? Masalan: «8 dan 20 gacha» yoki «24/7».',
  services: "Qanday ishlar qilasiz yoki nima sotasiz? Qisqacha yozing — odamlar shu so'zlar bilan ham topadi. Masalan: «kran, unitaz, quvur almashtirish».",
  photos: "Ishingiz yoki do'koningizdan 1–2 ta rasm yuboring — rasm ishonch uyg'otadi 📷",
  confirm: '',
};

function summary(s: BizState): string {
  const hours = s.workFrom && s.workTo ? (s.workFrom === '00:00' && s.workTo === '23:59' ? '24/7' : `${s.workFrom}–${s.workTo}`) : "ko'rsatilmagan";
  return (
    `<b>Ma'lumotingiz tayyor — tekshirib ko'ring:</b>\n\n` +
    `👤 ${esc(s.name || '')}\n🔧 ${esc(s.categoryName || '')}\n📞 ${esc(s.phone || '')}\n📍 ${esc(s.landmarkName || '')}\n🕐 ${hours}` +
    (s.services ? `\n🛠 ${esc(s.services)}` : '') +
    `\n📷 ${s.photos.length ? `${s.photos.length} ta rasm` : 'rasmsiz'}` +
    `\n\nO'zgartirish kerak bo'lsa, shunchaki yozing (masalan: «ish vaqti 9 dan 18 gacha»).`
  );
}

async function ask(ctx: Context, cityId: string, s: BizState, step: Step, aiReply?: string) {
  const text = aiReply?.trim() || QUESTION[step];
  if (step === 'phone') {
    await ctx.reply(text, { reply_markup: { keyboard: [[{ text: '📱 Raqamimni yuborish', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true } });
  } else if (step === 'landmark') {
    await ctx.reply(text, { reply_markup: new InlineKeyboard().text("📍 Mahallalar ro'yxati", 'biz:lmlist') });
  } else if (step === 'hours') {
    await ctx.reply(text, { reply_markup: new InlineKeyboard().text('🕗 8:00–20:00', 'biz:h:08:00-20:00').text('🕘 9:00–18:00', 'biz:h:09:00-18:00').row().text('🌙 24/7', 'biz:h:00:00-23:59').text("O'tkazib yuborish", 'biz:skip:hours') });
  } else if (step === 'services') {
    await ctx.reply(text, { reply_markup: new InlineKeyboard().text("O'tkazib yuborish", 'biz:skip:services') });
  } else if (step === 'photos') {
    await ctx.reply(text, { reply_markup: new InlineKeyboard().text(s.photos.length ? 'Rasmlar yetarli ✅' : 'Rasmsiz davom etish', 'biz:skip:photos') });
  } else if (step === 'confirm') {
    await ctx.reply(summary(s), { parse_mode: 'HTML', reply_markup: new InlineKeyboard().text('✅ Yuborish', 'biz:submit').text('❌ Bekor qilish', 'biz:cancel') });
  } else {
    await ctx.reply(text);
  }
}

async function applyText(s: BizState, text: string, cityId: string, step: Step) {
  const n = normalizeText(text);
  if (!s.categoryId || step === 'category' || /soha|kasb/.test(n)) {
    const c = await matchCategory(text);
    if (c) {
      s.categoryId = c.id;
      s.categoryName = c.name;
    }
  }
  const ph = extractPhone(text);
  if (ph) s.phone = ph;
  const lm = await matchLandmark(cityId, text);
  if (lm && (!s.landmarkId || /mahalla|mfy|mavze|dahasi/.test(n))) {
    s.landmarkId = lm.id;
    s.landmarkName = lm.name;
  }
  const h = extractHours(n);
  if (h) {
    s.workFrom = h.from;
    s.workTo = h.to;
  }
  // Aniq savolga to'g'ridan-to'g'ri javob (AI ishlamasa ham)
  const plain = text.trim();
  if (step === 'name' && !s.name && plain.length >= 2 && plain.length <= 60 && !ph) s.name = plain;
  if (step === 'services' && !s.services && plain.length >= 3 && !ph) s.services = plain.slice(0, 300);
}

async function applyAi(s: BizState, ai: AiOut, cityId: string, overwrite = false) {
  if ((!s.categoryId || overwrite) && ai.category) {
    const c = (await businessCategories()).find((x) => normalizeText(x.name) === normalizeText(ai.category!));
    if (c) {
      s.categoryId = c.id;
      s.categoryName = c.name;
    }
  }
  if ((!s.name || overwrite) && ai.name && ai.name.length >= 2 && ai.name.length <= 60) s.name = ai.name.trim();
  if (!s.landmarkId && ai.mahalla) {
    const lm = await matchLandmark(cityId, ai.mahalla);
    if (lm) {
      s.landmarkId = lm.id;
      s.landmarkName = lm.name;
    }
  }
  const hm = (x?: string | null) => (x && /^([01]\d|2[0-3]):[0-5]\d$/.test(x) ? x : undefined);
  if ((!s.workFrom || overwrite) && hm(ai.workFrom) && hm(ai.workTo)) {
    s.workFrom = hm(ai.workFrom);
    s.workTo = hm(ai.workTo);
  }
  if ((!s.services || overwrite) && ai.services && ai.services.length >= 3) s.services = ai.services.slice(0, 300);
}

async function submit(ctx: Context, s: BizState) {
  const uid = ctx.from!.id;
  try {
    const res = await fetch(`${INTERNAL_API}/api/internal/business`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-key': internalKey() },
      body: JSON.stringify({
        telegramId: String(uid),
        name: s.name,
        phone: s.phone,
        categoryId: s.categoryId,
        landmarkId: s.landmarkId,
        workFrom: s.workFrom,
        workTo: s.workTo,
        services: s.services,
        description: s.description,
        photoFileIds: s.photos,
        editId: s.editId,
      }),
    });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok || !j.success) {
      await ctx.reply(`Kechirasiz, yuborib bo'lmadi: ${j.message || 'texnik xato'} 🙏`);
      return;
    }
    await clearBizState(uid);
    await ctx.reply(
      s.editId
        ? "Rahmat! 🙏 Tuzatilgan ma'lumotingiz qayta ko'rib chiqishga yuborildi. Tasdiqlangach, shu yerda xabar beramiz."
        : "Rahmat! 🙏 Ma'lumotingiz qabul qilindi. Admin qisqa tekshiruvdan o'tkazadi — odatda bir kun ichida. Tasdiqlangach, shu yerda xabar beramiz va siz bazada chiqasiz 🙌"
    );
  } catch (err) {
    console.error('Biznes yuborish xatosi:', err);
    await ctx.reply("Kechirasiz, hozir texnik muammo bor 🙏 Birozdan keyin «Yuborish»ni qayta bosing.");
  }
}

// ---------------------------------------------------------------- entry points

const CANCEL_RE = /^(bekor|bekor qil|to'?xtat|kerak emas|stop|otmena)\b/;

/** Suhbatni boshlash (tugma, "Ha, qo'shing" yoki aniq ibora). */
export async function startBizFlow(ctx: Context, cityId: string, firstText?: string, categoryHint?: string) {
  const uid = ctx.from!.id;
  await clearRentState(uid);
  const s: BizState = { photos: [] };
  if (categoryHint) {
    const c = await matchCategory(categoryHint);
    if (c) {
      s.categoryId = c.id;
      s.categoryName = c.name;
    }
  }
  if (firstText) await applyText(s, firstText, cityId, 'category');
  await save(uid, s);
  await ctx.reply(
    "Ajoyib! 🙂 Sizni Olmaliq bazasiga bepul qo'shib qo'yaman — shunda kimdir sizning xizmatingizni qidirsa, bot sizni taklif qiladi. Bir necha qisqa savol beraman.",
    { reply_markup: { remove_keyboard: true } }
  );
  await ask(ctx, cityId, s, nextStep(s));
}

/** true — xabar shu suhbatda ishlandi. */
export async function handleBizText(ctx: Context, cityId: string, text: string): Promise<boolean> {
  const uid = ctx.from!.id;
  let s = await load(uid);
  const n = normalizeText(text);
  if (!s) {
    if (!detectBizIntent(text)) return false;
    await startBizFlow(ctx, cityId, text);
    return true;
  }
  if (CANCEL_RE.test(n)) {
    await clearBizState(uid);
    await ctx.reply("Mayli, to'xtatdim 🙂 Istalgan payt «o'zimni qo'shmoqchiman» deb yozsangiz, davom ettiramiz.", { reply_markup: { remove_keyboard: true } });
    return true;
  }

  const before = nextStep(s);
  const snapshot = JSON.stringify(s);
  await applyText(s, text, cityId, before);
  const ai = await askAi(s, text, QUESTION[before]);
  // Xulosa bosqichida yozilgan gap — tuzatish: mavjud maydonlar ham yangilanadi
  if (ai) await applyAi(s, ai, cityId, before === 'confirm');
  const changed = JSON.stringify(s) !== snapshot;

  if (!changed && ai?.wantsOtherTopic) {
    await save(uid, s);
    await ctx.reply("Qo'shilishni keyinroq davom ettirsak ham bo'ladi 🙂", { reply_markup: { remove_keyboard: true } });
    return false;
  }

  if (before === 'category' && !s.categoryId) {
    // Soha topilmadi — bir marta aniqlashtiramiz, keyin admin o'zi tanlashi uchun umumiy ro'yxatdan tanlatamiz
    await save(uid, s);
    await ctx.reply("Sohangizni bitta-ikkita so'z bilan yozing 🙏 Masalan: «santexnik», «kafe», «kiyim do'koni», «avtoservis», «repetitor».");
    return true;
  }

  const step = nextStep(s);
  await save(uid, s);
  if (before === 'phone' && s.phone) await ctx.reply('Rahmat, raqam saqlandi ✅', { reply_markup: { remove_keyboard: true } });
  await ask(ctx, cityId, s, step, step === before && step !== 'confirm' ? ai?.reply : undefined);
  return true;
}

export async function handleBizPhoto(ctx: Context, cityId: string): Promise<boolean> {
  const uid = ctx.from!.id;
  const s = await load(uid);
  const sizes = ctx.message?.photo;
  if (!s || !sizes?.length) return false;
  s.photos = [...s.photos, sizes[sizes.length - 1].file_id].slice(0, 5);
  await save(uid, s);
  const group = ctx.message?.media_group_id;
  if (group) {
    const first = await redisConnection.set(`kimbor:biz:mg:${group}`, '1', 'EX', 60, 'NX').catch(() => 'OK');
    if (first !== 'OK') return true;
    await new Promise((r) => setTimeout(r, 1500));
  }
  const fresh = (await load(uid)) || s;
  if (fresh.photosDone && nextStep(fresh) === 'confirm') {
    await ask(ctx, cityId, fresh, 'confirm');
    return true;
  }
  await ctx.reply(`📷 Rasm qabul qilindi (${fresh.photos.length} ta).`, { reply_markup: new InlineKeyboard().text('Rasmlar yetarli ✅', 'biz:skip:photos') });
  return true;
}

export async function handleBizContact(ctx: Context, cityId: string): Promise<boolean> {
  const uid = ctx.from!.id;
  const s = await load(uid);
  const c = ctx.message?.contact;
  if (!s || !c) return false;
  const ph = extractPhone(c.phone_number);
  if (ph) s.phone = ph;
  await save(uid, s);
  await ctx.reply('Rahmat, raqam saqlandi ✅', { reply_markup: { remove_keyboard: true } });
  await ask(ctx, cityId, s, nextStep(s));
  return true;
}

export async function handleBizCallback(ctx: Context, cityId: string, data: string): Promise<boolean> {
  if (!data.startsWith('biz:')) return false;
  const uid = ctx.from!.id;
  await ctx.answerCallbackQuery().catch(() => {});
  const s = await load(uid);
  if (!s) {
    await ctx.reply("Bu suhbat eskirib qolibdi 🙏 «O'zimni qo'shmoqchiman» deb yozing — qaytadan boshlaymiz.");
    return true;
  }
  if (data === 'biz:cancel') {
    await clearBizState(uid);
    await ctx.reply("Mayli, bekor qildim 🙂", { reply_markup: { remove_keyboard: true } });
    return true;
  }
  if (data === 'biz:lmlist') {
    await sendLandmarkPicker(ctx, cityId, 'biz');
    return true;
  }
  if (data.startsWith('biz:lm:')) {
    const lm = (await landmarks(cityId)).find((l) => l.id === data.slice(7));
    if (lm) {
      s.landmarkId = lm.id;
      s.landmarkName = lm.name;
      await ctx.editMessageText(`📍 ${lm.name}`).catch(() => {});
    }
  } else if (data.startsWith('biz:h:')) {
    const [from, to] = data.slice(6).split('-');
    s.workFrom = from;
    s.workTo = to;
  } else if (data === 'biz:skip:hours') s.hoursDone = true;
  else if (data === 'biz:skip:services') s.servicesDone = true;
  else if (data === 'biz:skip:photos') s.photosDone = true;
  else if (data === 'biz:submit') {
    if (nextStep(s) !== 'confirm') {
      await ask(ctx, cityId, s, nextStep(s));
      return true;
    }
    await ctx.editMessageReplyMarkup().catch(() => {});
    await ctx.reply('Yuboryapman… ⏳');
    await submit(ctx, s);
    return true;
  }
  await save(uid, s);
  await ask(ctx, cityId, s, nextStep(s));
  return true;
}

/** Admin rad etgan biznes ma'lumotini chatda tuzatish. */
export async function startBizFix(
  ctx: Context,
  cityId: string,
  l: { id: string; name: string; phone: string; categoryId: string; categoryName: string; primaryLandmarkId: string; workFrom: string | null; workTo: string | null; specificServices: string | null; rejectionNote: string | null }
) {
  const uid = ctx.from!.id;
  await clearRentState(uid);
  const lm = (await landmarks(cityId)).find((x) => x.id === l.primaryLandmarkId);
  const s: BizState = {
    editId: l.id,
    name: l.name,
    phone: l.phone,
    categoryId: l.categoryId,
    categoryName: l.categoryName,
    landmarkId: lm?.id,
    landmarkName: lm?.name,
    workFrom: l.workFrom || undefined,
    workTo: l.workTo || undefined,
    hoursDone: true,
    services: l.specificServices || undefined,
    servicesDone: true,
    photos: [],
    photosDone: true,
  };
  await save(uid, s);
  await ctx.reply(
    `Keling, birga tuzatamiz 🙂${l.rejectionNote ? `\n\n<b>Admin izohi:</b> ${esc(l.rejectionNote)}` : ''}\n\n` +
      `Noto'g'ri joyini shunchaki yozing — masalan: «ismim Akmal», «raqamim 90 123 45 67», «mahallam Kimyogar».`,
    { parse_mode: 'HTML' }
  );
  await ask(ctx, cityId, s, nextStep(s));
}

