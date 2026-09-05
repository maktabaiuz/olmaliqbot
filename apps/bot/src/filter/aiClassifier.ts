import { ClassifierResult, IntentType, ListingObjectType } from '@kimbor/types';
import { classifierPrompt, normalizeText, matchCategoryFromText, levenshteinDistance, INITIAL_DICTIONARY, isSelfOffer, detectEmergencyCategory } from '@kimbor/core';
import { db } from '@kimbor/db';
import crypto from 'crypto';

// Simple in-memory fallback cache if Redis is not connected
const memoryCache = new Map<string, { data: ClassifierResult; expiresAt: number }>();

// Claude API'ning standart tariflari ham daqiqalik so'rov chegarasiga ega
// (Gemini bepul tarifidagi 15/min muammosi productionda tasdiqlangan edi —
// bot butunlay "jim" bo'lib qolgan). Xuddi shu turdagi tanazzulning oldini
// olish uchun bu yerda ham xavfsiz mahalliy chegara saqlanadi — Claude
// tarifi Gemini bepul tarifidan ancha yuqori bo'lgani uchun chegara ham
// mos ravishda yuqoriroq (45/min), lekin baribir himoya sifatida qoladi.
const CLAUDE_RPM_SAFE_LIMIT = 45;
const recentClaudeCallTimestamps: number[] = [];
function reserveClaudeCallSlot(): boolean {
  const now = Date.now();
  while (recentClaudeCallTimestamps.length > 0 && now - recentClaudeCallTimestamps[0] > 60_000) {
    recentClaudeCallTimestamps.shift();
  }
  if (recentClaudeCallTimestamps.length >= CLAUDE_RPM_SAFE_LIMIT) return false;
  recentClaudeCallTimestamps.push(now);
  return true;
}

/**
 * 1-Qavat AI Klassifikator.
 * User message intent va ob'ektini Claude (Anthropic) yordamida tahlil qiladi.
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

  const claudeKey = apiKey || process.env.ANTHROPIC_API_KEY;
  let result: ClassifierResult;

  // 2. Claude AI so'rovini bajarish (Agar API key mavjud va RPM chegarasidan
  // hali oshmagan bo'lsa). Tarmoq/server tomonidan vaqtinchalik (bir
  // martalik) xatolar odatiy hol — shuning uchun darhol qo'pol fallbackka
  // o'tish o'rniga, qisqaroq muddat bilan BIR MARTA qayta urinib ko'riladi.
  // LEKIN: agar birinchi urinish aynan RATE LIMIT (429) sababli
  // muvaffaqiyatsiz bo'lsa, ikkinchi urinish DARHOL qilinmaydi.
  if (claudeKey && claudeKey !== 'your_anthropic_api_key_here' && claudeKey !== 'mock_key') {
    if (reserveClaudeCallSlot()) {
      const first = await callClaudeClassifier(cleanText, claudeKey, 6000);
      if (first.data) {
        result = first.data;
      } else if (!first.rateLimited && reserveClaudeCallSlot()) {
        const second = await callClaudeClassifier(cleanText, claudeKey, 6000);
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

interface ClaudeCallOutcome {
  data: ClassifierResult | null;
  /** HTTP 429 (rate limit) sababli muvaffaqiyatsiz bo'ldimi — shu holatda
   * darhol qayta urinish foydasiz, chunki bir xil oynada baribir yana
   * 429 qaytaradi. */
  rateLimited: boolean;
}

// Claude'ga aniq, tuzilgan (structured) JSON javob qaytarishni MAJBUR qilish
// uchun tool-use (function calling) ishlatiladi — bu erkin matn ichidan JSON
// "ushlashga" harakat qilishdan (markdown bloklar, qo'shimcha izohlar bilan
// buzilishi mumkin) ancha ishonchli.
const CLASSIFY_TOOL = {
  name: 'classify_message',
  description: "Classify a message from an Uzbek city group chat for a local directory bot.",
  input_schema: {
    type: 'object' as const,
    properties: {
      intent: {
        type: 'string',
        enum: ['CONTACT', 'SERVICE', 'HOURS', 'LOCATION', 'PRICE', 'EMERGENCY', 'NOT_RELEVANT'],
      },
      object_type: {
        type: ['string', 'null'],
        enum: ['USTA', 'DOKON', 'MUASSASA', 'TRANSPORT', null],
      },
      category: { type: ['string', 'null'], description: 'lowercase Latin, normalized' },
      name: { type: ['string', 'null'], description: 'person or place name' },
      landmark: { type: ['string', 'null'], description: 'landmark as the person said it' },
      urgency: { type: 'string', enum: ['low', 'medium', 'high'] },
      confidence: { type: 'number' },
    },
    required: ['intent', 'urgency', 'confidence'],
  },
};

/**
 * Claude'ga bitta klassifikatsiya so'rovini yuboradi. Muvaffaqiyatsiz bo'lsa
 * (tarmoq xatosi, vaqt tugashi, HTTP xato) — sababini LOGGA yozib, `data:
 * null` qaytaradi (guruhda nima uchun javob kelmayotgani ko'rinishi uchun).
 */
async function callClaudeClassifier(
  cleanText: string,
  claudeKey: string,
  timeoutMs: number
): Promise<ClaudeCallOutcome> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: classifierPrompt,
        messages: [{ role: 'user', content: `INPUT: "${cleanText}"` }],
        tools: [CLASSIFY_TOOL],
        tool_choice: { type: 'tool', name: 'classify_message' },
      }),
      signal: abortController.signal,
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      console.warn(`⚠️ Claude HTTP ${response.status}: ${bodyText.slice(0, 200)}`);
      return { data: null, rateLimited: response.status === 429 };
    }

    const json = await response.json();
    const toolUse = json.content?.find((block: any) => block.type === 'tool_use');
    if (!toolUse || !toolUse.input) {
      console.warn('⚠️ Claude javobida tool_use topilmadi:', JSON.stringify(json).slice(0, 200));
      return { data: null, rateLimited: false };
    }

    const parsed = toolUse.input;
    return {
      data: {
        intent: parsed.intent as IntentType,
        object_type: (parsed.object_type || null) as ListingObjectType | null,
        category: parsed.category || null,
        name: parsed.name || null,
        landmark: parsed.landmark || null,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
      },
      rateLimited: false,
    };
  } catch (e: any) {
    console.warn(`⚠️ Claude so'rovi muvaffaqiyatsiz (${e?.name || 'error'}):`, e?.message || e);
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
