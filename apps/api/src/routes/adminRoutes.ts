import { FastifyInstance } from 'fastify';
import { db, ListingType, VerificationStatus, Prisma } from '@kimbor/db';
import { notifyUsersOnNewListingAdded, clusterUnresolvedQueries, resolveCanonicalCategoryName, stripLandmarkSuffixes, getDictionarySynonymsForCategory, getExactCanonicalCategoryLookup, USEFUL_BOTS, normalizeText, levenshteinDistance, zeroLayerFilter, classifyQuery, searchListings, isSelfOffer, isJobVacancy, isUtilityStatusQuestion, extractRequestedBadges, extractRentalFilters, detectEmergencyCategory, isValidEmergencyCategory, CORE_EMERGENCY_KEYS, findLocalDispatcherMatch, findContainingLandmark, findAreaListings, isAreaBrowseQuery } from '@kimbor/core';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { verifyTelegramInitData, verifyPassword, hashPassword, authenticateRequest, issueSessionCookie, clearSessionCookie } from './authSecurity';
import { UPLOADS_DIR } from '../uploadsPath';

const ALLOWED_PHOTO_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// Javob ichidagi ("steps" massivi ichida chuqur joylashgan bo'lishi mumkin)
// barcha matn maydonlarini yig'ib oladi — Gemini "Interactions API"ning
// aniq javob sxemasi hali to'liq hujjatlashtirilmagan (2026-09), shuning
// uchun qat'iy bitta yo'l o'rniga CHIDAMLI, chuqur qidiruv ishlatiladi.
function extractAllTextFields(obj: any, acc: string[] = []): string[] {
  if (!obj) return acc;
  if (Array.isArray(obj)) {
    for (const item of obj) extractAllTextFields(item, acc);
    return acc;
  }
  if (typeof obj === 'object') {
    if (typeof obj.text === 'string') acc.push(obj.text);
    for (const key of Object.keys(obj)) {
      if (key !== 'text') extractAllTextFields(obj[key], acc);
    }
  }
  return acc;
}

/**
 * Gemini'ning "URL Context" vositasi orqali bitta havolani tekshiradi —
 * Google'ning o'z serveri havolaga "kirib" tarkibini o'qiydi (bizning
 * serverimiz emas, xavfsizroq) va Google Safe Browsing asosidagi xavfsizlik
 * belgisi bilan birga tahlil qiladi. FAQAT admin "Tahlil qil" bosganda
 * chaqiriladi (avtomatik emas).
 *
 * MUHIM (2026-09): bu — yangi "Interactions API" (v1beta/interactions),
 * klassik generateContent'dan FARQLI endpoint. Javob sxemasi rasmiy
 * hujjatlarda hali to'liq misolsiz tasvirlangan, shuning uchun quyidagi
 * parsing CHIDAMLI (aniq bitta maydon nomiga tayanmaydi) qilib yozilgan.
 * Gemini kreditlari tiklangach, jonli javobni ko'rib, kerak bo'lsa
 * aniqlashtiriladi.
 */
async function analyzeLinkWithGemini(url: string, geminiKey: string): Promise<string> {
  const prompt =
    `Ushbu havolani tekshir (URL Context orqali havolaning o'ziga kirib tarkibini o'qi). ` +
    `Bu nima ekanini (sayt, fayl, ijtimoiy tarmoq sahifasi va h.k.) va XAVFLI (firibgarlik, fishing, ` +
    `viruslangan fayl) yoki ODDIY/ZARARSIZ ekanini aniqla. Javobni O'ZBEK TILIDA, 1-2 QISQA GAP bilan, ` +
    `albatta "XULOSA:" so'zidan boshlab yoz.\n\nHavola: ${url}`;

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 15000);

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'x-goog-api-key': geminiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-3.5-flash',
        input: prompt,
        tools: [{ type: 'url_context' }],
      }),
      signal: abortController.signal,
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      throw new Error(`Gemini HTTP ${response.status}: ${bodyText.slice(0, 300)}`);
    }

    const json = await response.json();
    const allText = extractAllTextFields(json).join('\n');
    const xulosaIdx = allText.indexOf('XULOSA:');
    const summary = xulosaIdx >= 0 ? allText.slice(xulosaIdx) : allText;
    const trimmed = summary.trim().slice(0, 500);
    return trimmed || 'AI javob berdi, lekin matn topilmadi (javob tuzilishi kutilganidan farqli bo\'lishi mumkin).';
  } finally {
    clearTimeout(timeout);
  }
}

const LANDMARK_SYNONYM_SCHEMA = { type: 'ARRAY', items: { type: 'STRING' } };
const MESSAGE_TEMPLATE_SCHEMA = { type: 'ARRAY', items: { type: 'STRING' } };

// "Mahalliy raqamlar" — admin "AI'dan taklif so'rash" bosganda, shu
// raqamga mos 3 ta QISQA xabar shablonini taklif qiladi (mavzuga mos
// emoji bilan). MUHIM: {phone} joy-belgisi HAR DOIM aynan shu ko'rinishda
// qaytishi kerak — bot buni haqiqiy raqamga almashtiradi, shuning uchun
// promptda buni ANIQ, qat'iy talab qilib so'raymiz.
async function suggestLocalNumberTemplatesWithGemini(label: string, geminiKey: string): Promise<string[]> {
  const prompt =
    `Sen O'zbek tilida Telegram bot uchun juda qisqa, chiroyli xabar shablonlari yozasan. ` +
    `"${label}" degan mahalliy xizmat/tashkilot nomi uchun 3 xil variant taklif qil. ` +
    `Har bir variant QAT'IY shu qoidalarga bo'ysunsin: ` +
    `1) Mavzuga ANIQ mos keladigan BITTA emoji bilan boshlansin (masalan gaz uchun 🔥, suv uchun 💧, elektr uchun ⚡). ` +
    `2) Telegram HTML formatida, tashkilot nomini <b>qalin</b> qilib yozsin. ` +
    `3) Telefon raqami o'rniga ANIQ "{phone}" so'zini (jingalak qavslar bilan, aynan shu yozilishda) ishlatsin — buni HECH QACHON boshqa narsaga almashtirma yoki tarjima qilma. ` +
    `4) Juda qisqa bo'lsin — 2-3 qatordan oshmasin, hech qanday ogohlantirish yoki ko'rsatma (nima qiling/qilmang) YOZMA, faqat nomi va raqam. ` +
    `3 ta variant bir-biridan FARQLI uslubda (emoji, formatlash) bo'lsin. Faqat JSON massiv (3 ta satr) qaytar, boshqa hech qanday matn yozma.`;

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 10000);
  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
      {
        method: 'POST',
        headers: { 'x-goog-api-key': geminiKey, 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: MESSAGE_TEMPLATE_SCHEMA,
            maxOutputTokens: 400,
          },
        }),
        signal: abortController.signal,
      }
    );

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      throw new Error(`Gemini HTTP ${response.status}: ${bodyText.slice(0, 300)}`);
    }

    const json = await response.json();
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return [];
    const parsed = JSON.parse(rawText);
    if (!Array.isArray(parsed)) return [];
    // Xavfsizlik: {phone} joy-belgisi yo'q variant qabul qilinmaydi —
    // aks holda bot telefon raqamini umuman ko'rsatmay qo'yishi mumkin.
    return parsed
      .map((s: any) => String(s).trim())
      .filter((s: string) => s && s.includes('{phone}'))
      .slice(0, 3);
  } finally {
    clearTimeout(timeout);
  }
}

// Mo'ljal (Manzil) uchun mahalliy/jargon nomlarni Gemini'dan so'raydi —
// FAQAT admin "AI so'z taklif qilsin" tugmasini bosganda ishlaydi
// (avtomatik emas). Xatolik yoki bo'sh javob holatida bo'sh massiv
// qaytaradi — chaqiruvchi (UI) buni "hech narsa topilmadi" deb ko'rsatadi.
async function suggestLandmarkSynonymsWithGemini(
  landmarkName: string,
  existing: string[],
  geminiKey: string
): Promise<string[]> {
  const prompt =
    `Sen O'zbekistondagi bir shahar (Olmaliq)dagi mahalliy joy nomlarini yaxshi bilasan. ` +
    `"${landmarkName}" degan manzil/mo'ljal uchun odamlar KUNDALIK SO'ZLASHUVDA, JARGON tilida ` +
    `qanday nomlar bilan chaqirishi mumkinligini o'yla (qisqartma, eski nom, xalq orasidagi taxallus kabi). ` +
    `Faqat HAQIQATAN HAM ishlatilishi mumkin bo'lgan, 3-5 ta variantni kichik harflarda taklif qil. ` +
    `Bular ALLAQACHON bor: ${existing.length ? existing.join(', ') : "(yo'q)"} — shularni TAKRORLAMA. ` +
    `Agar ishonchli variant topolmasang, bo'sh massiv qaytar. Faqat JSON massiv qaytar, boshqa hech qanday matn yozma.`;

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 10000);
  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
      {
        method: 'POST',
        headers: { 'x-goog-api-key': geminiKey, 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: LANDMARK_SYNONYM_SCHEMA,
            maxOutputTokens: 200,
          },
        }),
        signal: abortController.signal,
      }
    );

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      throw new Error(`Gemini HTTP ${response.status}: ${bodyText.slice(0, 300)}`);
    }

    const json = await response.json();
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return [];
    const parsed = JSON.parse(rawText);
    if (!Array.isArray(parsed)) return [];
    const existingLower = new Set(existing.map((s) => s.toLowerCase()));
    return parsed
      .map((s: any) => String(s).toLowerCase().trim())
      .filter((s: string) => s && !existingLower.has(s))
      .slice(0, 5);
  } finally {
    clearTimeout(timeout);
  }
}

// moderatorRoutes.ts'dagi bilan bir xil tekshiruv — ommaviy xabar
// (broadcast) yuborish kuchli, xavfli amal, faqat Super-Admin uchun.
async function requireSuperAdmin(req: any, reply: any): Promise<boolean> {
  const { user, error } = await authenticateRequest(req);
  if (error) {
    reply.status(error.status).send(error.body);
    return false;
  }
  if (user.role !== 'SUPER_ADMIN') {
    reply.status(403).send({ success: false, message: "Faqat Super-Admin uchun 🔒" });
    return false;
  }
  return true;
}

// MUHIM (2026-09, professional audit orqali topilgan KRITIK xato):
// yozuvlar/kategoriyalar/so'rovlar bilan ishlaydigan asosiy CRUD
// route'larning HECH BIRIDA autentifikatsiya tekshiruvi YO'Q edi —
// login qilmagan HAR QANDAY kishi (internetdagi istalgan odam, chunki
// /api/* Caddy orqali to'liq ochiq) yozuvlarni o'chira, tahrirlashi
// (masalan ustaning telefon raqamini o'zinikiga almashtirib qo'yishi —
// firibgarlik xavfi) yoki yangi axlat yozuv qo'sha olardi. Bu — real,
// hoziroq ishlaydigan teshik edi (kod o'qib tasdiqlangan).
//
// `requireSuperAdmin`dan farqli o'laroq, bu tekshiruv istalgan ADMIN
// rolini (CITY_ADMIN ham, SUPER_ADMIN ham) qabul qiladi — chunki
// yozuv/kategoriya boshqaruvi shahar administratorining kundalik ishi,
// faqat Super-Adminga xos emas (broadcast/bot-xabar shabloni kabi
// butun tizimga ta'sir qiluvchi amallardan farqli).
async function requireAdmin(req: any, reply: any): Promise<boolean> {
  const { user, error } = await authenticateRequest(req);
  if (error) {
    reply.status(error.status).send(error.body);
    return false;
  }
  if (user.role === 'USER') {
    reply.status(403).send({ success: false, message: 'Faqat administratorlar uchun 🔒' });
    return false;
  }
  return true;
}

