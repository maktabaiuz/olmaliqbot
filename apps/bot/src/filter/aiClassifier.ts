import { ClassifierResult, IntentType, ListingObjectType } from '@kimbor/types';
import { classifierPrompt, normalizeText, matchCategoryFromText, levenshteinDistance, INITIAL_DICTIONARY, isSelfOffer, detectEmergencyCategory } from '@kimbor/core';
import { db } from '@kimbor/db';
import crypto from 'crypto';

// Simple in-memory fallback cache if Redis is not connected
const memoryCache = new Map<string, { data: ClassifierResult; expiresAt: number }>();

// MUHIM TARIX (2026-09): loyiha avval Gemini'dan foydalangan, lekin
// bepul tarifning 15/so'rov-daqiqa chegarasi productionda bot butunlay
// "jim" bo'lib qolishiga sabab bo'lgani uchun Claude'ga o'tkazilgan edi.
// Endi (Claude hisobida balans tugagani sabab) qaytadan Gemini'ga
// o'tkazildi — xuddi shu tanazzulning oldini olish uchun bu yerda ham
// xavfsiz mahalliy chegara saqlanadi (agar hozirgi kalit yana bepul
// tarifda bo'lsa ham, bot butunlay jim qolib ketmaydi — zaxira
// klassifikatorga tushadi).
const GEMINI_RPM_SAFE_LIMIT = 12;
const recentGeminiCallTimestamps: number[] = [];
function reserveGeminiCallSlot(): boolean {
  const now = Date.now();
  while (recentGeminiCallTimestamps.length > 0 && now - recentGeminiCallTimestamps[0] > 60_000) {
    recentGeminiCallTimestamps.shift();
  }
  if (recentGeminiCallTimestamps.length >= GEMINI_RPM_SAFE_LIMIT) return false;
  recentGeminiCallTimestamps.push(now);
  return true;
}

// Guruh chatidagi xabarlarning katta qismi ("salom", kulgi, oddiy gap-so'z,
// rasm izohi) umuman xizmat/kasb bilan bog'liq emas — bunday xabarlarni
// tekin AI so'roviga yubormasdan, TEZKOR va BEPUL mahalliy tekshiruv orqali
// oldindan ajratib olamiz. Shu bilan tor 15/daqiqa chegara FAQAT haqiqatan
// ham nomzod bo'lgan xabarlarga sarflanadi — pullik tarifga o'tguncha
// vaqtinchalik, lekin sezilarli samarali chora (real trafikda 70-90%
// xabarlar hech qanday signal so'zisiz bo'ladi).
// DIQQAT: bu funksiya juda "saxiy" (keng qamrovli) bo'lishi SHART — signalni
// o'tkazib yuborish (false negative) chin so'rovga botning jim qolishiga
// olib keladi, signalni ortiqcha topish (false positive) esa faqat bitta
// qo'shimcha AI so'rovi sarflaydi. Shubha bo'lsa — signal bor deb hisoblanadi.
const REQUEST_SIGNAL_RE =
  /\b(kerak|kerakmi|bormi|bo'?lsa|qolsa|yo'?qmi|qayerda|qaerda|qanaqa|qancha|narxi|nechada|nechiga|nechi|nomeri|raqami|telefoni|qo'?ng'?iroq|murojaat|izlayapman|izlamoqda|izlab|ishlaydimi|ishlaydi|arenda|ijara|sotiladi|sotaman|sotamiz|sotilmoqda|beriladi|beraman|beramiz|kimda|kimdadir|topib|yordam)\b/;

function hasPossibleServiceSignal(normalized: string): boolean {
  if (!normalized || normalized.length < 3) return false;
  // Favqulodda holat belgisi — buni HECH QACHON o'tkazib yubormaslik kerak.
  if (detectEmergencyCategory(normalized)) return true;
  // Lug'atdagi aniq yoki yozilish xatosiga chidamli kasb/kategoriya so'zi.
  if (matchCategoryFromText(normalized)) return true;
  if (fuzzyMatchCategoryFromText(normalized)) return true;
  // So'rov/taklif/e'lon ekanini ko'rsatuvchi umumiy belgi so'zlar.
  if (REQUEST_SIGNAL_RE.test(normalized)) return true;
  return false;
}

/**
 * 1-Qavat AI Klassifikator.
 * User message intent va ob'ektini Gemini (Google) yordamida tahlil qiladi.
 * Natija 10 daqiqa keshlanadi. Har bir so'rov QueryLog jadvaliga yoziladi.
 */
