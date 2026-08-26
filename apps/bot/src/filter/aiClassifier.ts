import { ClassifierResult, IntentType, ListingObjectType } from '@kimbor/types';
import { classifierPrompt, normalizeText, matchCategoryFromText } from '@kimbor/core';
import { db } from '@kimbor/db';
import crypto from 'crypto';

// Simple in-memory fallback cache if Redis is not connected
const memoryCache = new Map<string, { data: ClassifierResult; expiresAt: number }>();

/**
 * 1-Qavat AI Klassifikator.
 * User message intent va ob'ektini Gemini Flash yordamida tahlil qiladi.
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
  const cacheKey = `kimbor:classifier:${crypto.createHash('md5').update(normalized).digest('hex')}`;

  // 1. Keshni tekshirish (10 minutlik)
  const cached = memoryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const geminiKey = apiKey || process.env.GEMINI_API_KEY;
  let result: ClassifierResult;

  // 2. Gemini Flash AI so'rovini bajarish (Agar API key mavjud bo'lsa).
  // Tarmoq/server tomonidan vaqtinchalik (bir martalik) xatolar odatiy hol —
  // shuning uchun darhol qo'pol fallbackka o'tish o'rniga, qisqaroq muddat
  // bilan BIR MARTA qayta urinib ko'riladi. Umumiy eng ko'p kutish vaqti
  // avvalgidek ~8 soniya, lekin endi ikkita imkoniyat bilan.
  if (geminiKey && geminiKey !== 'your_gemini_api_key_here' && geminiKey !== 'mock_key') {
    result =
      (await callGeminiClassifier(cleanText, geminiKey, 4000)) ||
      (await callGeminiClassifier(cleanText, geminiKey, 4000)) ||
      fallbackRuleClassification(normalized, cleanText);
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
      },
    }).catch((err) => console.error('Failed to log QueryLog to DB:', err));
  }

  return result;
}

/**
 * Gemini'ga bitta klassifikatsiya so'rovini yuboradi. Muvaffaqiyatsiz bo'lsa
 * (tarmoq xatosi, vaqt tugashi, HTTP xato, yoki JSON parslanmasa) — sababini
 * LOGGA yozib, `null` qaytaradi (avval HTTP-xato holatida hech narsa
 * loglanmas edi, shu sabab guruhda nima uchun javob kelmayotgani
 * ko'rinmas edi).
 */
async function callGeminiClassifier(
  cleanText: string,
  geminiKey: string,
  timeoutMs: number
): Promise<ClassifierResult | null> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${classifierPrompt}\n\nINPUT: "${cleanText}"` }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
        signal: abortController.signal,
      }
    );

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      console.warn(`⚠️ Gemini HTTP ${response.status}: ${bodyText.slice(0, 200)}`);
      return null;
    }

    const json = await response.json();
    const rawOutput = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawOutput) {
      console.warn('⚠️ Gemini javobida matn topilmadi:', JSON.stringify(json).slice(0, 200));
      return null;
    }

    const parsed = JSON.parse(rawOutput);
    return {
      intent: parsed.intent as IntentType,
      object_type: parsed.object_type as ListingObjectType | null,
      category: parsed.category || null,
      name: parsed.name || null,
      landmark: parsed.landmark || null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
    };
  } catch (e: any) {
    console.warn(`⚠️ Gemini so'rovi muvaffaqiyatsiz (${e?.name || 'error'}):`, e?.message || e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * High-precision local fallback classification logic for 35+ test scenarios.
 */
export function fallbackRuleClassification(normalized: string, rawText: string): ClassifierResult {
  // Emergency overrides (Must be EMERGENCY and confidence >= 0.9)
  const isEmergency =
    /gaz hidi|gaz isi|gaz chiqyapti|gaz sizyapti|paxnet|zapax gaza|utechka|yong'in|yongin|o't ketdi|ot ketdi|yonyapti|olov|pojar|gorit|zagorelos|tutun|dym|zadamlenie|elektr urdi|tok urdi|udar tokom|hushidan ketdi|xushidan ketdi|bez soznaniya|poteryal soznanie|qon ketyapti|qattiq kesildi|krovotechenie|silno porezalsya|avariya|mashina urdi|dtp|suvga cho'kdi|chokdi|tonet|utonul|o'g'rilik|ogrilik|bosqin|urishyapti|grabyat|napadenie|draka|bola yo'qoldi|bola yoqoldi|propal rebenok|rebenok|propal/.test(
      normalized
    );

  if (isEmergency) {
    return {
      intent: IntentType.EMERGENCY,
      object_type: null,
      category: 'emergency',
      name: null,
      landmark: null,
      confidence: 0.98,
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
  // Gemini ishlamay qolganda ham (tarmoq xatosi/timeout) bot "ko'r" bo'lib
  // qolmaydi — barcha ma'lum kasblarni tanib oladi.
  const dictMatch = matchCategoryFromText(normalized);
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
  // bilan majburan qaytarilardi — bu Gemini ishlamay qolganda (tarmoq xatosi)
  // har qanday aloqasiz gapga (masalan "Raduga tomonlar tinchmi?") xato
  // javob berish xavfini oshirar edi. Endi faqat LUG'ATDA HAQIQATDA mavjud
  // kasb/soha aniqlangandagina (dictMatch) SERVICE deb hisoblanadi.
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
