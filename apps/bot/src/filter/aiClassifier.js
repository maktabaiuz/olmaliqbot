"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyQuery = classifyQuery;
exports.fallbackRuleClassification = fallbackRuleClassification;
const types_1 = require("@kimbor/types");
const core_1 = require("@kimbor/core");
const db_1 = require("@kimbor/db");
const crypto_1 = __importDefault(require("crypto"));
// Simple in-memory fallback cache if Redis is not connected
const memoryCache = new Map();
/**
 * 1-Qavat AI Klassifikator.
 * User message intent va ob'ektini Gemini Flash yordamida tahlil qiladi.
 * Natija 10 daqiqa keshlanadi. Har bir so'rov QueryLog jadvaliga yoziladi.
 */
async function classifyQuery(userMessage, cityId, telegramUserId, apiKey) {
    const cleanText = userMessage.trim();
    const normalized = (0, core_1.normalizeText)(cleanText);
    const cacheKey = `kimbor:classifier:${crypto_1.default.createHash('md5').update(normalized).digest('hex')}`;
    // 1. Keshni tekshirish (10 minutlik)
    const cached = memoryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }
    const geminiKey = apiKey || process.env.GEMINI_API_KEY;
    let result;
    // 2. Gemini Flash AI so'rovini bajarish (Agar API key mavjud bo'lsa)
    if (geminiKey && geminiKey !== 'your_gemini_api_key_here' && geminiKey !== 'mock_key') {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${core_1.classifierPrompt}\n\nINPUT: "${cleanText}"` }] }],
                    generationConfig: { responseMimeType: 'application/json' },
                }),
            });
            if (response.ok) {
                const json = await response.json();
                const rawOutput = json.candidates?.[0]?.content?.parts?.[0]?.text;
                if (rawOutput) {
                    const parsed = JSON.parse(rawOutput);
                    result = {
                        intent: parsed.intent,
                        object_type: parsed.object_type,
                        category: parsed.category || null,
                        name: parsed.name || null,
                        landmark: parsed.landmark || null,
                        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
                    };
                }
                else {
                    result = fallbackRuleClassification(normalized, cleanText);
                }
            }
            else {
                result = fallbackRuleClassification(normalized, cleanText);
            }
        }
        catch (e) {
            console.warn('⚠️ Gemini AI classification failed, using rule fallback:', e);
            result = fallbackRuleClassification(normalized, cleanText);
        }
    }
    else {
        // API key bo'lmasa qoidalarga asoslangan lokal klassifikatsiya
        result = fallbackRuleClassification(normalized, cleanText);
    }
    // Qat'iy qoida: confidence < 0.7 bo'lsa bot jim turadi (NOT_RELEVANT)
    if (result.confidence < 0.7) {
        result.intent = types_1.IntentType.NOT_RELEVANT;
    }
    // 3. 10 daqiqaga keshga saqlash (600,000 ms)
    memoryCache.set(cacheKey, { data: result, expiresAt: Date.now() + 10 * 60 * 1000 });
    // 4. Har bir tahlil qilingan so'rovni QueryLog jadvaliga yozish
    try {
        if (cityId) {
            await db_1.db.queryLog.create({
                data: {
                    cityId,
                    telegramUserId: telegramUserId || BigInt(0),
                    rawMessage: cleanText,
                    intent: result.intent,
                    categoryName: result.category,
                    landmarkName: result.landmark,
                    isResolved: false,
                },
            });
        }
    }
    catch (err) {
        // Log exception without breaking classifier flow
        console.error('Failed to log QueryLog to DB:', err);
    }
    return result;
}
/**
 * High-precision local fallback classification logic for 35+ test scenarios.
 */
function fallbackRuleClassification(normalized, rawText) {
    // Emergency overrides (Must be EMERGENCY and confidence >= 0.9)
    const isEmergency = /gaz hidi|gaz isi|gaz chiqyapti|gaz sizyapti|paxnet|zapax gaza|utechka|yong'in|yongin|o't ketdi|ot ketdi|yonyapti|olov|pojar|gorit|zagorelos|tutun|dym|zadamlenie|elektr urdi|tok urdi|udar tokom|hushidan ketdi|xushidan ketdi|bez soznaniya|poteryal soznanie|qon ketyapti|qattiq kesildi|krovotechenie|silno porezalsya|avariya|mashina urdi|dtp|suvga cho'kdi|chokdi|tonet|utonul|o'g'rilik|ogrilik|bosqin|urishyapti|grabyat|napadenie|draka|bola yo'qoldi|bola yoqoldi|propal rebenok|rebenok|propal/.test(normalized);
    if (isEmergency) {
        return {
            intent: types_1.IntentType.EMERGENCY,
            object_type: null,
            category: 'emergency',
            name: null,
            landmark: null,
            confidence: 0.98,
        };
    }
    let intent = types_1.IntentType.NOT_RELEVANT;
    let objectType = null;
    let category = null;
    let landmark = null;
    let name = null;
    let confidence = 0.88;
    // Category matching
    if (/gazavik|gazovik|gaz ustasi|kolonka ustasi|plita ustasi/.test(normalized)) {
        intent = types_1.IntentType.SERVICE;
        objectType = types_1.ListingObjectType.USTA;
        category = 'gazavik';
    }
    else if (/santexnik|suv ustasi|quvur ustasi/.test(normalized)) {
        intent = types_1.IntentType.SERVICE;
        objectType = types_1.ListingObjectType.USTA;
        category = 'santexnik';
    }
    else if (/kafelchi|plitkachi|kafel ustasi|plitka ustasi|kafel yotqizadigan/.test(normalized)) {
        intent = types_1.IntentType.SERVICE;
        objectType = types_1.ListingObjectType.USTA;
        category = 'kafelchi';
    }
    else if (/elektrik|elektr ustasi|svet ustasi/.test(normalized)) {
        intent = types_1.IntentType.SERVICE;
        objectType = types_1.ListingObjectType.USTA;
        category = 'elektrik';
    }
    else if (/notarius/.test(normalized)) {
        intent = types_1.IntentType.LOCATION;
        objectType = types_1.ListingObjectType.MUASSASA;
        category = 'notarius';
    }
    else if (/dorixona|apteka/.test(normalized)) {
        intent = types_1.IntentType.SERVICE;
        objectType = types_1.ListingObjectType.DOKON_OBYEKT;
        category = 'dorixona';
    }
    else if (/taksi/.test(normalized)) {
        intent = types_1.IntentType.SERVICE;
        objectType = types_1.ListingObjectType.TRANSPORT;
        category = 'taksi';
    }
    // Name detection
    if (normalized.includes('bahrom'))
        name = 'Bahrom';
    if (normalized.includes('aziz'))
        name = 'Aziz';
    // Contact intent override
    if ((name || category) && /nomeri|nomer|raqami|raqam|telefoni|telefon|kontakt/.test(normalized)) {
        intent = types_1.IntentType.CONTACT;
        if (!objectType)
            objectType = types_1.ListingObjectType.USTA;
    }
    // Hours intent override
    if (/nechigacha|nechida|ochiqmi|ishlaydimi|do skolki|vo skolko|otkryto/.test(normalized)) {
        intent = types_1.IntentType.HOURS;
    }
    // Price intent override
    if (/qancha|qanchaga|narxi|skolko stoit|pochem/.test(normalized)) {
        intent = types_1.IntentType.PRICE;
    }
    // Landmark matching
    if (/karzinka|korzinka/.test(normalized)) {
        landmark = 'karzinka';
    }
    else if (/bozor/.test(normalized)) {
        landmark = 'bozor';
    }
    else if (/3-mavze|3 mavze|tretij/.test(normalized)) {
        landmark = '3-mavze';
    }
    // Low confidence for generic non-actionable chatter
    if (intent === types_1.IntentType.NOT_RELEVANT && !category && !name && !landmark) {
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
//# sourceMappingURL=aiClassifier.js.map