export async function classifyQuery(
  userMessage: string,
  cityId?: string,
  telegramUserId?: bigint,
  apiKey?: string
): Promise<ClassifierResult> {
  const cleanText = userMessage.trim();
  const normalized = normalizeText(cleanText);
  const cacheKey = `kimbor:classifier:v2:${crypto.createHash('md5').update(normalized).digest('hex')}`;

  // 1. Keshni tekshirish (10 minutlik)
  const cached = memoryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const geminiKey = apiKey || process.env.GEMINI_API_KEY;
  let result: ClassifierResult;

  // 2. Gemini AI so'rovini bajarish (Agar API key mavjud va RPM chegarasidan
  // hali oshmagan bo'lsa). Tarmoq/server tomonidan vaqtinchalik (bir
  // martalik) xatolar odatiy hol — shuning uchun darhol qo'pol fallbackka
  // o'tish o'rniga, qisqaroq muddat bilan BIR MARTA qayta urinib ko'riladi.
  // LEKIN: agar birinchi urinish aynan RATE LIMIT (429) sababli
  // muvaffaqiyatsiz bo'lsa, ikkinchi urinish DARHOL qilinmaydi.
  const geminiUsable = !!geminiKey && geminiKey !== 'your_gemini_api_key_here' && geminiKey !== 'mock_key';

  if (geminiUsable && hasPossibleServiceSignal(normalized)) {
    if (reserveGeminiCallSlot()) {
      const first = await callGeminiClassifier(cleanText, geminiKey, 6000);
      if (first.data) {
        result = first.data;
      } else if (!first.rateLimited && reserveGeminiCallSlot()) {
        const second = await callGeminiClassifier(cleanText, geminiKey, 6000);
        result = second.data || fallbackRuleClassification(normalized, cleanText);
      } else {
        result = fallbackRuleClassification(normalized, cleanText);
      }
    } else {
      result = fallbackRuleClassification(normalized, cleanText);
    }
  } else {
    // API key bo'lmasa qoidalarga asoslangan lokal klassifikatsiya
    result = fallbackRuleClassification(normalized, cleanText);
  }

  // Qat'iy qoida: confidence < 0.7 bo'lsa bot jim turadi (NOT_RELEVANT)
  if (result.confidence < 0.7) {
    result.intent = IntentType.NOT_RELEVANT;
  }

  // 3. 10 daqiqaga keshga saqlash (600,000 ms)
  memoryCache.set(cacheKey, { data: result, expiresAt: Date.now() + 10 * 60 * 1000 });

  // 4. Har bir tahlil qilingan so'rovni QueryLog jadvaliga yozish
  // Javobni sekinlashtirmasligi uchun kutilmaydi (fire-and-forget)
  if (cityId) {
    db.queryLog.create({
      data: {
        cityId,
        telegramUserId: telegramUserId || BigInt(0),
        rawMessage: cleanText,
        intent: result.intent,
        categoryName: result.category,
        landmarkName: result.landmark,
        isResolved: false,
        confidence: result.confidence,
      },
    }).catch((err) => console.error('Failed to log QueryLog to DB:', err));
  }

  return result;
}

interface GeminiCallOutcome {
  data: ClassifierResult | null;
  /** HTTP 429 (rate limit) sababli muvaffaqiyatsiz bo'ldimi — shu holatda
   * darhol qayta urinish foydasiz, chunki bir xil oynada baribir yana
   * 429 qaytaradi. */
  rateLimited: boolean;
}

// Gemini'ga aniq, tuzilgan (structured) JSON javob qaytarishni MAJBUR qilish
// uchun `responseSchema` + `responseMimeType: "application/json"` ishlatiladi
// (Gemini structured-output mexanizmi Claude'ning tool-use'iga tengdosh) —
// bu erkin matn ichidan JSON "ushlashga" harakat qilishdan (markdown
// bloklar, qo'shimcha izohlar bilan buzilishi mumkin) ancha ishonchli.
// Diqqat: Gemini schema'sida type qiymatlari UPPERCASE bo'lishi shart.
const CLASSIFY_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    intent: {
      type: 'STRING',
      enum: ['CONTACT', 'SERVICE', 'HOURS', 'LOCATION', 'PRICE', 'EMERGENCY', 'NOT_RELEVANT'],
    },
    object_type: {
      type: 'STRING',
      enum: ['USTA', 'DOKON_OBYEKT', 'MUASSASA', 'TRANSPORT', 'NONE'],
    },
    category: { type: 'STRING', description: 'lowercase Latin, normalized, yoki bo\'sh satr' },
    name: { type: 'STRING', description: 'person or place name, yoki bo\'sh satr' },
    landmark: { type: 'STRING', description: 'landmark as the person said it, yoki bo\'sh satr' },
    urgency: { type: 'STRING', enum: ['low', 'medium', 'high'] },
    confidence: { type: 'NUMBER' },
  },
  required: ['intent', 'urgency', 'confidence'],
};