// Login bloklanish muddatini o'qishga qulay shaklga o'tkazadi (masalan "2 kun 5 soat")
function formatRemainingTime(until: Date): string {
  const ms = until.getTime() - Date.now();
  if (ms <= 0) return 'bir necha soniya';
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${days} kun ${hours} soat`;
  if (hours > 0) return `${hours} soat`;
  const minutes = Math.max(1, Math.floor(ms / (60 * 1000)));
  return `${minutes} daqiqa`;
}

export async function adminRoutes(fastify: FastifyInstance) {
  const SUPER_ADMIN_IDS = [BigInt(6355516451), BigInt(8323651390), BigInt(5369180248)];
  const isSuperAdminId = (id?: bigint | null) => (id ? SUPER_ADMIN_IDS.some((a) => a === id) : false);

  // Utility for resolving cityId safely
  // - Haqiqiy autentifikatsiya orqali o'ziga tegishli cityId ishlatadi
  // - Sessiya topilmasa (masalan initData yo'q), Olmaliqqa tushadi (yagona shahar)
  const getCityId = async (req: any): Promise<string> => {
    const { user } = await authenticateRequest(req);
    if (user) {
      req.user = user;
      if (user.cityId) return user.cityId;
    }
    const defaultCity = await db.city.findFirst({ where: { slug: 'olmaliq' } });
    return defaultCity ? defaultCity.id : 'default_city';
  };

  // --- 1. AUTHENTICATION ---
  // "Kirishlar tarixi" (2026-09) — har bir muvaffaqiyatli kirish (Telegram
  // ichida yoki oddiy saytdan) mavjud AuditLog jadvaliga yoziladi. MUHIM:
  // bu FAQAT muvaffaqiyatli, YANGI sessiya yaratilgan paytda chaqiriladi
  // (authenticateRequest() har bir so'rovda emas) — aks holda jurnal
  // foydasiz shovqinga aylanardi.
  async function writeLoginAuditLog(req: any, dbUser: { id: string; cityId: string | null }, method: 'telegram' | 'web') {
    const ua = (req.headers['user-agent'] || '').toString();
    const ip = ((req.headers['x-forwarded-for'] as string) || req.ip || '').split(',')[0].trim();
    try {
      await db.auditLog.create({
        data: {
          userId: dbUser.id,
          cityId: dbUser.cityId || undefined,
          action: 'LOGIN',
          details: { method },
          deviceInfo: ua.slice(0, 255),
          ipAddress: ip.slice(0, 64),
        },
      });
    } catch (err) {
      console.error('Failed to write login audit log:', err);
    }
  }

  fastify.post('/auth/telegram', async (req: any, reply) => {
    const { initData } = req.body;
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) return reply.status(500).send({ success: false, message: 'BOT_TOKEN env variable is not configured' });

    if (!initData) {
      return reply.status(401).send({ success: false, accessDenied: true, message: 'initData required' });
    }

    try {
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');
      urlParams.delete('hash');

      // Sort params alphabetically
      const paramsArray = Array.from(urlParams.entries());
      paramsArray.sort((a, b) => a[0].localeCompare(b[0]));
      const dataCheckString = paramsArray.map(([k, v]) => `${k}=${v}`).join('\n');

      // HMAC-SHA256 signature verification
      const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
      const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

      const isValid = calculatedHash === hash;

      if (!isValid) {
        return reply.status(401).send({ success: false, accessDenied: true, message: 'Invalid Telegram HMAC signature' });
      }

      const userParam = urlParams.get('user');
      if (!userParam) {
        return reply.status(401).send({ success: false, accessDenied: true, message: 'Telegram user param missing' });
      }

      const tgUser = JSON.parse(userParam);
      const telegramUserId = BigInt(tgUser.id);

      // Lookup user in User table (agar mavjud bo'lmasa yoki oddiy USER bo'lsa ham
      // bloklanmaydi — parolning o'zi haqiqiy himoya, kirish urinishi shu yerda rad
      // etilmaydi, faqat /auth/login bosqichida parol tekshiriladi)
      const dbUser = await db.user.findUnique({
        where: { telegramId: telegramUserId },
        include: { city: true },
      });

      const userInfo = dbUser
        ? {
            id: dbUser.id,
            telegramId: dbUser.telegramId.toString(),
            name: `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim() || 'Admin',
            role: dbUser.role,
            cityId: dbUser.cityId || 'default_city',
            cityName: dbUser.city?.name || 'Olmaliq',
          }
        : {
            id: '',
            telegramId: telegramUserId.toString(),
            name: `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() || 'Admin',
            role: 'USER',
            cityId: 'default_city',
            cityName: 'Olmaliq',
          };

      // Ko'p marta xato parol kiritilgan bo'lsa — parol ekranini ko'rsatishdan
      // oldin ham bloklanganini bildiramiz (foydalanuvchi behuda urinmasin)
      const loginAttempt = await db.loginAttempt.findUnique({ where: { telegramId: telegramUserId } });
      if (loginAttempt?.bannedUntil && loginAttempt.bannedUntil > new Date()) {
        return {
          success: true,
          banned: true,
          bannedMessage: `Ko'p marta xato parol kiritildi. ${formatRemainingTime(loginAttempt.bannedUntil)} keyin qayta urining.`,
          user: userInfo,
        };
      }

      // ESKI IZOH (endi noto'g'ri): "parol o'rnatilmagan foydalanuvchi alohida
      // 'parol o'rnatish' ekraniga yo'naltiriladi" degan mantiq shu yerda edi.
      // Bu holat frontend'dagi eski, endi qo'llanilmaydigan bir martalik kod
      // (oneTimePass) shaklidagi "parol o'rnatish" oynasiga olib borar edi —
      // /auth/setup-password esa allaqachon soddalashtirilgan (faqat yagona
      // `password` maydonini kutadi, hech qanday bir martalik kodni
      // tekshirmaydi). Natijada bu yo'lga tushib qolgan HAR QANDAY
      // foydalanuvchi (masalan parol hali qo'yilmagan SUPER_ADMIN akkaunti)
      // umuman kira olmaydigan chiqmas ko'chaga kirib qolar edi. Endi bunday
      // ajratish umuman qilinmaydi — yagona `ADMIN_PASSWORD` orqali kirish
      // /auth/login'da HAR QANDAY holatda (parol qo'yilgan yoki qo'yilmagan)
      // ishlaydi, shuning uchun hammaga bir xil oddiy parol ekrani yetarli.
      return {
        success: true,
        requiresPassword: true,
        user: userInfo,
      };
    } catch (err) {
      return reply.status(401).send({ success: false, accessDenied: true, message: 'Auth parsing error' });
    }
  });

  fastify.post('/auth/login', async (req: any, reply) => {
    const { initData, password } = req.body;

    if (!initData || !password) {
      return reply.status(400).send({ success: false, message: 'initData va parol talab qilinadi' });
    }

    const { isValid, telegramId, userRaw } = verifyTelegramInitData(initData);
    if (!isValid || !telegramId) {
      return reply.status(401).send({ success: false, accessDenied: true, message: 'Telegram imzo (HMAC) xatosi 🔒' });
    }

    // 0. Brute-force himoyasi: 5 marta xato parol kiritilsa, 3 kunga bloklanadi.
    const existingAttempt = await db.loginAttempt.findUnique({ where: { telegramId } });
    if (existingAttempt?.bannedUntil && existingAttempt.bannedUntil > new Date()) {
      return reply.status(403).send({
        success: false,
        banned: true,
        message: `Ko'p marta xato parol kiritildi. ${formatRemainingTime(existingAttempt.bannedUntil)} keyin qayta urining.`,
      });
    }

    // 1. Yagona admin paroli (.env: ADMIN_PASSWORD) — to'g'ri kiritilsa, shu Telegram
    // foydalanuvchisi to'liq admin huquqi bilan yoziladi/yangilanadi.
    const adminPassword = process.env.ADMIN_PASSWORD;
    let resultUser: any = null;

    if (adminPassword && password === adminPassword) {
      const olmaliq = await db.city.findFirst({ where: { slug: 'olmaliq' } });
      const dbUser = await db.user.upsert({
        where: { telegramId },
        // cityId ham yangilanadi — agar bu hisob avval (masalan botga
        // /start bosib) cityId=null bilan yaratilgan bo'lsa ham, bu yerda
        // to'g'irlanadi (2026-09 tuzatildi, batafsil: index.ts).
        update: { role: 'SUPER_ADMIN', isSuspended: false, cityId: olmaliq?.id },
        create: {
          telegramId,
          firstName: userRaw?.first_name || 'Admin',
          lastName: userRaw?.last_name || '',
          username: userRaw?.username || null,
          role: 'SUPER_ADMIN',
          cityId: olmaliq?.id,
          isPasswordSet: true,
        },
        include: { city: true },
      });
      resultUser = dbUser;
    } else {
      // 2. Oldindan tayinlangan (masalan moderator) shaxsiy paroli
      const dbUser = await db.user.findUnique({ where: { telegramId }, include: { city: true } });
      if (dbUser && dbUser.role !== 'USER' && !dbUser.isSuspended && dbUser.passwordHash && verifyPassword(password, dbUser.passwordHash)) {
        resultUser = dbUser;
      }
    }

    if (resultUser) {
      // To'g'ri parol — oldingi xato urinishlar hisobi tozalanadi
      if (existingAttempt) {
        await db.loginAttempt.delete({ where: { telegramId } }).catch(() => {});
      }
      await writeLoginAuditLog(req, { id: resultUser.id, cityId: resultUser.cityId }, 'telegram');
      return {
        success: true,
        user: {
          id: resultUser.id,
          telegramId: resultUser.telegramId.toString(),
          name: `${resultUser.firstName || ''} ${resultUser.lastName || ''}`.trim() || 'Admin',
          role: resultUser.role,
          cityId: resultUser.cityId || 'default_city',
          cityName: resultUser.city?.name || 'Olmaliq',
        },
      };
    }

    // Xato parol — urinishlar sonini oshiramiz, 5 taga yetsa 3 kunga bloklaymiz
    const newFailedCount = (existingAttempt?.failedCount || 0) + 1;
    const shouldBan = newFailedCount >= 5;
    const bannedUntil = shouldBan ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : null;

    await db.loginAttempt.upsert({
      where: { telegramId },
      update: { failedCount: shouldBan ? 0 : newFailedCount, bannedUntil, lastAttemptAt: new Date() },
      create: { telegramId, failedCount: shouldBan ? 0 : newFailedCount, bannedUntil },
    });

    if (shouldBan) {
      return reply.status(403).send({
        success: false,
        banned: true,
        message: `Ko'p marta xato parol kiritildi. ${formatRemainingTime(bannedUntil!)} keyin qayta urining.`,
      });
    }

    return reply.status(401).send({ success: false, message: "Parol noto'g'ri!" });
  });

  fastify.post('/auth/setup-password', async (req: any, reply) => {
    const { initData, password } = req.body;
    if (!initData || !password || password.length < 6) {
      return reply.status(400).send({ success: false, message: "Parol kamida 6 belgidan iborat bo'lishi kerak" });
    }

    const { isValid, telegramId } = verifyTelegramInitData(initData);
    if (!isValid || !telegramId) {
      return reply.status(401).send({ success: false, accessDenied: true, message: 'Telegram imzo (HMAC) xatosi 🔒' });
    }

    const dbUser = await db.user.findUnique({ where: { telegramId } });
    if (!dbUser || dbUser.role === 'USER' || dbUser.isSuspended) {
      return reply.status(403).send({ success: false, accessDenied: true, message: 'Ruxsat berilmadi! 🔒' });
    }

    const passwordHash = hashPassword(password);
    await db.user.update({
      where: { telegramId },
      data: {
        passwordHash,
        isPasswordSet: true,
      },
    });

    return { success: true, message: "Parol o'rnatildi!" };
  });

  // --- STANDALONE WEB-LOGIN (2026-09) ---
  // Admin panelga Telegram tashqarisida, oddiy brauzerdan (masalan
  // https://olmaliq.online) kirish uchun. Telegram initData'ga
  // bog'liq EMAS — buning o'rniga admin avval (Telegram orqali, allaqachon
  // tasdiqlangan holda) o'zi tanlagan login+parolni o'rnatadi
  // (`/auth/set-login-username`), keyin shu login+parol bilan istalgan
  // brauzerdan kirishi mumkin (`/auth/web-login`).

  // Admin (Telegram orqali allaqachon kirgan holda) o'zining sayt-login
  // ismini o'rnatadi/o'zgartiradi. Parol allaqachon o'rnatilgan bo'lishi
  // shart (`/auth/setup-password` orqali) — web-login xuddi shu
  // parolni ishlatadi, alohida parol talab qilinmaydi.
  fastify.post('/auth/set-login-username', async (req: any, reply) => {
    if (!await requireAdmin(req, reply)) return;
    const { loginUsername } = req.body;
    const clean = (loginUsername || '').trim().toLowerCase();
    if (!/^[a-z0-9_]{4,32}$/.test(clean)) {
      return reply.status(400).send({
        success: false,
        message: "Login 4-32 belgi, faqat lotin harflari/raqam/pastki chiziqdan iborat bo'lishi kerak",
      });
    }
    if (!req.user.passwordHash) {
      return reply.status(400).send({ success: false, message: "Avval yuqoridagi \"Parol\" bo'limidan parol o'rnating" });
    }
    const existing = await db.user.findUnique({ where: { loginUsername: clean } });
    if (existing && existing.id !== req.user.id) {
      return reply.status(409).send({ success: false, message: 'Bu login band, boshqasini tanlang' });
    }
    await db.user.update({ where: { id: req.user.id }, data: { loginUsername: clean } });
    return { success: true, loginUsername: clean };
  });

  // Joriy adminning sayt-login holatini ko'rsatish (o'rnatilganmi, qaysi login).
  fastify.get('/auth/login-username', async (req: any, reply) => {
    if (!await requireAdmin(req, reply)) return;
    return { success: true, loginUsername: req.user.loginUsername || null };
  });

  fastify.post('/auth/web-login', async (req: any, reply) => {
    const { loginUsername, password } = req.body;
    const clean = (loginUsername || '').trim().toLowerCase();
    if (!clean || !password) {
      return reply.status(400).send({ success: false, message: 'Login va parol talab qilinadi' });
    }

    const dbUser = await db.user.findUnique({ where: { loginUsername: clean }, include: { city: true } });
    if (!dbUser || dbUser.role === 'USER' || dbUser.isSuspended || !dbUser.passwordHash) {
      return reply.status(401).send({ success: false, message: "Login yoki parol noto'g'ri" });
    }

    // Xuddi shu brute-force himoyasi (Telegram-login bilan bir xil jadval,
    // telegramId orqali baham ko'riladi) — 5 marta xato bo'lsa 3 kunga bloklaydi.
    const existingAttempt = await db.loginAttempt.findUnique({ where: { telegramId: dbUser.telegramId } });
    if (existingAttempt?.bannedUntil && existingAttempt.bannedUntil > new Date()) {
      return reply.status(403).send({
        success: false,
        banned: true,
        message: `Ko'p marta xato parol kiritildi. ${formatRemainingTime(existingAttempt.bannedUntil)} keyin qayta urining.`,
      });
    }

    if (!verifyPassword(password, dbUser.passwordHash)) {
      const newFailedCount = (existingAttempt?.failedCount || 0) + 1;
      const shouldBan = newFailedCount >= 5;
      const bannedUntil = shouldBan ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : null;
      await db.loginAttempt.upsert({
        where: { telegramId: dbUser.telegramId },
        update: { failedCount: shouldBan ? 0 : newFailedCount, bannedUntil, lastAttemptAt: new Date() },
        create: { telegramId: dbUser.telegramId, failedCount: shouldBan ? 0 : newFailedCount, bannedUntil },
      });
      if (shouldBan) {
        return reply.status(403).send({
          success: false,
          banned: true,
          message: `Ko'p marta xato parol kiritildi. ${formatRemainingTime(bannedUntil!)} keyin qayta urining.`,
        });
      }
      return reply.status(401).send({ success: false, message: "Login yoki parol noto'g'ri" });
    }

    if (existingAttempt) {
      await db.loginAttempt.delete({ where: { telegramId: dbUser.telegramId } }).catch(() => {});
    }

    issueSessionCookie(req, reply, dbUser);
    await writeLoginAuditLog(req, { id: dbUser.id, cityId: dbUser.cityId }, 'web');
    return {
      success: true,
      user: {
        id: dbUser.id,
        telegramId: dbUser.telegramId.toString(),
        name: `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim() || 'Admin',
        role: dbUser.role,
        cityId: dbUser.cityId || 'default_city',
        cityName: dbUser.city?.name || 'Olmaliq',
      },
    };
  });

  // Sahifa yuklanganda (Telegram konteksti yo'q holatda) mavjud sessiya
  // cookie'si hali kuchdami — tekshirish uchun.
  fastify.get('/auth/session', async (req: any, reply) => {
    const { user, error } = await authenticateRequest(req);
    if (error) {
      return reply.status(error.status).send(error.body);
    }
    return {
      success: true,
      user: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin',
        role: user.role,
        cityId: user.cityId || 'default_city',
        cityName: user.city?.name || 'Olmaliq',
      },
    };
  });

  fastify.post('/auth/logout', async (req: any, reply) => {
    clearSessionCookie(reply);
    return { success: true };
  });

  // --- 1.2 TEST CHECKOUT & CREDENTIAL GENERATION (Section 2 & 3) ---
  fastify.post('/auth/test-checkout', async (req: any, reply) => {
    const { planType, telegramUserId } = req.body;
    const tgUserId = telegramUserId ? BigInt(telegramUserId) : BigInt(6355516451);

    // Generate 6-digit login code and 6-letter password
    const loginCode = Math.floor(100000 + Math.random() * 900000).toString();
    const charset = 'abcdefghjkmnpqrstuvwxy';
    let tempPassword = '';
    for (let i = 0; i < 6; i++) {
      tempPassword += charset[Math.floor(Math.random() * charset.length)];
    }

    // Upsert Admin User in DB
    const dbUser = await db.user.upsert({
      where: { telegramId: tgUserId },
      update: {
        loginCode,
        tempPassword,
        role: isSuperAdminId(tgUserId) ? 'SUPER_ADMIN' : 'CITY_ADMIN',
      },
      create: {
        telegramId: tgUserId,
        firstName: 'Test',
        lastName: 'Admin',
        role: isSuperAdminId(tgUserId) ? 'SUPER_ADMIN' : 'CITY_ADMIN',
        loginCode,
        tempPassword,
      },
    });

    // Send credentials via Telegram Bot API
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) throw new Error('BOT_TOKEN env variable is not configured');
    const appUrl = process.env.WEBAPP_URL || 'https://7d0905ff78ad33.lhr.life';

    const credMessage = `✅ **To'lov qabul qilindi**\n\n` +
      `Kirish ma'lumotlaringiz:\n` +
      `**Login**: \`${loginCode}\`\n` +
      `**Parol**: \`${tempPassword}\`\n\n` +
      `Bu ma'lumotlarni saqlab qo'ying.`;

    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: tgUserId.toString(),
          text: credMessage,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '🔐 Panelga kirish', url: appUrl }]],
          },
        }),
      });
    } catch (e) {
      console.error('Failed to send Telegram credentials message:', e);
    }

    return {
      success: true,
      credentials: { loginCode, tempPassword },
    };
  });

  // --- 2. STATS & ANALYTICS ---
  // "Tizim salomatligi" vidjeti (2026-09) — real production'da aynan shu
  // narsalar tekshirilmagani sabab (GEMINI_API_KEY o'chib qolgani,
  // webhook'ning allowed_updates noto'g'ri sozlangani) topilishi
  // SOATLAB/KUNLAB SSH orqali qo'lda qidiruv talab qilgan real xatolarga
  // sabab bo'lgan. Endi admin bularni Dashboard'da bir qarashda ko'radi.
  fastify.get('/admin/system-health', async (req: any, reply) => {
    if (!await requireAdmin(req, reply)) return;
    const cityId = await getCityId(req);

    // 1. Gemini API kaliti
    const geminiKey = process.env.GEMINI_API_KEY || '';
    const geminiConfigured = geminiKey.length > 0 && !['your_gemini_api_key_here', 'mock_key'].includes(geminiKey);

    // 2. Telegram webhook holati (bot.api.setWebhook orqali sozlangan)
    let webhook: any = { reachable: false };
    const botToken = process.env.BOT_TOKEN;
    if (botToken) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
        const data = await res.json();
        if (data.ok) {
          const info = data.result;
          webhook = {
            reachable: true,
            urlSet: !!info.url,
            hasCallbackQuery: Array.isArray(info.allowed_updates)
              ? info.allowed_updates.includes('callback_query')
              : true, // bo'sh massiv = HAMMASI (Telegram standart xulqi)
            pendingUpdateCount: info.pending_update_count,
            lastErrorMessage: info.last_error_message || null,
            lastErrorDate: info.last_error_date ? new Date(info.last_error_date * 1000).toISOString() : null,
          };
        }
      } catch (err) {
        webhook = { reachable: false, error: 'Telegram API bilan aloqa xatosi' };
      }
    }

    // 3. Broadcast navbati — muddati o'tgan (5+ daqiqa) lekin hali
    // yuborilmagan xabarlar bo'lsa, bu worker ishlamay qolganining belgisi.
    const now = new Date();
    const overdueThreshold = new Date(now.getTime() - 5 * 60 * 1000);
    const overdueBroadcasts = await db.broadcastMessage.count({
      where: {
        isEnabled: true,
        nextSendAt: { lt: overdueThreshold },
      },
    }).catch(() => 0);

    // 4. Baza aloqasi (bu so'rovning o'zi allaqachon buni sinaydi, lekin
    // aniq belgi sifatida alohida ham tekshiramiz)
    let dbReachable = true;
    try {
      await db.$queryRaw`SELECT 1`;
    } catch {
      dbReachable = false;
    }

    // 5. Javob berish darajasi — oxirgi 24 soatda botning HAQIQIY qanchalik
    // yaxshi javob berayotgani (bazada topilgan / umuman topilmagan nisbati).
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [totalQueries, resolvedQueries] = await Promise.all([
      db.queryLog.count({ where: { cityId, createdAt: { gte: oneDayAgo } } }),
      db.queryLog.count({ where: { cityId, createdAt: { gte: oneDayAgo }, isResolved: true } }),
    ]);
    const responseRate = totalQueries > 0 ? Math.round((resolvedQueries / totalQueries) * 100) : null;

    return {
      success: true,
      gemini: { configured: geminiConfigured },
      webhook,
      broadcastQueue: { overdueCount: overdueBroadcasts, healthy: overdueBroadcasts === 0 },
      database: { reachable: dbReachable },
      responseRate: { last24h: responseRate, totalQueries, resolvedQueries },
    };
  });

  fastify.get('/admin/stats', async (req: any, reply) => {
    const cityId = await getCityId(req);
    const { period } = req.query || {};

    let periodStart: Date | undefined;
    if (period === 'today') {
      periodStart = new Date();
      periodStart.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
    const periodFilter = periodStart ? { createdAt: { gte: periodStart } } : {};

    const activeListings = await db.listing.count({ where: { cityId, status: 'ACTIVE' } });
    const totalQuestions = await db.queryLog.count({ where: { cityId, ...periodFilter } });
    const unresolvedRequests = await db.queryLog.count({ where: { cityId, isResolved: false, ...periodFilter } });
    const pendingCandidates = await db.candidate.count({ where: { cityId, status: 'PENDING' } });
    const totalCategories = await db.category.count();
    // MUHIM: bu yerda BARCHA (rolidan qat'i nazar) botga /start bosgan
    // foydalanuvchilar hisoblanadi — admin/moderator hisoblari ham
    // shu jumladan. Avval faqat role='USER' hisoblanardi, lekin admin
    // o'zi test qilganda ("bitta akkauntdan start bosdim") o'z SUPER_ADMIN
    // hisobi sanoqqa kirmay, "ishlamayapti" deb noto'g'ri tuyulgan edi —
    // foydalanuvchi aniq "hammasi ko'rinsin" deb so'radi.
    const totalUsers = await db.user.count({ where: { cityId } });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const newUsersToday = await db.user.count({ where: { cityId, createdAt: { gte: todayStart } } });

    // Javob % — haqiqiy hisob: (jami savol - javobsiz) / jami savol
    const resolvedPercent = totalQuestions > 0
      ? Math.round(((totalQuestions - unresolvedRequests) / totalQuestions) * 1000) / 10
      : 100;

    return {
      // DashboardScreen.tsx kutgan nomlar:
      totalQuestions,
      unresolvedRequests,
      resolvedPercent,
      totalListings: activeListings,
      totalUsers,
      newUsersToday,
      // Qo'shimcha (boshqa ekranlar uchun):
      activeListings,
      pendingCandidates,
      totalCategories,
      accuracyRate: resolvedPercent,
    };
  });

  // --- 3. LISTINGS (USTALAR VA XIZMATLAR) ---
  fastify.get('/admin/listings', async (req, reply) => {
    const cityId = await getCityId(req);

    const listings = await db.listing.findMany({
      where: { cityId },
      include: {
        category: true,
        primaryLandmark: true,
        serviceAreaLandmarks: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return listings;
  });

  // GET /admin/listings/check-duplicate
  fastify.get('/admin/listings/check-duplicate', async (req: any, reply) => {
    const cityId = await getCityId(req);
    const { phone, name } = req.query as { phone?: string; name?: string };

    if (!phone && !name) {
      return { isDuplicate: false };
    }

    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    
    // Find matching listing by phone or name in this city
    const existingListings = await db.listing.findMany({
      where: {
        cityId,
        status: 'ACTIVE',
      },
      include: {
        category: true,
        primaryLandmark: true,
      },
    });

    const match = existingListings.find((item) => {
      const itemCleanPhone = item.phone ? item.phone.replace(/\D/g, '') : '';
      if (cleanPhone && cleanPhone.length >= 7 && itemCleanPhone.endsWith(cleanPhone.slice(-7))) {
        return true;
      }
      if (name && name.length >= 3 && item.name.toLowerCase().trim() === name.toLowerCase().trim()) {
        return true;
      }
      return false;
    });

    if (match) {
      return {
        isDuplicate: true,
        existing: {
          id: match.id,
          name: match.name,
          categoryName: match.category.name,
          landmarkName: match.primaryLandmark.name,
          phone: match.phone,
        },
      };
    }

    return { isDuplicate: false };
  });

  // Yozuv rasmi yuklash (masalan "uy arendaga" e'lonlari uchun). Bitta faylni
  // qabul qiladi, diskka saqlaydi va ommaviy URL qaytaradi — bu URL keyin
  // POST/PUT /admin/listings'ga photoUrls massivi ichida yuboriladi.
  fastify.post('/admin/listings/upload-photo', async (req: any, reply) => {
    if (!await requireAdmin(req, reply)) return;
    try {
      const file = await req.file();
      if (!file) {
        return reply.status(400).send({ error: 'Rasm fayli topilmadi' });
      }
      const ext = ALLOWED_PHOTO_MIME_TO_EXT[file.mimetype];
      if (!ext) {
        return reply.status(400).send({ error: "Faqat JPEG, PNG yoki WebP rasm qabul qilinadi" });
      }
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const destPath = path.join(UPLOADS_DIR, 'listings', fileName);
      await fs.promises.writeFile(destPath, await file.toBuffer());
      return { url: `/api/uploads/listings/${fileName}` };
    } catch (err: any) {
      req.log.error(err);
      // @fastify/multipart hajm chegarasidan oshsa shu kodni qaytaradi
      if (err?.code === 'FST_REQ_FILE_TOO_LARGE') {
        return reply.status(400).send({ error: "Rasm hajmi 5MB dan katta bo'lmasligi kerak" });
      }
      return reply.status(400).send({ error: 'Rasmni yuklashda xatolik yuz berdi' });
    }
  });

  fastify.post('/admin/listings', async (req: any, reply) => {
    if (!await requireAdmin(req, reply)) return;
    try {
      const cityId = await getCityId(req);
      const {
        type,
        name,
        categoryName,
        phone,
        landmarkId,
        landmarkName,
        badges,
        verified,
        workFrom,
        workTo,
        addedByUserId,
        consentGiven,
        consentDevice,
        latitude,
        longitude,
        jargonSynonyms,
        isConfirmedDifferent,
        photoUrls,
        description,
        specificServices,
        approxPrice,
        mapUrl,
        roomCount,
        rentPrice,
        rentPriceCurrency,
        rentTermType,
      } = req.body;

      if (!name || !categoryName) {
        return reply.status(400).send({ error: "Ism va Kategoriya majburiy!" });
      }

      const VALID_LISTING_TYPES = [ListingType.USTA, ListingType.DOKON_OBYEKT, ListingType.MUASSASA, ListingType.TRANSPORT, ListingType.ARENDA, ListingType.ZAPRAVKA];
      const listingType = VALID_LISTING_TYPES.includes(type) ? type : ListingType.USTA;

      // Find or create category. Avval kiritilgan nomni lug'atdagi KANONIK
      // nomga moslashtiramiz (masalan "taxi", "Taxi" -> "Taksi") — shu orqali
      // yozilish farqi sabab dublikat kategoriya yaralishining oldi olinadi.
      const canonicalCategoryName = resolveCanonicalCategoryName(categoryName);
      let category = await db.category.findFirst({
        where: { name: { equals: canonicalCategoryName, mode: 'insensitive' } },
      });

      if (!category) {
        // Lug'atda shu nomdagi kategoriya mavjud bo'lsa, uning TO'LIQ
        // sinonimlar ro'yxati bazaga "urug'" sifatida ko'chiriladi — aks
        // holda faqat bitta (o'z nomi) sinonim bilan yaratilib, keyinchalik
        // AI klassifikator boshqacha so'z bilan atasa qidiruv topolmay
        // qolardi (batafsil: getDictionarySynonymsForCategory izohi).
        const dictSynonyms = getDictionarySynonymsForCategory(canonicalCategoryName);
        category = await db.category.create({
          data: { name: canonicalCategoryName, synonyms: dictSynonyms.length > 0 ? dictSynonyms : [canonicalCategoryName.toLowerCase()] },
        });
      }

      // Mo'ljal — 2026-09'dan boshlab admin panel HAR DOIM aniq mavjud
      // mo'ljalni (yoki "Mo'ljallar"da/shu ekranda ATAYLAB yaratilgan
      // yangisini) TANLAB yuboradi (`landmarkId`), erkin matn emas — shu
      // orqali yangi ikkilanuvchi mo'ljallar ("5/1", "5/1 dahasi" kabi)
      // tasodifan ko'payib ketishining oldi olinadi. `landmarkName` faqat
      // eski/tashqi chaqiruvlar uchun zaxira sifatida saqlanadi.
      let landmark = landmarkId
        ? await db.landmark.findUnique({ where: { id: landmarkId } })
        : null;

      if (!landmark) {
        const rawLandmarkInput = landmarkName || 'Markaz';
        const targetLandmarkName = stripLandmarkSuffixes(rawLandmarkInput) || rawLandmarkInput;
        landmark = await db.landmark.findFirst({
          where: { cityId, name: { equals: targetLandmarkName, mode: 'insensitive' } },
        });
        if (!landmark) {
          landmark = await db.landmark.create({
            data: {
              cityId,
              name: targetLandmarkName,
              synonyms: Array.from(new Set([targetLandmarkName.toLowerCase(), rawLandmarkInput.toLowerCase()])),
            },
          });
        }
      }

      const ip = (req.headers['x-forwarded-for'] as string || req.ip || '').split(',')[0].trim();

      const listing = await db.listing.create({
        data: {
          cityId,
          categoryId: category.id,
          primaryLandmarkId: landmark.id,
          type: listingType,
          name,
          phone,
          badges: badges || ['uyga_boradi'],
          verification: verified ? VerificationStatus.VERIFIED : VerificationStatus.COMMUNITY_UNVERIFIED,
          workFrom: workFrom || '08:00',
          workTo: workTo || '20:00',
          addedByUserId: req.user?.id || addedByUserId || null,
          consentGiven: Boolean(consentGiven),
          consentAt: consentGiven ? new Date() : null,
          consentDevice: consentDevice || req.headers['user-agent'] || null,
          consentIp: ip || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          jargonSynonyms: Array.isArray(jargonSynonyms) ? jargonSynonyms : [],
          photoUrls: Array.isArray(photoUrls) ? photoUrls.slice(0, 8) : [],
          description: description || null,
          specificServices: specificServices || null,
          approxPrice: approxPrice || null,
          mapUrl: mapUrl || null,
          roomCount: Number.isFinite(Number(roomCount)) && roomCount !== '' && roomCount != null ? parseInt(roomCount, 10) : null,
          rentPrice: Number.isFinite(Number(rentPrice)) && rentPrice !== '' && rentPrice != null ? parseInt(rentPrice, 10) : null,
          rentPriceCurrency: ['UZS', 'USD'].includes(rentPriceCurrency) ? rentPriceCurrency : null,
          rentTermType: ['KUNLIK', 'OYLIK', 'YILLIK'].includes(rentTermType) ? rentTermType : null,
        },
      });

      // Write Audit Log for requirement #8 JURNAL
      try {
        await db.auditLog.create({
          data: {
            userId: req.user?.id || addedByUserId || null,
            cityId,
            action: 'CREATE_LISTING',
            details: { listingId: listing.id, name, phone, consentGiven: Boolean(consentGiven), isConfirmedDifferent: Boolean(isConfirmedDifferent) },
            deviceInfo: (consentDevice || req.headers['user-agent'] || '').slice(0, 255),
            ipAddress: ip.slice(0, 64),
          },
        });
      } catch {}

      // Auto-Notification Loop: Notify users who requested this category
      await notifyUsersOnNewListingAdded({
        cityId,
        listingId: listing.id,
        categoryName: category.name,
      });

      return listing;
    } catch (err: any) {
      req.log.error(err);
      return reply.status(400).send({
        error: "Yozuvni saqlashda xatolik yuz berdi. Iltimos qayta urinib ko'ring.",
      });
    }
  });

  // GET /admin/listings/:id — Full detail with category, landmark, reviews, corrections, history
  fastify.get('/admin/listings/:id', async (req: any, reply) => {
    const { id } = req.params;
    const listing = await db.listing.findUnique({
      where: { id },
      include: {
        category: true,
        primaryLandmark: true,
        serviceAreaLandmarks: true,
        reviews: { orderBy: { createdAt: 'desc' } },
        corrections: { orderBy: { createdAt: 'desc' } },
        history: { orderBy: { createdAt: 'desc' }, take: 20 },
        addedByUser: { select: { firstName: true, lastName: true, role: true } },
      },
    });

    if (!listing) return reply.status(404).send({ success: false, message: 'Yozuv topilmadi' });

    // Format bot preview message
    const botPreviewText = [
      `🔧 ${listing.category?.name || 'Xizmat'}`,
      '',
      `${listing.name} ${listing.verification === 'VERIFIED' ? '✅' : '⚠️'} ⭐${listing.bayesianRating.toFixed(1)}`,
      `📍 ${listing.primaryLandmark?.name || 'Olmaliq'}`,
      `🏷 ${(listing.badges || []).join(' · ')}`,
      `📞 ${listing.phone}`,
      '',
      `[Yana 2 tasini ko'rish]`,
      '',
      `🕐 Bu xabar 15 daqiqada o'chadi`,
    ].join('\n');

    return {
      success: true,
      listing,
      botPreviewText,
    };
  });

  fastify.put('/admin/listings/:id', async (req: any, reply) => {
    if (!await requireAdmin(req, reply)) return;
    const { id } = req.params;
    const {
      name,
      phone,
      badges,
      verification,
      status,
      categoryName,
      landmarkId,
      landmarkName,
      workFrom,
      workTo,
      specificServices,
      approxPrice,
      description,
      jargonSynonyms,
      photoUrls,
      mapUrl,
      roomCount,
      rentPrice,
      rentPriceCurrency,
      rentTermType,
    } = req.body;

    const existing = await db.listing.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ success: false, message: 'Yozuv topilmadi' });

    // Record snapshot before updating
    try {
      await db.listingHistory.create({
        data: {
          listingId: id,
          changedBy: req.user?.id || 'Admin',
          snapshot: existing as any,
        },
      });
    } catch {}

    // Category / Landmark updates
    let categoryId = existing.categoryId;
    if (categoryName) {
      const canonicalName = resolveCanonicalCategoryName(categoryName);
      let cat = await db.category.findFirst({ where: { name: { equals: canonicalName, mode: 'insensitive' } } });
      if (!cat) {
        const dictSynonyms = getDictionarySynonymsForCategory(canonicalName);
        cat = await db.category.create({ data: { name: canonicalName, synonyms: dictSynonyms.length > 0 ? dictSynonyms : [canonicalName.toLowerCase()] } });
      }
      categoryId = cat.id;
    }

    // Mo'ljal — endi admin panel `landmarkId` (aniq tanlangan mo'ljal)
    // yuboradi, erkin matn emas (POST /admin/listings'dagi bilan bir xil
    // sabab). `landmarkName` faqat zaxira sifatida qoladi.
    let primaryLandmarkId = existing.primaryLandmarkId;
    if (landmarkId) {
      const lm = await db.landmark.findUnique({ where: { id: landmarkId } });
      if (lm) primaryLandmarkId = lm.id;
    } else if (landmarkName) {
      const cleanLandmarkName = stripLandmarkSuffixes(landmarkName) || landmarkName;
      let lm = await db.landmark.findFirst({
        where: { cityId: existing.cityId, name: { equals: cleanLandmarkName, mode: 'insensitive' } },
      });
      if (!lm) {
        lm = await db.landmark.create({
          data: {
            cityId: existing.cityId,
            name: cleanLandmarkName,
            synonyms: Array.from(new Set([cleanLandmarkName.toLowerCase(), landmarkName.toLowerCase()])),
          },
        });
      }
      primaryLandmarkId = lm.id;
    }

    const updated = await db.listing.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(badges && { badges }),
        ...(verification && { verification }),
        ...(status && { status }),
        ...(workFrom && { workFrom }),
        ...(workTo && { workTo }),
        ...(specificServices !== undefined && { specificServices }),
        ...(approxPrice !== undefined && { approxPrice }),
        ...(description !== undefined && { description }),
        ...(Array.isArray(jargonSynonyms) && { jargonSynonyms }),
        ...(Array.isArray(photoUrls) && { photoUrls: photoUrls.slice(0, 8) }),
        ...(mapUrl !== undefined && { mapUrl: mapUrl || null }),
        ...(roomCount !== undefined && { roomCount: Number.isFinite(Number(roomCount)) && roomCount !== '' && roomCount !== null ? parseInt(roomCount, 10) : null }),
        ...(rentPrice !== undefined && { rentPrice: Number.isFinite(Number(rentPrice)) && rentPrice !== '' && rentPrice !== null ? parseInt(rentPrice, 10) : null }),
        ...(rentPriceCurrency !== undefined && { rentPriceCurrency: ['UZS', 'USD'].includes(rentPriceCurrency) ? rentPriceCurrency : null }),
        ...(rentTermType !== undefined && { rentTermType: ['KUNLIK', 'OYLIK', 'YILLIK'].includes(rentTermType) ? rentTermType : null }),
        categoryId,
        primaryLandmarkId,
        lastVerifiedAt: new Date(),
      },
      include: {
        category: true,
        primaryLandmark: true,
      },
    });

    return { success: true, listing: updated };
  });

  // Kategoriya ichida "1/2/3-o'rin" belgilash (kelajakdagi pullik "top
  // joylashuv" xizmati uchun asos) — "Yana ko'rish" shu tartibda birinchi
  // bo'lib shu yozuvlarni ko'rsatadi (searchEngine.ts'dagi priorityRank
  // bonusiga qarang). `priorityRank: null` yuborilsa, belgi olib tashlanadi.
  fastify.put('/admin/listings/:id/priority', async (req: any, reply) => {
    const auth = await requireSuperAdmin(req, reply);
    if (!auth) return;

    const { id } = req.params;
    const { priorityRank } = req.body as { priorityRank: number | null };

    if (priorityRank !== null && ![1, 2, 3].includes(priorityRank)) {
      return reply.status(400).send({ success: false, message: 'priorityRank faqat 1, 2, 3 yoki null bo\'lishi kerak' });
    }

    const existing = await db.listing.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ success: false, message: 'Yozuv topilmadi' });

    // Bitta kategoriyada bir xil raqam (masalan "1") ikki yozuvda bir vaqtda
    // turolmaydi — shu raqamni oldin ushlab turgan boshqa yozuvdan avtomatik
    // olib tashlanadi, shunda admin qo'lda avval "bo'shatib" o'tirmaydi.
    await db.$transaction(async (tx) => {
      if (priorityRank !== null) {
        await tx.listing.updateMany({
          where: { categoryId: existing.categoryId, priorityRank, NOT: { id } },
          data: { priorityRank: null },
        });
      }
      await tx.listing.update({ where: { id }, data: { priorityRank } });
    });

    const updated = await db.listing.findUnique({
      where: { id },
      include: { category: true, primaryLandmark: true },
    });

    return { success: true, listing: updated };
  });

  fastify.delete('/admin/listings/:id', async (req: any, reply) => {
    if (!await requireAdmin(req, reply)) return;
    const { id } = req.params;
    await db.listing.delete({ where: { id } });
    return { success: true };
  });

  // --- 4. UNRESOLVED QUERY CLUSTERS & SYNONYM BINDING ---
  //
  // clusterUnresolvedQueries() Gemini API'ni chaqiradi va DB yozadi — har
  // Dashboard so'nggi (20s'da bir) yangilanishida qayta ishga tushirish
  // qimmat va keraksiz bo'lardi. Shu sabab natija shahar bo'yicha qisqa
  // muddat (5 daqiqa) keshlanadi — Requests ekrani ham, Dashboard'dagi
  // "Yangi ehtiyojlar" bo'limi ham SHU BIR XIL keshdan foydalanadi.
  const clusterCache = new Map<string, { data: Awaited<ReturnType<typeof clusterUnresolvedQueries>>; expiresAt: number }>();
  const CLUSTER_CACHE_TTL_MS = 5 * 60 * 1000;

  async function getCachedClusters(cityId: string, forceFresh = false) {
    const cached = clusterCache.get(cityId);
    if (!forceFresh && cached && cached.expiresAt > Date.now()) return cached.data;
    const fresh = await clusterUnresolvedQueries(cityId);
    clusterCache.set(cityId, { data: fresh, expiresAt: Date.now() + CLUSTER_CACHE_TTL_MS });
    return fresh;
  }

  fastify.get('/admin/requests/clusters', async (req: any, reply) => {
    const cityId = await getCityId(req);
    const forceFresh = req.query?.fresh === 'true';
    return getCachedClusters(cityId, forceFresh);
  });

  // Dashboard uchun ixcham: bazada UMUMAN yo'q, lekin tez-tez so'ralayotgan
  // ehtiyojlarning eng tepasi — admin Requests ekraniga kirmasdan ham
  // darhol ko'radi.
  fastify.get('/admin/requests/top-missing', async (req: any, reply) => {
    const cityId = await getCityId(req);
    const limit = Math.min(Number(req.query?.limit) || 5, 20);
    const clusters = await getCachedClusters(cityId);
    return clusters.filter((c) => !c.isExistingCategory).slice(0, limit);
  });

  fastify.post('/admin/requests/bind-synonym', async (req: any, reply) => {
    if (!await requireAdmin(req, reply)) return;
    const { categoryId, synonym } = req.body;

    if (!categoryId || !synonym) {
      return reply.status(400).send({ error: 'categoryId and synonym are required' });
    }

    const category = await db.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return reply.status(404).send({ error: 'Category not found' });
    }

    const normSyn = synonym.toLowerCase().trim();
    if (!category.synonyms.includes(normSyn)) {
      await db.category.update({
        where: { id: categoryId },
        data: {
          synonyms: [...category.synonyms, normSyn],
        },
      });
    }

    return { success: true, updatedCategory: category.name, addedSynonym: normSyn };
  });

  // Klasterni "yopish" — avval bu faqat brauzerda (client-side) yashirilardi,
  // sahifani yangilasangiz qaytib chiqardi. Endi haqiqatan QueryLog
  // yozuvlarini isResolved=true qilib belgilaydi — shu bilan Dashboard'dagi
  // "Javobsiz" hisobi ham to'g'ri kamayadi.
  fastify.post('/admin/requests/dismiss', async (req: any, reply) => {
    if (!await requireAdmin(req, reply)) return;
    const { queryLogIds } = req.body;
    if (!Array.isArray(queryLogIds) || queryLogIds.length === 0) {
      return reply.status(400).send({ success: false, message: 'queryLogIds massiv bo\'lishi kerak' });
    }
    await db.queryLog.updateMany({
      where: { id: { in: queryLogIds } },
      data: { isResolved: true },
    });
    return { success: true, dismissedCount: queryLogIds.length };
  });

  // --- BOT SINOVI (simulyator, 2026-09) ---
  //
  // Admin panelidan yozilgan xabar botning HAQIQIY guruh-xabar quvurini
  // (zeroLayerFilter -> AI klassifikator -> o'z-e'lon/ish-e'loni tekshiruvi
  // -> qidiruv) AYNAN O'ZINI, real Telegram'ga chiqmasdan, bosib o'tadi —
  // shu bilan admin (yoki men, xato tuzatishda) har safar SSH orqali qo'lda
  // sinamasdan, to'g'ridan-to'g'ri "bot bunga nima javob beradi va NEGA"ni
  // ko'ra oladi. MUHIM: bu HAQIQIY AI (Gemini) so'rovini ishlatadi —
  // groupHandler.ts bilan bir xil RPM-chegara (reserveGeminiCallSlot)
  // baham ko'riladi, shuning uchun haddan tashqari tez-tez sinash real
  // foydalanuvchi trafigiga ozgina ta'sir qilishi mumkin (past ehtimol,
  // chunki chegara 12/daqiqa va odatda ancha bo'sh).
  fastify.post('/admin/simulate', async (req: any, reply) => {
    if (!await requireAdmin(req, reply)) return;
    const { message } = req.body as { message?: string };
    if (!message || !message.trim()) {
      return reply.status(400).send({ success: false, message: 'Xabar matni talab qilinadi' });
    }
    const cityId = await getCityId(req);
    const messageText = message.trim();

    const steps: any = {};

    // 1. 0-qavat filtr (faqat GURUH xabarlari uchun ishlaydi — shaxsiy
    // xabar bo'lsa bot buni umuman qo'llamaydi, lekin sinov shaffofligi
    // uchun natijasi baribir ko'rsatiladi).
    const passedZeroLayer = zeroLayerFilter(messageText);
    steps.zeroLayer = { passed: passedZeroLayer };

    if (!passedZeroLayer) {
      return {
        success: true,
        steps,
        finalResult: {
          found: false,
          reason: "0-qavat filtridan o'tmadi — guruhda bot bunga UMUMAN javob bermaydi (AI'ga ham yuborilmaydi). Shaxsiy xabarlarda bu bosqich qo'llanilmaydi.",
        },
        scoreBreakdown: null,
      };
    }

    // 1b. Mahalliy dispecher/xizmat raqamlari (2026-09) — groupHandler.ts
    // bilan BIR XIL tartibda, AI'DAN OLDIN tekshiriladi. MUHIM: bu bosqich
    // avval bu yerda YO'Q edi (simulyator local-dispatcher tizimidan
    // OLDINROQ qurilgan) — natijada sinov real pipeline'ni to'liq aks
    // ettirmasdi. Endi to'liq mos.
    const localDispatcherMatch = await findLocalDispatcherMatch(messageText, cityId);
    steps.localDispatcher = localDispatcherMatch
      ? { matched: true, label: localDispatcherMatch.label }
      : { matched: false };
    if (localDispatcherMatch) {
      return {
        success: true,
        steps,
        finalResult: {
          found: true,
          listingName: localDispatcherMatch.label,
          categoryName: 'Mahalliy raqam (dispecher)',
          formattedText: localDispatcherMatch.formattedText,
        },
        scoreBreakdown: null,
      };
    }

    // 2. AI klassifikator (real Gemini so'rovi)
    const classification = await classifyQuery(messageText, cityId);
    steps.aiClassification = classification;

    // 3. O'z-e'lon / ish-e'loni / kommunal-holat so'rovi tekshiruvi —
    // AI xulosasidan QAT'I NAZAR ustuvor (groupHandler.ts bilan bir xil mantiq).
    const selfOfferBlocked =
      classification.intent !== 'EMERGENCY' &&
      (isSelfOffer(messageText) || isJobVacancy(messageText) || isUtilityStatusQuestion(messageText));
    steps.selfOfferCheck = {
      isSelfOffer: isSelfOffer(messageText),
      isJobVacancy: isJobVacancy(messageText),
      isUtilityStatusQuestion: isUtilityStatusQuestion(messageText),
      blocked: selfOfferBlocked,
    };

    if (selfOfferBlocked) {
      return {
        success: true,
        steps,
        finalResult: {
          found: false,
          reason: "O'z-e'lon/ish-e'loni/kommunal-holat so'rovi deb topildi — bot ATAYLAB javob bermaydi (bu odam bizdan so'ramayapti, o'zi taklif qilyapti).",
        },
        scoreBreakdown: null,
      };
    }

    // 4. Favqulodda holat
    if (classification.intent === 'EMERGENCY') {
      const guessedCategory = classification.category || '';
      const category = isValidEmergencyCategory(guessedCategory) ? guessedCategory : detectEmergencyCategory(messageText) || 'gas_leak';
      return {
        success: true,
        steps,
        finalResult: {
          found: true,
          reason: `FAVQULODDA holat sifatida aniqlandi (shablon: ${category}) — bot darhol xavfsizlik xabari yuboradi, usta/xizmat qidirmaydi.`,
        },
        scoreBreakdown: null,
      };
    }

    // 4b. Hudud-so'rovi ("Bo'stonda nima bor?") — groupHandler.ts bilan bir xil.
    if (!classification.category && isAreaBrowseQuery(messageText)) {
      const areaResult = await findAreaListings(cityId, classification.landmark, messageText);
      steps.areaListing = areaResult ? { matched: true, landmarkName: areaResult.landmarkName, totalCount: areaResult.totalCount } : { matched: false };
      if (areaResult) {
        return {
          success: true,
          steps,
          finalResult: {
            found: true,
            listingName: areaResult.landmarkName,
            categoryName: 'Hudud-so\'rovi (barcha xizmatlar)',
            formattedText: areaResult.formattedText,
          },
          scoreBreakdown: null,
        };
      }
    }

    // 5. Qidiruv — groupHandler.ts bilan bir xil mantiq
    const isSeeking = classification.intent !== 'NOT_RELEVANT';
    const requestedBadges = extractRequestedBadges(messageText);
    steps.requestedBadges = requestedBadges;
    const rentalFilters = extractRentalFilters(messageText);
    steps.rentalFilters = rentalFilters;

    const searchResult = await searchListings({
      cityId,
      categoryName: isSeeking ? classification.category : null,
      landmarkName: isSeeking ? classification.landmark : null,
      rawMessage: messageText,
      intent: classification.intent,
      name: isSeeking ? classification.name : null,
      requestedBadges,
      rentalFilters,
      debug: true,
    });

    if (!searchResult) {
      return {
        success: true,
        steps,
        finalResult: {
          found: false,
          reason: "Bazada mos yozuv topilmadi — guruhda bot JIM turadi (bo'sh javob emas, umuman javob bermaydi).",
        },
        scoreBreakdown: null,
      };
    }

    return {
      success: true,
      steps,
      finalResult: {
        found: true,
        listingName: searchResult.listing.name,
        categoryName: searchResult.listing.category?.name || null,
        formattedText: searchResult.formattedText,
        otherMatchesCount: searchResult.otherMatches.length,
      },
      scoreBreakdown: searchResult.scoreBreakdown || null,
    };
  });

  // --- 5. CATEGORIES & LANDMARKS ---

  // "Dublikat kategoriya" detektori (2026-09) — real xato ("Sug'urta"
  // bazada 2 marta qo'shilib qolgani, qidiruv natijalarini bo'lib
  // yuborgani) qayta yuz bermasligi uchun. Ikki turdagi dalilni tekshiradi:
  // 1. NOMLAR bir-biriga juda yaqin (Levenshtein) — yozilish xatosi bilan
  //    ikki marta qo'shilgan bo'lishi mumkin ("Sugurta" / "Sug'urta").
  // 2. Bitta kategoriyaning NOMI boshqasining SINONIMLAR ro'yxatida
  //    so'zma-so'z bor — bu ATOQLI dalil, deyarli har doim haqiqiy
  //    dublikat (masalan "Taksi" kategoriyasi bor-u, "Taxi" kategoriyasi
  //    ham bor, va uning sinonimida "taksi" yozilgan).
  //
  // ATAYLAB faqat NOM darajasida solishtiriladi (sinonim so'zlarning o'zaro
  // usma-tushishi emas) — aks holda "usta"/"arenda" kabi umumiy so'zlar
  // deyarli har qanday ikkita kategoriyani "dublikat" deb ko'rsatib
  // yuborardi (xuddi searchEngine.ts'dagi kategoriya-chastota xatosi kabi).
  fastify.get('/admin/categories/duplicates', async (req: any, reply) => {
    if (!await requireAdmin(req, reply)) return;

    const cats = await db.category.findMany({
      select: { id: true, name: true, synonyms: true, group: true, objectType: true },
    });

    const pairs: {
      a: { id: string; name: string };
      b: { id: string; name: string };
      reason: 'similar_name' | 'name_in_synonyms';
      detail: string;
    }[] = [];

    const seen = new Set<string>();

    for (let i = 0; i < cats.length; i++) {
      for (let j = i + 1; j < cats.length; j++) {
        const a = cats[i];
        const b = cats[j];
        const pairKey = [a.id, b.id].sort().join('|');
        if (seen.has(pairKey)) continue;

        const normA = normalizeText(a.name);
        const normB = normalizeText(b.name);
        if (normA.length < 3 || normB.length < 3) continue;

        // 1) Nomlar yozilishi bo'yicha juda yaqin
        const compactA = normA.replace(/[\s'-]+/g, '');
        const compactB = normB.replace(/[\s'-]+/g, '');
        if (Math.abs(compactA.length - compactB.length) <= 3) {
          const dist = levenshteinDistance(compactA, compactB);
          const threshold = Math.max(1, Math.floor(Math.max(compactA.length, compactB.length) / 6));
          if (dist > 0 && dist <= threshold) {
            pairs.push({
              a: { id: a.id, name: a.name },
              b: { id: b.id, name: b.name },
              reason: 'similar_name',
              detail: `Nomlar yozilishi juda o'xshash (${dist} ta harf farqi)`,
            });
            seen.add(pairKey);
            continue;
          }
        }

        // 2) Bitta kategoriyaning nomi ikkinchisining sinonimlar
        // ro'yxatida so'zma-so'z bor
        const aInB = b.synonyms.some((s: string) => normalizeText(s) === normA);
        const bInA = a.synonyms.some((s: string) => normalizeText(s) === normB);
        if (aInB || bInA) {
          pairs.push({
            a: { id: a.id, name: a.name },
            b: { id: b.id, name: b.name },
            reason: 'name_in_synonyms',
            detail: aInB
              ? `"${a.name}" so'zi "${b.name}" kategoriyasining sinonimlar ro'yxatida bor`
              : `"${b.name}" so'zi "${a.name}" kategoriyasining sinonimlar ro'yxatida bor`,
          });
          seen.add(pairKey);
        }
      }
    }

    return { success: true, duplicates: pairs };
  });

  fastify.get('/admin/categories', async (req: any, reply) => {
    const { search, objectType } = req.query as { search?: string; objectType?: string };

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { synonyms: { has: search.toLowerCase() } },
      ];
    }
    if (objectType) {
      whereClause.objectType = objectType;
    }

    const categories = await db.category.findMany({
      where: whereClause,
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { listings: true } },
      },
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      synonyms: c.synonyms,
      group: c.group,
      objectType: c.objectType,
      count: c._count.listings,
    }));
  });

  // Yozuv qo'shishda "Jargon / xalq atamalari" maydoni uchun — TANLANGAN
  // kategoriyada ALLAQACHON bor boshqa yozuvlarning jargon so'zlarini
  // taklif sifatida qaytaradi (2026-09, admin so'roviga ko'ra qo'shildi).
  //
  // MUHIM: bu HECH QANDAY generativ AI ishlatmaydi — faqat bazadagi
  // HAQIQIY, admin o'zi oldin kiritgan so'zlarni qaytaradi, shuning
  // uchun 100% aniq (hech narsa "o'ylab topilmaydi") va bazaga hech
  // narsa yozmaydi (faqat o'qish). Kategoriya nomini solishtirish
  // normalizeText() orqali qilinadi — shunda bazada bir xil ko'rinadigan,
  // lekin Unicode darajasida farqli (masalan apostrof) yozilgan
  // dublikat kategoriya qatorlari ham hammasi hisobga olinadi (qarang:
  // searchEngine.ts'dagi xuddi shu turdagi "Sug'urta" xatosi tuzatilishi).
  fastify.get('/admin/categories/jargon-suggestions', async (req: any, reply) => {
    const cityId = await getCityId(req);
    const { name } = req.query as { name?: string };
    if (!name || !name.trim()) return [];

    const cleanNormalized = normalizeText(name.trim());
    const allCategories = await db.category.findMany({ select: { id: true, name: true, synonyms: true } });
    const matchedCategoryIds = allCategories
      .filter((c) => {
        if (normalizeText(c.name) === cleanNormalized) return true;
        return (c.synonyms || []).some((s) => normalizeText(s) === cleanNormalized);
      })
      .map((c) => c.id);

    if (matchedCategoryIds.length === 0) return [];

    const listings = await db.listing.findMany({
      where: { cityId, categoryId: { in: matchedCategoryIds }, status: 'ACTIVE' },
      select: { jargonSynonyms: true },
    });

    const freq = new Map<string, number>();
    for (const l of listings) {
      for (const phrase of l.jargonSynonyms) {
        const clean = phrase.trim();
        if (!clean) continue;
        freq.set(clean, (freq.get(clean) || 0) + 1);
      }
    }

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([phrase, count]) => ({ phrase, count }));
  });

  // Mavjud guruh nomlari ro'yxati — "Kategoriya qo'shish" formasida tanlash uchun
  fastify.get('/admin/categories/groups', async (req, reply) => {
    const rows = await db.category.findMany({
      where: { group: { not: null } },
      distinct: ['group'],
      select: { group: true },
      orderBy: { group: 'asc' },
    });
    return rows.map((r) => r.group).filter(Boolean);
  });

  fastify.get('/admin/categories/:id', async (req: any, reply) => {
    const { id } = req.params;
    const category = await db.category.findUnique({
      where: { id },
      include: { _count: { select: { listings: true } } },
    });
    if (!category) return reply.status(404).send({ success: false, message: 'Kategoriya topilmadi' });
    return {
      id: category.id,
      name: category.name,
      synonyms: category.synonyms,
      group: category.group,
      objectType: category.objectType,
      count: category._count.listings,
    };
  });

  fastify.post('/admin/categories', async (req: any, reply) => {
    if (!await requireAdmin(req, reply)) return;
    const { name, objectType, group, synonyms } = req.body;

    if (!name || !name.trim()) {
      return reply.status(400).send({ success: false, message: 'Kategoriya nomi majburiy' });
    }

    const existing = await db.category.findFirst({ where: { name: { equals: name.trim(), mode: 'insensitive' } } });
    if (existing) {
      return reply.status(409).send({ success: false, message: 'Bu nomdagi kategoriya allaqachon mavjud' });
    }

    const VALID_OBJECT_TYPES = ['USTA', 'DOKON_OBYEKT', 'MUASSASA', 'TRANSPORT', 'ARENDA', 'ZAPRAVKA'];
    const category = await db.category.create({
      data: {
        name: name.trim(),
        objectType: VALID_OBJECT_TYPES.includes(objectType) ? objectType : null,
        group: group && group.trim() ? group.trim() : null,
        synonyms: Array.isArray(synonyms) ? synonyms.map((s: string) => s.toLowerCase().trim()).filter(Boolean) : [],
      },
    });

    return { success: true, category };
  });

  fastify.put('/admin/categories/:id', async (req: any, reply) => {
    if (!await requireAdmin(req, reply)) return;
    const { id } = req.params;
    const { name, synonyms, objectType, group } = req.body;

    const existing = await db.category.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ success: false, message: 'Kategoriya topilmadi' });

    const VALID_OBJECT_TYPES = ['USTA', 'DOKON_OBYEKT', 'MUASSASA', 'TRANSPORT', 'ARENDA', 'ZAPRAVKA'];
    const updated = await db.category.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(Array.isArray(synonyms) && { synonyms: synonyms.map((s: string) => s.toLowerCase().trim()).filter(Boolean) }),
        ...(objectType !== undefined && { objectType: VALID_OBJECT_TYPES.includes(objectType) ? objectType : null }),
        ...(group !== undefined && { group: group && group.trim() ? group.trim() : null }),
      },
    });

    return { success: true, category: updated };
  });

  fastify.get('/admin/landmarks', async (req, reply) => {
    const cityId = await getCityId(req);
    const landmarks = await db.landmark.findMany({
      where: { cityId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { primaryListings: true } } },
    });
    // Har bir mo'ljalga necha yozuv bog'langanini ham qo'shamiz — admin
    // "bu mo'ljal ishlatilmayapti, o'chirsam bo'ladi" kabi qarorni ko'rib
    // turib qabul qilishi uchun.
    return landmarks.map((l) => ({ ...l, listingCount: l._count.primaryListings, _count: undefined }));
  });

  // Bitta mo'ljal (tahrirlash ekrani uchun) — MUHIM (2026-09 topilgan
  // jiddiy xato): bu endpoint avval UMUMAN mavjud emas edi, shuning uchun
  // "Mo'ljal tahrirlash" ekrani hech qachon haqiqiy ma'lumot ko'rsatmasdi.
  fastify.get('/admin/landmarks/:id', async (req: any, reply) => {
    const { id } = req.params as { id: string };
    const landmark = await db.landmark.findUnique({
      where: { id },
      include: { _count: { select: { primaryListings: true } } },
    });
    if (!landmark) return reply.status(404).send({ success: false, message: "Mo'ljal topilmadi" });
    return { ...landmark, listingCount: landmark._count.primaryListings, _count: undefined };
  });

  // Yangi mo'ljal QO'LDA qo'shish (admin panelidan — "Mo'ljallar" bo'limi
  // yoki yozuv qo'shish ekranidagi "+ Yangi mo'ljal" orqali). Aynan shu
  // nomdagi mo'ljal allaqachon bo'lsa, YANGI yaratmasdan MAVJUDINI
  // qaytaradi — tasodifiy ikkilanuvchi yaratilmasligi uchun.
  fastify.post('/admin/landmarks', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;
    const cityId = await getCityId(req);
    const { name, synonyms } = req.body as { name: string; synonyms?: string[] };
    const cleanName = (name || '').trim();
    if (!cleanName) return reply.status(400).send({ success: false, message: "Mo'ljal nomi bo'sh bo'lishi mumkin emas" });

    const existing = await db.landmark.findFirst({
      where: { cityId, name: { equals: cleanName, mode: 'insensitive' } },
    });
    if (existing) return { success: true, landmark: existing, alreadyExisted: true };

    // MUHIM (2026-09, real production ma'lumotida tasdiqlandi): "Manzillar"
    // ekranida erkin matn kiritish hech qanday tekshiruvsiz edi — natijada
    // bazada "santexnik", "kafelchi", "kamerachi" kabi KASB nomlari, hatto
    // odam ismlari ("husniddin") "mo'ljal" sifatida saqlanib qolgan edi
    // (57 tadan ~15-20 tasi shunday chiqindi bo'lib chiqdi). Kiritilgan nom
    // lug'atdagi biror kasb/kategoriya nomiga (aniq yoki sinonim orqali)
    // mos kelsa — bu deyarli hech qachon haqiqiy joy nomi emas, rad etiladi.
    // Statik lug'atdan TASHQARI, haqiqiy DB kategoriyalar ro'yxati ham
    // tekshiriladi — ba'zi kasblar (masalan "Kamerachi") faqat bazada,
    // statik lug'atda umuman yo'q bo'lishi mumkin.
    const existingCategoryMatch = await db.category.findFirst({
      where: {
        OR: [
          { name: { equals: cleanName, mode: 'insensitive' } },
          { synonyms: { has: cleanName.toLowerCase() } },
        ],
      },
      select: { name: true },
    });
    // ANIQ (fuzzy EMAS) moslik — qarang: getExactCanonicalCategoryLookup izohi.
    const exactCategoryMatch = existingCategoryMatch?.name || getExactCanonicalCategoryLookup().get(normalizeText(cleanName));
    if (exactCategoryMatch) {
      return reply.status(400).send({
        success: false,
        message: `"${cleanName}" joy nomiga emas, kasb/xizmat turiga o'xshaydi ("${exactCategoryMatch}"). Agar bu chindan ham joy nomi bo'lsa, boshqacharoq yozib ko'ring.`,
      });
    }

    const created = await db.landmark.create({
      data: {
        cityId,
        name: cleanName,
        synonyms: synonyms && synonyms.length > 0 ? synonyms.map((s) => s.toLowerCase()) : [cleanName.toLowerCase()],
      },
    });
    return { success: true, landmark: created, alreadyExisted: false };
  });

  // Mo'ljal nomi/sinonimlarini tahrirlash — MUHIM (2026-09): bu endpoint
  // ham avval mavjud emas edi, "Saqlash" tugmasi doim xato berardi.
  fastify.put('/admin/landmarks/:id', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;
    const { id } = req.params as { id: string };
    const { name, synonyms } = req.body as { name?: string; synonyms?: string[] };

    const existing = await db.landmark.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ success: false, message: "Mo'ljal topilmadi" });

    const updated = await db.landmark.update({
      where: { id },
      data: {
        ...(name && name.trim() && { name: name.trim() }),
        ...(synonyms && { synonyms: synonyms.map((s) => s.toLowerCase().trim()).filter(Boolean) }),
      },
    });
    return { success: true, landmark: updated };
  });

  // Mo'ljalni o'chirish — FAQAT hech qanday yozuv unga bog'lanmagan bo'lsa
  // (Listing.primaryLandmarkId majburiy maydon, shuning uchun bog'liq
  // yozuvlar bo'lsa o'chirish ularni "egasiz" qoldiradi — buning o'rniga
  // admin avval o'sha yozuvlarning mo'ljalini boshqasiga o'zgartirishi
  // kerak).
  fastify.delete('/admin/landmarks/:id', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;
    const { id } = req.params as { id: string };

    const listingCount = await db.listing.count({ where: { primaryLandmarkId: id } });
    if (listingCount > 0) {
      return reply.status(400).send({
        success: false,
        message: `Bu mo'ljalga ${listingCount} ta yozuv bog'langan — avval o'sha yozuvlarning mo'ljalini boshqasiga o'zgartiring, keyin o'chiring.`,
      });
    }

    await db.landmark.delete({ where: { id } }).catch(() => {});
    return { success: true };
  });

  // Gemini'dan shu manzil uchun mahalliy/jargon nom taklif qildiradi —
  // FAQAT talab bo'yicha (tugma bosilganda), keshlanmaydi (har safar yangi
  // taklif berishi mumkin, bu maqsadga muvofiq — jargon o'zgarib turadi).
  fastify.post('/admin/landmarks/:id/suggest-synonyms', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;
    const { id } = req.params as { id: string };

    const landmark = await db.landmark.findUnique({ where: { id } });
    if (!landmark) return reply.status(404).send({ success: false, message: "Manzil topilmadi" });

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey || geminiKey === 'your_gemini_api_key_here') {
      return reply.status(503).send({ success: false, message: 'GEMINI_API_KEY sozlanmagan' });
    }

    try {
      const suggestions = await suggestLandmarkSynonymsWithGemini(landmark.name, landmark.synonyms, geminiKey);
      return { success: true, suggestions };
    } catch (err: any) {
      console.error("Manzil AI so'z taklifi xatosi:", err);
      return reply.status(502).send({
        success: false,
        message: `AI taklifi muvaffaqiyatsiz bo'ldi: ${err?.message || err}`,
      });
    }
  });

  // "Manzillar" sifat/dublikat tekshiruvi (2026-09) — `/admin/categories/
  // duplicates`dagi BIR XIL Levenshtein+compact-name pattern, IKKI turdagi
  // signal bilan: (1) yaqin-dublikat nomlar ("5/1" / "5/1 dahasi" — real
  // production ma'lumotida uchtasi ham bog'liqsiz alohida yozuv bo'lib
  // chiqqan edi), (2) "joy nomiga o'xshamaydi" — nom lug'atdagi biror
  // kasb/kategoriya nomiga TO'LIQ mos kelsa (masalan "santexnik") — bu
  // taxmin emas, aniq tekshiriladigan dalil, chunki bunday so'zlar
  // allaqachon "kasb" sifatida ro'yxatdan o'tgan. Har ikkala holatda ham
  // bog'liq yozuvlar soni qaytariladi — admin qaysi yozuvlarga ta'sir
  // qilishini oldindan ko'radi.
  fastify.get('/admin/landmarks/quality-check', async (req: any, reply) => {
    if (!await requireAdmin(req, reply)) return;
    const cityId = await getCityId(req);

    const landmarks = await db.landmark.findMany({
      where: { cityId },
      select: {
        id: true,
        name: true,
        synonyms: true,
        _count: { select: { primaryListings: true, serviceAreaListings: true } },
      },
    });

    // MUHIM: "joy nomiga o'xshamaydi" tekshiruvi avval FAQAT statik
    // lug'atga (`initialDictionary.json`) qarardi — lekin ba'zi kasblar
    // (masalan "Kamerachi") FAQAT bazada, admin tomonidan keyinchalik
    // qo'shilgan, statik lug'atda umuman yo'q. Shu sabab haqiqiy DB
    // kategoriyalar ro'yxati ham tekshiruvga qo'shiladi — ikkalasi
    // birlashtirilganda haqiqatan ham "hamma bilgan kasb" bo'yicha to'liq
    // qamrov ta'minlanadi.
    const dbCategories = await db.category.findMany({ select: { name: true, synonyms: true } });
    const dbCategoryLookup = new Map<string, string>();
    for (const c of dbCategories) {
      dbCategoryLookup.set(normalizeText(c.name), c.name);
      for (const s of c.synonyms) dbCategoryLookup.set(normalizeText(s), c.name);
    }
    const exactDictLookup = getExactCanonicalCategoryLookup();

    const duplicatePairs: {
      a: { id: string; name: string; listingCount: number };
      b: { id: string; name: string; listingCount: number };
      reason: 'similar_name' | 'name_in_synonyms';
      detail: string;
    }[] = [];
    const notAPlace: { id: string; name: string; listingCount: number; resolvedCategory: string }[] = [];

    const seen = new Set<string>();

    for (let i = 0; i < landmarks.length; i++) {
      const li = landmarks[i];
      const listingCountI = li._count.primaryListings + li._count.serviceAreaListings;

      const normI = normalizeText(li.name);
      if (normI.length >= 2) {
        // ANIQ (fuzzy EMAS) moslik — qarang: getExactCanonicalCategoryLookup izohi.
        const resolved = dbCategoryLookup.get(normI) || exactDictLookup.get(normI);
        if (resolved) {
          notAPlace.push({ id: li.id, name: li.name, listingCount: listingCountI, resolvedCategory: resolved });
        }
      }

      for (let j = i + 1; j < landmarks.length; j++) {
        const lj = landmarks[j];
        const pairKey = [li.id, lj.id].sort().join('|');
        if (seen.has(pairKey)) continue;

        const normJ = normalizeText(lj.name);
        if (normI.length < 2 || normJ.length < 2) continue;

        const compactI = normI.replace(/[\s'\-./]+/g, '');
        const compactJ = normJ.replace(/[\s'\-./]+/g, '');
        const listingCountJ = lj._count.primaryListings + lj._count.serviceAreaListings;

        if (Math.abs(compactI.length - compactJ.length) <= 3) {
          const dist = levenshteinDistance(compactI, compactJ);
          const threshold = Math.max(1, Math.floor(Math.max(compactI.length, compactJ.length) / 6));
          if (dist > 0 && dist <= threshold) {
            duplicatePairs.push({
              a: { id: li.id, name: li.name, listingCount: listingCountI },
              b: { id: lj.id, name: lj.name, listingCount: listingCountJ },
              reason: 'similar_name',
              detail: `Nomlar yozilishi juda o'xshash (${dist} ta harf farqi)`,
            });
            seen.add(pairKey);
            continue;
          }
        }

        const iInJ = lj.synonyms.some((s) => normalizeText(s) === normI);
        const jInI = li.synonyms.some((s) => normalizeText(s) === normJ);
        if (iInJ || jInI) {
          duplicatePairs.push({
            a: { id: li.id, name: li.name, listingCount: listingCountI },
            b: { id: lj.id, name: lj.name, listingCount: listingCountJ },
            reason: 'name_in_synonyms',
            detail: iInJ
              ? `"${li.name}" so'zi "${lj.name}" mo'ljalining sinonimlar ro'yxatida bor`
              : `"${lj.name}" so'zi "${li.name}" mo'ljalining sinonimlar ro'yxatida bor`,
          });
          seen.add(pairKey);
        }
      }
    }

    return { success: true, duplicatePairs, notAPlace };
  });

  // Ikki (yoki undan ortiq bosqichma-bosqich) yaqin-dublikat mo'ljalni
  // BITTAGA birlashtirish — admin "5/1"ni "5/1 dahasi"ga qo'shib, ikkalasi
  // o'rniga bitta, to'liqroq yozuv qoldirishi uchun. Bog'liq yozuvlar
  // (asosiy va xizmat-hudud) avtomatik ko'chadi, sinonimlar birlashtiriladi
  // (eski nom ham sinonim sifatida saqlanadi — eski jargon moslashuvi
  // buzilmasin), so'ng manba mo'ljal o'chiriladi. Tranzaksiya ichida —
  // yarim bajarilgan holat qolib ketmasligi uchun.
  fastify.post('/admin/landmarks/merge', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;
    const { sourceId, targetId } = req.body as { sourceId?: string; targetId?: string };
    if (!sourceId || !targetId || sourceId === targetId) {
      return reply.status(400).send({ success: false, message: "sourceId va targetId har xil va to'ldirilgan bo'lishi kerak" });
    }

    const [source, target] = await Promise.all([
      db.landmark.findUnique({ where: { id: sourceId } }),
      db.landmark.findUnique({ where: { id: targetId } }),
    ]);
    if (!source || !target) return reply.status(404).send({ success: false, message: "Mo'ljal(lar) topilmadi" });

    const mergedSynonyms = Array.from(
      new Set([...target.synonyms, ...source.synonyms, source.name.toLowerCase()])
    );

    // MUHIM: ko'p-ko'pga (serviceAreaLandmarks) bog'lanishlar `source`
    // mo'ljal o'chirilganda Prisma tomonidan AVTOMATIK olib tashlanadi —
    // shu sabab ularni ALBATTA o'chirishdan OLDIN o'qib olish va qayta
    // ulash kerak, aks holda bu yozuvlar hech qanday xato bermasdan,
    // "jim" ravishda xizmat-hudud bog'lanishini butunlay yo'qotib qo'yardi.
    const serviceAreaRefs = await db.listing.findMany({
      where: { serviceAreaLandmarks: { some: { id: sourceId } } },
      select: { id: true },
    });

    await db.$transaction([
      db.listing.updateMany({ where: { primaryLandmarkId: sourceId }, data: { primaryLandmarkId: targetId } }),
      ...serviceAreaRefs.map((l) =>
        db.listing.update({
          where: { id: l.id },
          data: { serviceAreaLandmarks: { disconnect: { id: sourceId }, connect: { id: targetId } } },
        })
      ),
      db.landmark.update({ where: { id: targetId }, data: { synonyms: mergedSynonyms } }),
      db.landmark.delete({ where: { id: sourceId } }),
    ]);

    return { success: true };
  });

  // Mahalla chegarasi (2026-09) — "Manzillar"dagi istalgan Landmark
  // ixtiyoriy ravishda poligon chegaraga ega bo'lishi mumkin (qarang:
  // Landmark.boundary izohi, schema.prisma). Bitta endpoint chizish,
  // tahrirlash VA o'chirish (boundary: null yuborilsa) uchun yetarli.
  fastify.put('/admin/landmarks/:id/boundary', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;
    const { id } = req.params as { id: string };
    const { boundary } = req.body as { boundary: [number, number][] | null };

    if (boundary !== null) {
      if (!Array.isArray(boundary) || boundary.length < 3) {
        return reply.status(400).send({ success: false, message: 'Poligon kamida 3 ta nuqtadan iborat bo\'lishi kerak' });
      }
      for (const p of boundary) {
        if (!Array.isArray(p) || p.length !== 2 || typeof p[0] !== 'number' || typeof p[1] !== 'number') {
          return reply.status(400).send({ success: false, message: "Har bir nuqta [lat, lng] juftligi bo'lishi kerak" });
        }
      }
    }

    const existing = await db.landmark.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ success: false, message: "Mo'ljal topilmadi" });

    const updated = await db.landmark.update({
      where: { id },
      // MUHIM: Prisma.DbNull (haqiqiy SQL NULL) ishlatiladi, Prisma.JsonNull
      // EMAS — aks holda "chegarani o'chirish" ustunni SQL NULL emas, JSON
      // "null" qiymatiga o'rnatib qo'yardi, va boshqa joydagi
      // `boundary: { not: null }` filtri (resolve-point'da) buni "hali ham
      // bor" deb noto'g'ri hisoblab qolardi.
      data: { boundary: boundary === null ? Prisma.DbNull : boundary },
    });
    return { success: true, landmark: updated };
  });

  // Xaritadan bosilgan nuqta qaysi mahalla (boundary'li Landmark) ICHIDA
  // ekanini topadi — "Xaritadan belgilash" tugmasi (yangi yozuv qo'shishda)
  // va "Mahalla chegaralari" ekrani shundan foydalanadi.
  fastify.post('/admin/landmarks/resolve-point', async (req: any, reply) => {
    if (!await requireAdmin(req, reply)) return;
    const cityId = await getCityId(req);
    const { lat, lng } = req.body as { lat?: number; lng?: number };
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return reply.status(400).send({ success: false, message: 'lat va lng raqam bo\'lishi kerak' });
    }

    const landmarksWithBoundary = await db.landmark.findMany({
      where: { cityId, boundary: { not: Prisma.DbNull } },
      select: { id: true, name: true, boundary: true },
    });

    const match = findContainingLandmark(lat, lng, landmarksWithBoundary as any);
    if (!match) return { success: true, landmark: null };
    return { success: true, landmark: { id: match.id, name: (match as any).name } };
  });

  // Mahalla (boundary'li Landmark)ga bog'liq yozuvlarni kategoriya bo'yicha
  // guruhlab sonini qaytaradi — "qaysi hududda qanday xizmat bor" tahlili.
  fastify.get('/admin/landmarks/:id/analytics', async (req: any, reply) => {
    if (!await requireAdmin(req, reply)) return;
    const { id } = req.params as { id: string };

    const listings = await db.listing.findMany({
      where: { primaryLandmarkId: id, status: 'ACTIVE' },
      select: { category: { select: { name: true } } },
    });

    const counts = new Map<string, number>();
    for (const l of listings) {
      const catName = l.category?.name || "Noma'lum";
      counts.set(catName, (counts.get(catName) || 0) + 1);
    }

    const breakdown = Array.from(counts.entries())
      .map(([categoryName, count]) => ({ categoryName, count }))
      .sort((a, b) => b.count - a.count);

    return { success: true, totalListings: listings.length, breakdown };
  });

  // ──────────────────────────────────────────────────────────────────────────
  // "GURUHLAR" — monitoring va salomatlik (2026-09). Har bir moderatsiya
  // filtri (so'kinish/spam-link/qimor/firibgarlik/flud) xabarni O'CHIRISHNI
  // talab qiladi, SPAM_LINK'dan tashqari qolgan 4 tasi qo'shimcha JIM
  // QILISHNI ham talab qiladi (enforceModeration.ts bilan bir xil qoida) —
  // shu ikki huquqdan qay biri yetishmasligi filtrni SUKUT ravishda
  // ishlamay qo'yadi (xatosiz, ogohlantirishsiz). Shu sababli "salomatlik"
  // belgisi FAQAT shu guruhda kamida bitta filtr YOQILGAN bo'lsagina
  // tekshiriladi — aks holda huquq yo'qligi hech qanday amaliy ta'sirga
  // ega emas. HECH QACHON guruhning o'ziga hech narsa yuborilmaydi — bu
  // faqat admin panelida ko'rinadigan, kuzatuv uchun ma'lumot.
  // ──────────────────────────────────────────────────────────────────────────
  const MODERATION_FEATURES_NEEDING_RESTRICT = new Set(['PROFANITY', 'GAMBLING', 'SCAM', 'FLOOD']);

  interface GroupHealth {
    memberCount: number | null;
    botStatus: string | null;
    canDelete: boolean;
    canRestrict: boolean;
    hasIssue: boolean;
    message: string;
  }

  async function fetchGroupHealth(
    chatId: bigint,
    botToken: string,
    enabledFeatureKeys: string[]
  ): Promise<GroupHealth> {
    const botId = botToken.split(':')[0];
    const base = `https://api.telegram.org/bot${botToken}`;

    const [memberRes, countRes] = await Promise.allSettled([
      fetch(`${base}/getChatMember?chat_id=${chatId}&user_id=${botId}`).then((r) => r.json()),
      fetch(`${base}/getChatMemberCount?chat_id=${chatId}`).then((r) => r.json()),
    ]);

    const memberData = memberRes.status === 'fulfilled' && memberRes.value?.ok ? memberRes.value.result : null;
    const memberCount = countRes.status === 'fulfilled' && countRes.value?.ok ? countRes.value.result : null;

    const botStatus: string | null = memberData?.status || null;
    const isAdmin = botStatus === 'administrator' || botStatus === 'creator';
    const canDelete = isAdmin ? !!memberData?.can_delete_messages : false;
    const canRestrict = isAdmin ? !!memberData?.can_restrict_members : false;

    const needsDelete = enabledFeatureKeys.length > 0;
    const needsRestrict = enabledFeatureKeys.some((k) => MODERATION_FEATURES_NEEDING_RESTRICT.has(k));

    let hasIssue = false;
    let message = 'Moderatsiya botlari yoqilmagan';

    if (needsDelete) {
      if (!isAdmin) {
        hasIssue = true;
        message = "Bot admin emas — yoqilgan moderatsiya botlari ishlamaydi";
      } else {
        const missing: string[] = [];
        if (!canDelete) missing.push("xabar o'chirish");
        if (needsRestrict && !canRestrict) missing.push('jim qilish');
        if (missing.length > 0) {
          hasIssue = true;
          message = `${missing.join(' va ')} huquqi yo'q`;
        } else {
          message = 'Hammasi tayyor';
        }
      }
    } else if (isAdmin) {
      message = 'Admin (moderatsiya botlari yoqilmagan)';
    }

    return { memberCount, botStatus, canDelete, canRestrict, hasIssue, message };
  }

  // Bot qaysi guruh/kanallarda ishlayotganini ko'rsatadi — botni yangi
  // guruhga admin qilib qo'shsangiz, qo'shimcha sozlashsiz shu yerda
  // avtomatik ko'rinadi (Telegram bot.on('my_chat_member') orqali yoziladi).
  fastify.get('/admin/groups', async (req, reply) => {
    const groups = await db.cityGroup.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const toggles = await db.groupFeatureToggle.findMany({ where: { isEnabled: true } });
    const featureKeysByGroupId = new Map<string, string[]>();
    for (const t of toggles) {
      const arr = featureKeysByGroupId.get(t.cityGroupId) || [];
      arr.push(t.featureKey);
      featureKeysByGroupId.set(t.cityGroupId, arr);
    }

    const botToken = process.env.BOT_TOKEN;

    const results = await Promise.all(
      groups.map(async (g) => {
        const enabledFeatureKeys = featureKeysByGroupId.get(g.id) || [];
        const health = botToken
          ? await fetchGroupHealth(g.chatId, botToken, enabledFeatureKeys).catch(() => null)
          : null;
        return {
          id: g.id,
          chatId: g.chatId.toString(),
          title: g.title || 'Nomsiz guruh',
          createdAt: g.createdAt,
          memberCount: health?.memberCount ?? null,
          hasIssue: health?.hasIssue ?? false,
        };
      })
    );

    return results;
  });

  // Bitta guruh uchun to'liq monitoring: salomatlik, a'zolar soni, so'rov/
  // javob statistikasi, javobsiz qolgan mavzular, faollik vaqti, moderatsiya
  // statistikasi. `days` — 7 (standart) yoki 30.
  fastify.get('/admin/groups/:id', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;
    const { id } = req.params as { id: string };
    const { days } = req.query as { days?: string };
    const periodDays = days === '30' ? 30 : 7;
    const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const group = await db.cityGroup.findUnique({ where: { id } });
    if (!group) return reply.status(404).send({ success: false, message: 'Guruh topilmadi' });

    const toggles = await db.groupFeatureToggle.findMany({ where: { cityGroupId: id, isEnabled: true } });
    const enabledFeatureKeys = toggles.map((t) => t.featureKey);

    const botToken = process.env.BOT_TOKEN;
    const health: GroupHealth = botToken
      ? await fetchGroupHealth(group.chatId, botToken, enabledFeatureKeys).catch(
          () => ({ memberCount: null, botStatus: null, canDelete: false, canRestrict: false, hasIssue: false, message: "Telegram'dan ma'lumot olib bo'lmadi" })
        )
      : { memberCount: null, botStatus: null, canDelete: false, canRestrict: false, hasIssue: false, message: 'BOT_TOKEN sozlanmagan' };

    const [totalQueries, resolvedQueries, unresolvedTopics, moderationCounts, recentQueryTimes] = await Promise.all([
      db.queryLog.count({
        where: { chatId: group.chatId, createdAt: { gte: periodStart }, intent: { not: 'NOT_RELEVANT' } },
      }),
      db.queryLog.count({
        where: { chatId: group.chatId, createdAt: { gte: periodStart }, intent: { not: 'NOT_RELEVANT' }, isResolved: true },
      }),
      db.queryLog.groupBy({
        by: ['categoryName'],
        where: { chatId: group.chatId, createdAt: { gte: periodStart }, isResolved: false, categoryName: { not: null } },
        _count: { categoryName: true },
        orderBy: { _count: { categoryName: 'desc' } },
        take: 5,
      }),
      db.moderationLog.groupBy({
        by: ['category'],
        where: { chatId: group.chatId, createdAt: { gte: periodStart } },
        _count: { category: true },
      }),
      db.queryLog.findMany({
        where: { chatId: group.chatId, createdAt: { gte: periodStart } },
        select: { createdAt: true },
      }),
    ]);

    // Server UTC'da ishlaydi (konteynerlarda TZ sozlanmagan) — Olmaliq
    // (Toshkent, UTC+5, DST yo'q) mahalliy soatiga to'g'ri o'girish uchun
    // Intl orqali hisoblanadi (server TZ sozlamasidan mustaqil, ishonchli).
    const hourFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Tashkent' });
    const activityByHour = new Array(24).fill(0);
    for (const row of recentQueryTimes) {
      const hour = parseInt(hourFormatter.format(row.createdAt), 10) % 24;
      activityByHour[hour]++;
    }

    const moderationTotal = moderationCounts.reduce((sum, m) => sum + m._count.category, 0);

    return {
      id: group.id,
      chatId: group.chatId.toString(),
      title: group.title || 'Nomsiz guruh',
      createdAt: group.createdAt,
      memberCount: health.memberCount,
      health: {
        botStatus: health.botStatus,
        canDelete: health.canDelete,
        canRestrict: health.canRestrict,
        hasIssue: health.hasIssue,
        message: health.message,
      },
      enabledFeatureKeys,
      periodDays,
      queryStats: {
        total: totalQueries,
        resolved: resolvedQueries,
        resolvedPercent: totalQueries > 0 ? Math.round((resolvedQueries / totalQueries) * 100) : null,
      },
      unresolvedTopics: unresolvedTopics.map((t) => ({ categoryName: t.categoryName, count: t._count.categoryName })),
      activityByHour,
      moderationStats: {
        total: moderationTotal,
        byCategory: moderationCounts.map((m) => ({ category: m.category, count: m._count.category })),
      },
    };
  });

  // ──────────────────────────────────────────────────────────────────────────
  // "FOYDALI BOTLAR" — xavfsizlik/moderatsiya filtrlarini (so'kinish,
  // spam-link, qimor, firibgarlik, flud) HAR BIR GURUHDA alohida yoqish/
  // o'chirish (iOS sozlamalar uslubidagi tugmalar). Standart holat: yangi
  // guruhda hammasi o'chiq — GroupFeatureToggle qatori yo'qligi shuni
  // bildiradi (apps/bot/src/moderation/enforceModeration.ts shu mantiqqa
  // qarab ishlaydi). Faqat Super-Admin — bu guruh a'zolarini avtomatik
  // jazolaydigan kuchli funksiya.
  // ──────────────────────────────────────────────────────────────────────────

  // Botlar ro'yxati + har biri nechta guruhda yoqilganini ko'rsatadi.
  fastify.get('/admin/useful-bots', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;

    const counts = await db.groupFeatureToggle.groupBy({
      by: ['featureKey'],
      where: { isEnabled: true },
      _count: { featureKey: true },
    });
    const countByKey: Record<string, number> = {};
    for (const c of counts) countByKey[c.featureKey] = c._count.featureKey;

    return USEFUL_BOTS.map((bot) => ({
      ...bot,
      enabledGroupCount: countByKey[bot.key] || 0,
    }));
  });

  // Bitta bot uchun: BARCHA guruhlar + shu guruhda yoqiq/o'chiqligi.
  fastify.get('/admin/useful-bots/:key/groups', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;

    const { key } = req.params as { key: string };
    if (!USEFUL_BOTS.some((b) => b.key === key)) {
      return reply.status(404).send({ success: false, message: "Bunday bot topilmadi" });
    }

    const [groups, toggles] = await Promise.all([
      db.cityGroup.findMany({ orderBy: { createdAt: 'desc' } }),
      db.groupFeatureToggle.findMany({ where: { featureKey: key } }),
    ]);
    const enabledGroupIds = new Set(toggles.filter((t) => t.isEnabled).map((t) => t.cityGroupId));

    return groups.map((g) => ({
      id: g.id,
      chatId: g.chatId.toString(),
      title: g.title || 'Nomsiz guruh',
      isEnabled: enabledGroupIds.has(g.id),
    }));
  });

  // Bitta guruhda bitta botni yoqish/o'chirish.
  fastify.put('/admin/useful-bots/:key/groups/:groupId', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;

    const { key, groupId } = req.params as { key: string; groupId: string };
    const { isEnabled } = req.body as { isEnabled: boolean };
    if (!USEFUL_BOTS.some((b) => b.key === key)) {
      return reply.status(404).send({ success: false, message: "Bunday bot topilmadi" });
    }

    const group = await db.cityGroup.findUnique({ where: { id: groupId } });
    if (!group) return reply.status(404).send({ success: false, message: 'Guruh topilmadi' });

    await db.groupFeatureToggle.upsert({
      where: { cityGroupId_featureKey: { cityGroupId: groupId, featureKey: key } },
      update: { isEnabled: !!isEnabled },
      create: { cityGroupId: groupId, featureKey: key, isEnabled: !!isEnabled },
    });

    return { success: true };
  });

  // ──────────────────────────────────────────────────────────────────────────
  // "SPAM-LINK FILTRI" uchun guruh-darajasidagi ruxsat etilgan domenlar.
  // Bizning o'z domenlarimiz (t.me/olmaliq_bot, olmaliq.online) bu yerga
  // KIRMAYDI — ular kodda global, doimiy ruxsat etilgan
  // (apps/bot/src/moderation/enforceModeration.ts).
  // ──────────────────────────────────────────────────────────────────────────

  fastify.get('/admin/useful-bots/groups/:groupId/allowed-domains', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;
    const { groupId } = req.params as { groupId: string };
    const domains = await db.allowedDomain.findMany({ where: { cityGroupId: groupId }, orderBy: { createdAt: 'desc' } });
    return domains;
  });

  fastify.post('/admin/useful-bots/groups/:groupId/allowed-domains', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;
    const { groupId } = req.params as { groupId: string };
    const { domain } = req.body as { domain: string };
    const cleanDomain = (domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
    if (!cleanDomain) return reply.status(400).send({ success: false, message: "Domen bo'sh bo'lishi mumkin emas" });

    const group = await db.cityGroup.findUnique({ where: { id: groupId } });
    if (!group) return reply.status(404).send({ success: false, message: 'Guruh topilmadi' });

    const created = await db.allowedDomain.upsert({
      where: { cityGroupId_domain: { cityGroupId: groupId, domain: cleanDomain } },
      update: {},
      create: { cityGroupId: groupId, domain: cleanDomain },
    });
    return { success: true, domain: created };
  });

  fastify.delete('/admin/useful-bots/allowed-domains/:domainId', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;
    const { domainId } = req.params as { domainId: string };
    await db.allowedDomain.delete({ where: { id: domainId } }).catch(() => {});
    return { success: true };
  });

  // ──────────────────────────────────────────────────────────────────────────
  // "QIMOR FILTRI" uchun admin qo'shgan GLOBAL qo'shimcha taqiqlangan
  // sayt/brend nomlari — BARCHA guruhlar uchun bitta ro'yxat (domenlar
  // ro'yxatidan farqli, guruhga bog'liq emas).
  // ──────────────────────────────────────────────────────────────────────────

  fastify.get('/admin/useful-bots/gambling-keywords', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;
    const keywords = await db.gamblingKeyword.findMany({ orderBy: { createdAt: 'desc' } });
    return keywords;
  });

  fastify.post('/admin/useful-bots/gambling-keywords', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;
    const { keyword } = req.body as { keyword: string };
    const clean = (keyword || '').trim().toLowerCase();
    if (!clean) return reply.status(400).send({ success: false, message: "So'z bo'sh bo'lishi mumkin emas" });

    const created = await db.gamblingKeyword.upsert({
      where: { keyword: clean },
      update: {},
      create: { keyword: clean },
    });
    return { success: true, keyword: created };
  });

  fastify.delete('/admin/useful-bots/gambling-keywords/:id', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;
    const { id } = req.params as { id: string };
    await db.gamblingKeyword.delete({ where: { id } }).catch(() => {});
    return { success: true };
  });

  // ──────────────────────────────────────────────────────────────────────────
  // "BLOKLANGAN XABARLAR" — barcha 5 moderatsiya filtri bo'yicha kim,
  // qachon, nima uchun jazolanganini ko'rish. SPAM_LINK yozuvlari uchun
  // "Tahlil qil" AI-tekshiruvi ham shu yerda.
  // ──────────────────────────────────────────────────────────────────────────

  fastify.get('/admin/moderation-logs', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;
    const { category, limit } = req.query as { category?: string; limit?: string };

    const logs = await db.moderationLog.findMany({
      where: category ? { category } : undefined,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit || '50', 10) || 50, 200),
    });

    // Guruh nomini ko'rsatish uchun chatId -> title moslashtiramiz.
    const chatIds = [...new Set(logs.map((l) => l.chatId))];
    const groups = await db.cityGroup.findMany({ where: { chatId: { in: chatIds } } });
    const titleByChatId = new Map(groups.map((g) => [g.chatId.toString(), g.title || 'Nomsiz guruh']));

    return logs.map((l) => ({
      id: l.id,
      chatId: l.chatId.toString(),
      groupTitle: titleByChatId.get(l.chatId.toString()) || 'Nomsiz guruh',
      telegramUserId: l.telegramUserId.toString(),
      category: l.category,
      rawMessage: l.rawMessage,
      aiAnalysis: l.aiAnalysis,
      createdAt: l.createdAt,
    }));
  });

  // Gemini "URL Context" orqali bitta havolani tahlil qiladi — FAQAT talab
  // bo'yicha (bu tugma bosilganda) ishlaydi, avtomatik emas (xarajatni
  // tejash uchun). Natija ModerationLog.aiAnalysis'ga keshlanadi — bir marta
  // so'ralgan havola ikkinchi marta qayta so'ralmaydi.
  fastify.post('/admin/moderation-logs/:id/analyze-link', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;
    const { id } = req.params as { id: string };

    const log = await db.moderationLog.findUnique({ where: { id } });
    if (!log) return reply.status(404).send({ success: false, message: 'Yozuv topilmadi' });
    if (log.aiAnalysis) return { success: true, aiAnalysis: log.aiAnalysis, cached: true };

    const urlMatch = log.rawMessage.match(/(https?:\/\/[^\s]+|www\.[^\s]+|t\.me\/[^\s]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/i);
    if (!urlMatch) {
      return reply.status(400).send({ success: false, message: 'Xabarda havola topilmadi' });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey || geminiKey === 'your_gemini_api_key_here') {
      return reply.status(503).send({ success: false, message: 'GEMINI_API_KEY sozlanmagan' });
    }

    try {
      const analysis = await analyzeLinkWithGemini(urlMatch[0], geminiKey);
      await db.moderationLog.update({ where: { id }, data: { aiAnalysis: analysis } });
      return { success: true, aiAnalysis: analysis, cached: false };
    } catch (err: any) {
      console.error('Havola AI tahlili xatosi:', err);
      return reply.status(502).send({
        success: false,
        message: `AI tahlili muvaffaqiyatsiz bo'ldi: ${err?.message || err}`,
      });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // "HABAR YUBORISH" — rejalashtirilgan ommaviy xabarlar (broadcast).
  // Faqat Super-Admin uchun — kuchli, xavfli amal (ko'plab guruhlarga
  // birdaniga yozadi), oddiy moderatorlarga yopiq (Moderatorlar boshqaruvi/
  // Bot matnlari kabi bir xil himoya darajasida).
  // ──────────────────────────────────────────────────────────────────────────
  const REPEAT_MINUTES_MAX = 60 * 24 * 30; // 30 kun — xavfsizlik cheklovi
  // Telegram Bot API'ning haqiqiy, cheklangan tugma ranglari — boshqa
  // qiymat qabul qilinmaydi (grammY/@grammyjs/types'dan tasdiqlangan).
  const VALID_BUTTON_STYLES = ['primary', 'success', 'danger'];
  // Yaroqsiz havola (masalan "http://@username") Telegram'ga yuborilganda
  // BUTUN xabarni (matnini ham) rad ettirib qo'ygan edi — ishlab chiqarishda
  // tasdiqlangan xato (2026-09). Shuning uchun bu yerda ham (webapp
  // tekshiruvidan qat'i nazar) tekshiriladi.
  const isValidButtonUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return /^https?:$/.test(parsed.protocol) && !!parsed.hostname;
    } catch {
      return false;
    }
  };

  fastify.get('/admin/broadcasts', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;
    const cityId = await getCityId(req);
    const broadcasts = await db.broadcastMessage.findMany({
      where: { cityId },
      orderBy: { createdAt: 'desc' },
    });
    return broadcasts.map((b) => ({
      ...b,
      targetChatIds: b.targetChatIds.map((c) => c.toString()),
    }));
  });

  fastify.post('/admin/broadcasts', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;
    const cityId = await getCityId(req);
    const { text, photoUrls, targetChatIds, firstSendAt, repeatIntervalMinutes, isEnabled, linkUrl, linkLabel, linkButtonStyle } = req.body;

    if (!text || !text.trim()) {
      return reply.status(400).send({ success: false, message: 'Xabar matni majburiy' });
    }
    if (!Array.isArray(targetChatIds) || targetChatIds.length === 0) {
      return reply.status(400).send({ success: false, message: 'Kamida bitta guruh/kanal tanlang' });
    }
    if (!firstSendAt) {
      return reply.status(400).send({ success: false, message: 'Yuborilish vaqti majburiy' });
    }
    if (linkButtonStyle && !VALID_BUTTON_STYLES.includes(linkButtonStyle)) {
      return reply.status(400).send({ success: false, message: "Tugma rangi noto'g'ri" });
    }
    if (linkUrl && !isValidButtonUrl(linkUrl)) {
      return reply.status(400).send({ success: false, message: "Havola noto'g'ri — https://t.me/... shaklida bo'lishi kerak" });
    }
    const interval = repeatIntervalMinutes != null ? Math.min(Number(repeatIntervalMinutes), REPEAT_MINUTES_MAX) : null;

    const broadcast = await db.broadcastMessage.create({
      data: {
        cityId,
        text,
        photoUrls: Array.isArray(photoUrls) ? photoUrls.slice(0, 8) : [],
        targetChatIds: targetChatIds.map((c: string) => BigInt(c)),
        nextSendAt: new Date(firstSendAt),
        repeatIntervalMinutes: interval,
        isEnabled: isEnabled !== false,
        linkUrl: linkUrl || null,
        linkLabel: linkLabel || null,
        linkButtonStyle: linkButtonStyle || null,
      },
    });
    return { success: true, broadcast: { ...broadcast, targetChatIds: broadcast.targetChatIds.map((c) => c.toString()) } };
  });

  fastify.put('/admin/broadcasts/:id', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;
    const { id } = req.params;
    const existing = await db.broadcastMessage.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ success: false, message: 'Post topilmadi' });

    const { text, photoUrls, targetChatIds, firstSendAt, repeatIntervalMinutes, isEnabled, linkUrl, linkLabel, linkButtonStyle } = req.body;

    if (linkButtonStyle && !VALID_BUTTON_STYLES.includes(linkButtonStyle)) {
      return reply.status(400).send({ success: false, message: "Tugma rangi noto'g'ri" });
    }
    if (linkUrl && !isValidButtonUrl(linkUrl)) {
      return reply.status(400).send({ success: false, message: "Havola noto'g'ri — https://t.me/... shaklida bo'lishi kerak" });
    }

    // Vaqt yoki interval o'zgarsa, nextSendAt qayta hisoblanadi — aks holda
    // (masalan faqat matn tahrirlansa) joriy rejalashtirilgan vaqt saqlanadi.
    let nextSendAt = existing.nextSendAt;
    if (firstSendAt !== undefined) nextSendAt = new Date(firstSendAt);

    const interval = repeatIntervalMinutes !== undefined
      ? (repeatIntervalMinutes != null ? Math.min(Number(repeatIntervalMinutes), REPEAT_MINUTES_MAX) : null)
      : existing.repeatIntervalMinutes;

    const updated = await db.broadcastMessage.update({
      where: { id },
      data: {
        ...(text !== undefined && { text }),
        ...(Array.isArray(photoUrls) && { photoUrls: photoUrls.slice(0, 8) }),
        ...(Array.isArray(targetChatIds) && { targetChatIds: targetChatIds.map((c: string) => BigInt(c)) }),
        nextSendAt,
        repeatIntervalMinutes: interval,
        ...(isEnabled !== undefined && { isEnabled: Boolean(isEnabled) }),
        ...(linkUrl !== undefined && { linkUrl: linkUrl || null }),
        ...(linkLabel !== undefined && { linkLabel: linkLabel || null }),
        ...(linkButtonStyle !== undefined && { linkButtonStyle: linkButtonStyle || null }),
        // Har qanday tahrirlash eski xato xabarini tozalaydi — keyingi
        // urinishda hali ham xato bo'lsa, worker uni qayta yozadi.
        lastError: null,
      },
    });
    return { success: true, broadcast: { ...updated, targetChatIds: updated.targetChatIds.map((c) => c.toString()) } };
  });

  fastify.delete('/admin/broadcasts/:id', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;
    const { id } = req.params;
    await db.broadcastMessage.delete({ where: { id } }).catch(() => {});
    return { success: true };
  });

  // --- 5a2. QO'SHIMCHA MAHALLIY DISPECHER RAQAMLARI (2026-09) —
  // "Mahalliy raqamlar" ekranida admin qo'shgan, cheksiz sonli qo'shimcha
  // raqamlar (mahalliy jargon so'zlar bilan). 5 ta qattiq kodlangan
  // favqulodda maydondan (gaz/suv/elektr/issiqlik/hokimiyat, hamon
  // /admin/settings/:key orqali) FARQLI — bular alohida EmergencyNumber
  // jadvalida saqlanadi va bot ularni findLocalDispatcherMatch orqali
  // (packages/core) jargon bo'yicha topadi.
  fastify.get('/admin/local-numbers', async (req: any, reply) => {
    const cityId = await getCityId(req);
    const coreKeys = CORE_EMERGENCY_KEYS.map((k) => k.key);
    const rows = await db.emergencyNumber.findMany({
      where: { cityId, key: { notIn: coreKeys } },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, numbers: rows };
  });

  // 5 ta ASOSIY mahalliy dispecher raqami (gaz/suv/elektr/issiqlik/
  // hokimiyat) — endi shu yerda ham jargon so'z qo'shish mumkin. Hali
  // yaratilmagan bo'lsa (birinchi marta) bo'sh "stub" qaytariladi.
  fastify.get('/admin/local-numbers/core', async (req: any, reply) => {
    const cityId = await getCityId(req);
    const coreKeys = CORE_EMERGENCY_KEYS.map((k) => k.key);
    const rows = await db.emergencyNumber.findMany({ where: { cityId, key: { in: coreKeys } } });
    const byKey = new Map(rows.map((r) => [r.key, r]));
    const result = CORE_EMERGENCY_KEYS.map(({ key, label, help }) => {
      const existing = byKey.get(key);
      return {
        key,
        label,
        help,
        id: existing?.id || null,
        phoneNumber: existing?.phoneNumber || '',
        jargonWords: existing?.jargonWords || [],
        messageTemplate: existing?.messageTemplate || null,
        linkUrl: existing?.linkUrl || null,
        linkLabel: existing?.linkLabel || null,
        linkButtonStyle: existing?.linkButtonStyle || null,
      };
    });
    return { success: true, numbers: result };
  });

  // "Mahalliy raqamlar" — admin uchun (raqam qo'shish/tahrirlash
  // formasida) AI 3 ta qisqa xabar shablonini taklif qiladi. Faqat admin
  // "AI'dan taklif so'rash" (yoki "Yangilash") bosganda ishlaydi.
  fastify.post('/admin/local-numbers/suggest-templates', async (req: any, reply) => {
    if (!await requireAdmin(req, reply)) return;
    const { label } = req.body as { label?: string };
    if (!label?.trim()) {
      return reply.status(400).send({ success: false, message: 'Nomi talab qilinadi' });
    }
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey || geminiKey === 'your_gemini_api_key_here' || geminiKey === 'mock_key') {
      return reply.status(503).send({ success: false, message: 'AI xizmati sozlanmagan (GEMINI_API_KEY)' });
    }
    try {
      const templates = await suggestLocalNumberTemplatesWithGemini(label.trim(), geminiKey);
      return { success: true, templates };
    } catch (err: any) {
      return reply.status(502).send({ success: false, message: `AI so'rovi muvaffaqiyatsiz: ${err?.message || err}` });
    }
  });

  function parseLinkFields(body: any): { linkUrl: string | null; linkLabel: string | null; linkButtonStyle: string | null } | { error: string } {
    const linkUrl = (body.linkUrl || '').trim();
    const linkLabel = (body.linkLabel || '').trim();
    const linkButtonStyle = body.linkButtonStyle || null;
    if (linkButtonStyle && !VALID_BUTTON_STYLES.includes(linkButtonStyle)) {
      return { error: "Noto'g'ri tugma rangi" };
    }
    if (linkUrl && !isValidButtonUrl(linkUrl)) {
      return { error: "Havola noto'g'ri (https:// bilan boshlanishi kerak)" };
    }
    return {
      linkUrl: linkUrl || null,
      linkLabel: linkUrl ? (linkLabel || null) : null,
      linkButtonStyle: linkUrl ? linkButtonStyle : null,
    };
  }

  fastify.put('/admin/local-numbers/by-key/:key', async (req: any, reply) => {
    if (!await requireAdmin(req, reply)) return;
    const { key } = req.params;
    if (!CORE_EMERGENCY_KEYS.some((k) => k.key === key)) {
      return reply.status(400).send({ success: false, message: "Noma'lum kalit" });
    }
    const cityId = await getCityId(req);
    const { phoneNumber, jargonWords, messageTemplate } = req.body as { phoneNumber?: string; jargonWords?: string[]; messageTemplate?: string | null };
    const linkFields = parseLinkFields(req.body);
    if ('error' in linkFields) return reply.status(400).send({ success: false, message: linkFields.error });
    const cleanJargon = Array.isArray(jargonWords) ? jargonWords.map((w) => w.trim().toLowerCase()).filter(Boolean) : [];
    const coreDef = CORE_EMERGENCY_KEYS.find((k) => k.key === key)!;
    const data = { phoneNumber: (phoneNumber || '').trim(), jargonWords: cleanJargon, messageTemplate: messageTemplate?.trim() || null, ...linkFields };
    const row = await db.emergencyNumber.upsert({
      where: { cityId_key: { cityId, key } },
      update: data,
      create: { cityId, key, label: coreDef.label, ...data },
    });
    return { success: true, number: row };
  });

  fastify.post('/admin/local-numbers', async (req: any, reply) => {
    if (!await requireAdmin(req, reply)) return;
    const cityId = await getCityId(req);
    const { label, phoneNumber, jargonWords, messageTemplate } = req.body as { label?: string; phoneNumber?: string; jargonWords?: string[]; messageTemplate?: string | null };
    if (!label?.trim() || !phoneNumber?.trim()) {
      return reply.status(400).send({ success: false, message: "Nomi va telefon raqami talab qilinadi" });
    }
    const linkFields = parseLinkFields(req.body);
    if ('error' in linkFields) return reply.status(400).send({ success: false, message: linkFields.error });
    const cleanJargon = Array.isArray(jargonWords) ? jargonWords.map((w) => w.trim().toLowerCase()).filter(Boolean) : [];
    // "key" — EmergencyNumber jadvalining (cityId, key) unique cheklovi
    // uchun kerak, lekin bu yozuvlar uchun ma'nosi yo'q — shu sabab har
    // doim yagona (uuid) qiymat beriladi.
    const row = await db.emergencyNumber.create({
      data: {
        cityId,
        key: `local_${crypto.randomUUID()}`,
        label: label.trim(),
        phoneNumber: phoneNumber.trim(),
        jargonWords: cleanJargon,
        messageTemplate: messageTemplate?.trim() || null,
        ...linkFields,
      },
    });
    return { success: true, number: row };
  });

  fastify.put('/admin/local-numbers/:id', async (req: any, reply) => {
    if (!await requireAdmin(req, reply)) return;
    const { id } = req.params;
    const { label, phoneNumber, jargonWords, messageTemplate } = req.body as { label?: string; phoneNumber?: string; jargonWords?: string[]; messageTemplate?: string | null };
    if (!label?.trim() || !phoneNumber?.trim()) {
      return reply.status(400).send({ success: false, message: "Nomi va telefon raqami talab qilinadi" });
    }
    const linkFields = parseLinkFields(req.body);
    if ('error' in linkFields) return reply.status(400).send({ success: false, message: linkFields.error });
    const cleanJargon = Array.isArray(jargonWords) ? jargonWords.map((w) => w.trim().toLowerCase()).filter(Boolean) : [];
    const row = await db.emergencyNumber.update({
      where: { id },
      data: { label: label.trim(), phoneNumber: phoneNumber.trim(), jargonWords: cleanJargon, messageTemplate: messageTemplate?.trim() || null, ...linkFields },
    });
    return { success: true, number: row };
  });

  fastify.delete('/admin/local-numbers/:id', async (req: any, reply) => {
    if (!await requireAdmin(req, reply)) return;
    const { id } = req.params;
    await db.emergencyNumber.delete({ where: { id } }).catch(() => {});
    return { success: true };
  });

  // --- 5b. UMUMIY SOZLAMALAR (kalit-qiymat) — masalan "Kanal/Guruhga
  // o'tish" tugmasi havolasi. Bot bu qiymatni to'g'ridan-to'g'ri
  // bazadan o'qiydi (bir necha soniyalik keshlash bilan) — admin
  // panelidan o'zgartirilishi bilan SSH/serverga tegmasdan qo'llanadi.
  fastify.get('/admin/settings/:key', async (req: any, reply) => {
    const { key } = req.params;
    const setting = await db.appSetting.findUnique({ where: { key } });
    return { key, value: setting?.value || '' };
  });

  fastify.put('/admin/settings/:key', async (req: any, reply) => {
    if (!await requireAdmin(req, reply)) return;
    const { key } = req.params;
    const { value } = req.body;
    if (typeof value !== 'string') {
      return reply.status(400).send({ success: false, message: "Qiymat matn (string) bo'lishi kerak" });
    }
    const setting = await db.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return { success: true, key: setting.key, value: setting.value };
  });

  // ──────────────────────────────────────────────────────────────────────────
  // "BOT MATNLARI & SHABLONLAR" (2026-09 to'liq qayta qurildi). MUHIM: bu
  // yerda tahrirlangan matn botning HAQIQIY xabar yuborish kodi tomonidan
  // o'qiladi (packages/core/src/botMessages/botMessageStore.ts, 60s
  // keshlangan) — avval bu ekran butunlay dekorativ edi, "Saqlash" hech
  // narsaga ta'sir qilmasdi. Har bir kalit (key) uchun ruxsat etilgan
  // tokenlar ro'yxati shu yerda — chaqiruvchi (frontend) shu katalogdan
  // qaysi tokenlarni ko'rsatishni va Saqlashda qaysi tokenlar RUXSAT
  // etilganini biladi (tasodifiy/xato token — masalan {ismm} — saqlanishdan
  // oldin rad etiladi).
  // ──────────────────────────────────────────────────────────────────────────
  const REPLY_TOKENS = ['kasb_emoji', 'kasb', 'ism', 'tasdiq', 'moljal', 'ish_vaqti', 'belgilar', 'xizmatlar', 'narx', 'tavsif', 'telefon'];
  const EMERGENCY_TOKENS = ['mahalliy_gaz', 'mahalliy_suv', 'mahalliy_elektr', 'mahalliy_issiqlik', 'mahalliy_hokimiyat', 'santexnik_royxati', 'elektrik_royxati'];
  const OTHER_TOKENS: Record<string, string[]> = {
    other_not_found_private: [],
  };
  const EMERGENCY_LABELS: Record<string, string> = {
    gas_leak: 'Gaz hidi', fire: "Yong'in", smoke: 'Tutun', electric_shock: 'Elektr toki urishi',
    unconscious: 'Hushidan ketish', bleeding: 'Qon ketishi', accident: 'Baxtsiz hodisa', drowning: "Cho'kish",
    crime: 'Jinoyat', missing_child: "Bola yo'qolishi", water_pipe: 'Quvur yorilishi (suv)',
    power_outage: "Svet o'chishi", stuck_elevator: 'Lift to\'xtab qolishi', heating_issue: 'Isitish muammosi',
    hot_water_outage: "Issiq suv yo'qligi", cold_water_outage: "Sovuq suv yo'qligi",
  };
  const OTHER_LABELS: Record<string, string> = {
    other_not_found_private: "Shaxsiyda Ma'lumot Yo'q",
  };

  function botMessageMeta(key: string, category: string): { title: string; tokens: string[]; isAutoButton?: boolean } {
    if (category === 'REPLY') return { title: 'Bitta Usta Javobi', tokens: REPLY_TOKENS };
    if (category === 'EMERGENCY') {
      const cat = key.replace(/^emergency_/, '');
      return { title: EMERGENCY_LABELS[cat] || cat, tokens: EMERGENCY_TOKENS };
    }
    return { title: OTHER_LABELS[key] || key, tokens: OTHER_TOKENS[key] || [] };
  }

  // Telegram HTML parse_mode ruxsat etgan teglar — ANIQ shular, boshqasi
  // xabarni yuborishda Telegram tomonidan RAD ETILADI (400 xato).
  const ALLOWED_HTML_TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 'ins', 's', 'strike', 'del', 'code', 'pre', 'a', 'blockquote', 'tg-spoiler', 'tg-emoji', 'span']);

  function validateTelegramHtml(text: string): string | null {
    const tagRegex = /<\/?([a-zA-Z-]+)(?:\s[^>]*)?>/g;
    const stack: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = tagRegex.exec(text)) !== null) {
      const isClosing = match[0][1] === '/';
      const tagName = match[1].toLowerCase();
      if (!ALLOWED_HTML_TAGS.has(tagName)) {
        return `Ruxsat etilmagan teg: <${tagName}> (Telegram bunday tegni tushunmaydi)`;
      }
      if (!isClosing) {
        stack.push(tagName);
      } else {
        const last = stack.pop();
        if (last !== tagName) {
          return `Teglar noto'g'ri joylashgan: </${tagName}> kutilmagan joyda`;
        }
      }
    }
    if (stack.length > 0) {
      return `Yopilmagan teg qoldi: <${stack[stack.length - 1]}>`;
    }
    return null;
  }

  function validateTokens(text: string, allowedTokens: string[]): string | null {
    const found = [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    const unknown = [...new Set(found.filter((t) => !allowedTokens.includes(t)))];
    if (unknown.length > 0) {
      return `Noma'lum token(lar): ${unknown.map((t) => `{${t}}`).join(', ')}`;
    }
    return null;
  }

  function validateBotMessageText(text: string, tokens: string[]): string | null {
    if (text.length > 3500) return `Matn juda uzun (${text.length} belgi, ko'pi bilan 3500)`;
    return validateTelegramHtml(text) || validateTokens(text, tokens);
  }

  fastify.get('/admin/bot-messages', async (req, reply) => {
    const messages = await db.botMessage.findMany({ orderBy: [{ category: 'asc' }, { key: 'asc' }] });
    return messages.map((m) => ({ ...m, ...botMessageMeta(m.key, m.category) }));
  });

  fastify.put('/admin/bot-messages/:id', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;
    const { id } = req.params;
    const { textLatin, textCyrillic, textRussian } = req.body;

    const existing = await db.botMessage.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ success: false, message: 'Shablon topilmadi' });

    const { tokens } = botMessageMeta(existing.key, existing.category);
    for (const [label, val] of [['Lotin', textLatin], ['Kirill', textCyrillic], ['Русский', textRussian]] as const) {
      if (val === undefined) continue;
      const err = validateBotMessageText(val, tokens);
      if (err) return reply.status(400).send({ success: false, message: `${label}: ${err}` });
    }

    const updated = await db.botMessage.update({
      where: { id },
      data: {
        ...(textLatin !== undefined && { textLatin }),
        ...(textCyrillic !== undefined && { textCyrillic }),
        ...(textRussian !== undefined && { textRussian }),
      },
    });

    return { success: true, ...updated, ...botMessageMeta(updated.key, updated.category) };
  });

  // --- 7. DIRECT CHATS & SUHBATLAR ---
  fastify.get('/admin/chats', async (req: any, reply) => {
    const users = await db.user.findMany({
      where: { role: 'USER' },
      orderBy: { createdAt: 'desc' },
    });

    const chats = await Promise.all(
      users.map(async (user) => {
        const lastMessage = await db.chatMessage.findFirst({
          where: { telegramUserId: user.telegramId },
          orderBy: { createdAt: 'desc' },
        });
        return {
          id: user.id,
          telegramId: user.telegramId.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          phoneNumber: user.phoneNumber,
          lastMessageText: lastMessage ? lastMessage.text : 'Suhbat boshlanmagan',
          lastMessageTime: lastMessage ? lastMessage.createdAt : user.createdAt,
        };
      })
    );

    chats.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
    return chats;
  });

  fastify.get('/admin/users', async (req: any, reply) => {
    const { search, filter } = req.query as { search?: string; filter?: string };

    // Botga /start bosgan HAMMA ko'rsatiladi — admin/moderator hisoblari
    // ham (role qaysi bo'lishidan qat'i nazar), UI'da rol belgisi bilan
    // ajratib ko'rsatiladi. Faqat "admin" filtri tanlansa cheklanadi.
    const whereClause: any = {};
    if (filter === 'admin') {
      whereClause.role = { not: 'USER' };
    }

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
      ];
      // MUHIM (2026-09): avval telegramId (BigInt) bu yerda UMUMAN
      // tekshirilmasdi — UserChatScreen "search=<telegramUserId>" orqali
      // aynan shu foydalanuvchini topishga urinardi, lekin HECH QACHON
      // topolmasdi (natijada doim boshlang'ich soxta statistika ko'rsatilardi).
      if (/^\d+$/.test(search)) {
        try {
          whereClause.OR.push({ telegramId: BigInt(search) });
        } catch {
          // juda katta/noto'g'ri son bo'lsa e'tiborsiz qoldiriladi
        }
      }
    }

    if (filter === 'new') {
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      whereClause.createdAt = { gte: fortyEightHoursAgo };
    }

    let users = await db.user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    let result = await Promise.all(
      users.map(async (user) => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const queryCountToday = await db.queryLog.count({
          where: {
            telegramUserId: user.telegramId,
            createdAt: { gte: todayStart },
          },
        });

        const hasComplaints = await db.chatMessage.count({
          where: {
            telegramUserId: user.telegramId,
            isComplaint: true,
          },
        }) > 0;

        const lastMsg = await db.chatMessage.findFirst({
          where: { telegramUserId: user.telegramId },
          orderBy: { createdAt: 'desc' },
        });

        const lastActivity = lastMsg ? lastMsg.createdAt : user.createdAt;

        // MUHIM (2026-09): avval webapp'ning UserChatScreen'i bu yerda
        // BO'LMAGAN maydonlarni o'zi o'ylab topardi ("registeredAt:
        // lastActivity" — noto'g'ri, "queryCountTotal: queryCountToday+20"
        // — shunchaki o'ylab chiqarilgan raqam). Endi ikkalasi ham HAQIQIY:
        // ro'yxatdan o'tgan sana (user.createdAt) va jami (barcha vaqt)
        // so'rovlar soni.
        const queryCountTotal = await db.queryLog.count({
          where: { telegramUserId: user.telegramId },
        });

        return {
          id: user.id,
          telegramId: user.telegramId.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          phoneNumber: user.phoneNumber,
          queryCountToday,
          queryCountTotal,
          registeredAt: user.createdAt,
          hasComplaints,
          lastActivity,
          lastMessageText: lastMsg ? lastMsg.text : null,
          isSuspended: user.isSuspended,
          role: user.role,
        };
      })
    );

    if (filter === 'active') {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      result = result.filter(u => new Date(u.lastActivity) >= twentyFourHoursAgo);
    }

    if (filter === 'complained') {
      result = result.filter(u => u.hasComplaints);
    }

    result.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    return result;
  });

  // Foydalanuvchini bloklash/blokdan chiqarish (moderatorRoutes.ts'dagi
  // moderator-suspend naqshiga mos, oddiy botga /start bosgan userlar
  // uchun). Avval UsersScreen'dagi "Blok" tugmasi soxta edi (faqat alert
  // chiqarardi, hech narsa saqlamasdi) — endi haqiqiy ishlaydi.
  fastify.put('/admin/users/:id/suspend', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;
    const { id } = req.params;
    const { suspend } = req.body as { suspend: boolean };

    const user = await db.user.findUnique({ where: { id } });
    if (!user || user.role !== 'USER') {
      return reply.status(404).send({ success: false, message: 'Foydalanuvchi topilmadi' });
    }

    const updated = await db.user.update({
      where: { id },
      data: { isSuspended: Boolean(suspend), suspendedAt: suspend ? new Date() : null },
    });

    return { success: true, isSuspended: updated.isSuspended };
  });

  fastify.get('/admin/chats/:telegramUserId/messages', async (req: any, reply) => {
    const { telegramUserId } = req.params;
    const messages = await db.chatMessage.findMany({
      where: { telegramUserId: BigInt(telegramUserId) },
      orderBy: { createdAt: 'asc' },
    });
    return messages.map((m) => ({
      id: m.id,
      telegramUserId: m.telegramUserId.toString(),
      senderType: m.senderType,
      text: m.text,
      isComplaint: m.isComplaint,
      createdAt: m.createdAt,
    }));
  });

  fastify.post('/admin/chats/:telegramUserId/messages', async (req: any, reply) => {
    if (!await requireAdmin(req, reply)) return;
    const { telegramUserId } = req.params;
    const { text } = req.body;
    if (!text) return reply.status(400).send({ success: false, message: 'Message text is required' });

    const tgUserId = BigInt(telegramUserId);
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) return reply.status(500).send({ success: false, message: 'BOT_TOKEN is not configured' });

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: tgUserId.toString(),
          text: text,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        console.error('Failed to send Telegram message:', body);
        return reply.status(502).send({ success: false, message: 'Failed to send message via Telegram Bot', error: body });
      }
    } catch (err) {
      console.error('Telegram API error:', err);
      return reply.status(500).send({ success: false, message: 'Telegram API call failed', error: err });
    }

    const m = await db.chatMessage.create({
      data: {
        telegramUserId: tgUserId,
        senderType: 'ADMIN',
        text: text,
      },
    });

    return {
      success: true,
      message: {
        id: m.id,
        telegramUserId: m.telegramUserId.toString(),
        senderType: m.senderType,
        text: m.text,
        createdAt: m.createdAt,
      },
    };
  });

  fastify.post('/admin/users/:telegramUserId/reply', async (req: any, reply) => {
    if (!await requireAdmin(req, reply)) return;
    const { telegramUserId } = req.params;
    const { text } = req.body;
    if (!text) return reply.status(400).send({ success: false, message: 'Message text is required' });

    const tgUserId = BigInt(telegramUserId);
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) return reply.status(500).send({ success: false, message: 'BOT_TOKEN is not configured' });

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: tgUserId.toString(),
          text: text,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        console.error('Failed to send Telegram message:', body);
        return reply.status(502).send({ success: false, message: 'Failed to send message via Telegram Bot', error: body });
      }
    } catch (err) {
      console.error('Telegram API error:', err);
      return reply.status(500).send({ success: false, message: 'Telegram API call failed', error: err });
    }

    const m = await db.chatMessage.create({
      data: {
        telegramUserId: tgUserId,
        senderType: 'ADMIN',
        text: text,
      },
    });

    try {
      await db.auditLog.create({
        data: {
          userId: req.user?.id || null,
          cityId: req.user?.cityId || null,
          action: 'REPLY_TO_USER',
          details: {
            telegramUserId: telegramUserId,
            messageText: text,
          },
        },
      });
    } catch (auditErr) {
      console.error('Failed to log audit:', auditErr);
    }

    return {
      success: true,
      message: {
        id: m.id,
        telegramUserId: m.telegramUserId.toString(),
        senderType: m.senderType,
        text: m.text,
        createdAt: m.createdAt,
      },
    };
  });


  fastify.get('/admin/complaints', async (req: any, reply) => {
    const complaints = await db.chatMessage.findMany({
      where: { isComplaint: true },
      orderBy: { createdAt: 'desc' },
    });

    const resolvedComplaints = await Promise.all(
      complaints.map(async (c) => {
        const user = await db.user.findUnique({
          where: { telegramId: c.telegramUserId },
        });
        return {
          id: c.id,
          telegramUserId: c.telegramUserId.toString(),
          text: c.text,
          createdAt: c.createdAt,
          user: user ? {
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
          } : null,
        };
      })
    );

    return resolvedComplaints;
  });

  fastify.get('/admin/queries/top-10', async (req: any, reply) => {
    const cityId = await getCityId(req);
    const { period } = req.query || {};

    // MUHIM (2026-09 topilgan xato, real skrinshot bilan tasdiqlangan):
    // bu so'rov avval ne `period` filtrini (frontend uzatsa ham,
    // e'tiborga olinmasdi — "Bugun/Hafta/Oy" tugmalari amalda hech
    // narsani o'zgartirmasdi), NE intent'ni tekshirmasdi — natijada
    // o'z-e'lonlari ("металлом оламиз ...", ko'p marta takrorlangan
    // spam) "Top 10 qidiruvlar"da haqiqiy so'rovlar bilan bir qatorda
    // ko'rsatilardi. Endi ikkalasi ham /admin/stats bilan bir xil
    // qoida bo'yicha qo'llaniladi.
    let periodStart: Date | undefined;
    if (period === 'today') {
      periodStart = new Date();
      periodStart.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
    const periodFilter = periodStart ? { createdAt: { gte: periodStart } } : {};

    const result = await db.queryLog.groupBy({
      by: ['rawMessage'],
      where: {
        cityId,
        rawMessage: { not: '' },
        intent: { not: 'NOT_RELEVANT' },
        ...periodFilter,
      },
      _count: {
        rawMessage: true,
      },
      orderBy: {
        _count: {
          rawMessage: 'desc',
        },
      },
      take: 10,
    });

    return result.map((r) => ({
      query: r.rawMessage,
      count: r._count.rawMessage,
    }));
  });
}