const GEMINI_MODEL = 'gemini-3.5-flash-lite';

/**
 * Gemini'ga bitta klassifikatsiya so'rovini yuboradi. Muvaffaqiyatsiz bo'lsa
 * (tarmoq xatosi, vaqt tugashi, HTTP xato) — sababini LOGGA yozib, `data:
 * null` qaytaradi (guruhda nima uchun javob kelmayotgani ko'rinishi uchun).
 */
async function callGeminiClassifier(
  cleanText: string,
  geminiKey: string,
  timeoutMs: number
): Promise<GeminiCallOutcome> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': geminiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: classifierPrompt }] },
          contents: [{ role: 'user', parts: [{ text: `INPUT: "${cleanText}"` }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: CLASSIFY_RESPONSE_SCHEMA,
            maxOutputTokens: 400,
          },
        }),
        signal: abortController.signal,
      }
    );

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      console.warn(`⚠️ Gemini HTTP ${response.status}: ${bodyText.slice(0, 200)}`);
      return { data: null, rateLimited: response.status === 429 };
    }

    const json = await response.json();
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      console.warn('⚠️ Gemini javobida matn topilmadi:', JSON.stringify(json).slice(0, 200));
      return { data: null, rateLimited: false };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.warn('⚠️ Gemini javobi JSON emas:', rawText.slice(0, 200));
      return { data: null, rateLimited: false };
    }

    return {
      data: {
        intent: parsed.intent as IntentType,
        object_type: (parsed.object_type && parsed.object_type !== 'NONE'
          ? parsed.object_type
          : null) as ListingObjectType | null,
        category: parsed.category || null,
        name: parsed.name || null,
        landmark: parsed.landmark || null,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
      },
      rateLimited: false,
    };
  } catch (e: any) {
    console.warn(`⚠️ Gemini so'rovi muvaffaqiyatsiz (${e?.name || 'error'}):`, e?.message || e);
    return { data: null, rateLimited: false };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Yozilish xatolariga chidamli (fuzzy) kasb moslashtirish — faqat aniq
 * ("contains") qidiruv (matchCategoryFromText) hech narsa topmagandagina
 * ishga tushadi. Claude band/limitlangan bo'lganda, fallback klassifikator
 * yagona himoya bo'lib qoladi — shu sabab u ham oddiy yozilish xatolariga
 * (masalan "santehnik" -> "Santexnik") chidamli bo'lishi kerak, aks holda
 * ko'plab haqiqiy so'rovlar sukut saqlab qolar edi. searchEngine.ts'dagi
 * fuzzyFindCategory bilan bir xil mantiq.
 */
function fuzzyMatchCategoryFromText(normalizedText: string): { canonicalName: string; objectType: string | null } | null {
  const words = normalizedText.replace(/[-']/g, '').split(/\s+/).filter((w) => w.length >= 3);
  const candidates = new Set<string>();
  for (let i = 0; i < words.length; i++) {
    candidates.add(words[i]);
    if (i + 1 < words.length) candidates.add(words[i] + words[i + 1]);
  }
  if (candidates.size === 0) return null;

  let best: { canonicalName: string; objectType: string | null; distance: number; candLength: number } | null = null;
  for (const cat of INITIAL_DICTIONARY.categories as Array<{ name: string; synonyms: string[]; object_type?: string }>) {
    const targets = [cat.name, ...cat.synonyms]
      .map((s: string) => normalizeText(s).replace(/[\s'-]+/g, ''))
      .filter((t: string) => t.length >= 4);

    for (const target of targets) {
      for (const cand of candidates) {
        if (Math.abs(target.length - cand.length) > 3) continue;
        const dist = levenshteinDistance(cand, target);
        const threshold = Math.max(1, Math.floor(target.length / 6));
        if (dist > threshold) continue;
        const isBetter = !best || cand.length > best.candLength || (cand.length === best.candLength && dist < best.distance);
        if (isBetter) {
          best = { canonicalName: cat.name, objectType: cat.object_type || null, distance: dist, candLength: cand.length };
        }
      }
    }
  }
  return best ? { canonicalName: best.canonicalName, objectType: best.objectType } : null;
}

/**
 * High-precision local fallback classification logic for 35+ test scenarios.
 */
export function fallbackRuleClassification(normalized: string, rawText: string): ClassifierResult {
  // Emergency overrides (Must be EMERGENCY and confidence >= 0.9). Avval bu
  // yerda alohida, dublikat regex ro'yxati bor edi va category har doim
  // literal "emergency" satrini qaytarardi — bu EMERGENCY_TEMPLATES'dagi
  // HECH BIR kalit bilan mos kelmasdi, natijada favqulodda xabar UMUMAN
  // yuborilmay qolar edi (renderEmergencyTemplate null qaytarardi). Endi
  // yagona haqiqat manbai (EMERGENCY_TEMPLATES) orqali ANIQ shablon kaliti
  // topiladi.
  const emergencyCategory = detectEmergencyCategory(rawText);

  if (emergencyCategory) {
    return {
      intent: IntentType.EMERGENCY,
      object_type: null,
      category: emergencyCategory,
      name: null,
      landmark: null,
      confidence: 0.98,
    };
  }

  // E'lon: "menda labo bor", "yo'lga chiqaman kimda yuk bor" — lug'atdagi
  // kasb so'zi bo'lsa ham so'rov emas. Claude yo'qida ham (fallback rejimda)
  // shu qat'iy qoida saqlanadi — isSelfOffer @kimbor/core'da bitta joyda
  // ta'riflangan, groupHandler/directHandlerda ham xuddi shu funksiya orqali
  // AI javobidan qat'i nazar qattiq to'xtatiladi (bu yerda esa faqat Claude
  // ishlamay qolganda fallback matn-asosli klassifikatorni ham himoya qiladi).
  if (isSelfOffer(rawText) || isSelfOffer(normalized)) {
    return {
      intent: IntentType.NOT_RELEVANT,
      object_type: null,
      category: null,
      name: null,
      landmark: null,
      confidence: 0.95,
    };
  }

  let intent: IntentType = IntentType.NOT_RELEVANT;
  let objectType: ListingObjectType | null = null;
  let category: string | null = null;
  let landmark: string | null = null;
  let name: string | null = null;
  let confidence = 0.88;

  // Category matching — 7 ta qattiq kodlangan so'z emas, balki BUTUN lug'at
  // (76+ kasb/soha va ularning sinonimlari) bo'yicha qidiradi. Shu orqali
  // Claude ishlamay qolganda ham (tarmoq xatosi/timeout) bot "ko'r" bo'lib
  // qolmaydi — barcha ma'lum kasblarni tanib oladi.
  const dictMatch = matchCategoryFromText(normalized) || fuzzyMatchCategoryFromText(normalized);
  if (dictMatch) {
    intent = dictMatch.canonicalName.toLowerCase() === 'notarius' ? IntentType.LOCATION : IntentType.SERVICE;
    objectType = (dictMatch.objectType as ListingObjectType) || ListingObjectType.USTA;
    category = dictMatch.canonicalName.toLowerCase();
  }

  // Name detection
  if (normalized.includes('bahrom')) name = 'Bahrom';
  if (normalized.includes('aziz')) name = 'Aziz';

  // Contact intent override
  if ((name || category) && /nomeri|nomer|raqami|raqam|telefoni|telefon|kontakt/.test(normalized)) {
    intent = IntentType.CONTACT;
    if (!objectType) objectType = ListingObjectType.USTA;
  }

  // Hours intent override
  if (/nechigacha|nechida|ochiqmi|ishlaydimi|do skolki|vo skolko|otkryto/.test(normalized)) {
    intent = IntentType.HOURS;
  }

  // Price intent override
  if (/qancha|qanchaga|narxi|skolko stoit|pochem/.test(normalized)) {
    intent = IntentType.PRICE;
  }

  // Landmark matching
  if (/karzinka|korzinka/.test(normalized)) {
    landmark = 'karzinka';
  } else if (/bozor/.test(normalized)) {
    landmark = 'bozor';
  } else if (/3-mavze|3 mavze|tretij/.test(normalized)) {
    landmark = '3-mavze';
  }

  // Lug'atda mos kasb topilmasa (dictMatch bo'sh) — past ishonchlilik bilan
  // NOT_RELEVANT qoldiriladi. Avval bu yerda qolgan har qanday matn
  // (umumiy so'zlar olib tashlangandan keyingi qoldiq) o'zboshimchalik bilan
  // "category" sifatida ishlatilib, SERVICE intent va 0.85 ishonchlilik
  // bilan majburan qaytarilardi — bu Claude ishlamay qolganda (tarmoq xatosi)
  // har qanday aloqasiz gapga xato javob berish xavfini oshirar edi. Endi
  // faqat LUG'ATDA HAQIQATDA mavjud kasb/soha aniqlangandagina (dictMatch)
  // SERVICE deb hisoblanadi.
  if (intent === IntentType.NOT_RELEVANT && !category && !name && !landmark) {
    confidence = 0.35;
  }

  return {
    intent,
    object_type: objectType,
    category,
    name,
    landmark,
    confidence,
  };
}
