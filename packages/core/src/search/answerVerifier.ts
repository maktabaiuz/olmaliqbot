import crypto from 'crypto';
import { reserveGeminiCallSlot } from '../filter/aiClassifier';

/**
 * Javobni yuborishdan OLDINGI yakuniy tekshiruv (2026-10-02, "false
 * positive himoyasi").
 *
 * Shu loyihada topilgan deyarli BARCHA noto'g'ri javoblar bir xil
 * shaklda bo'lgan: AI savolni to'g'ri tushungan, lekin qidiruv
 * mexanizmi bitta tasodifiy so'z mosligi ("oq tepa"~"toy tepa",
 * "kalonka", "karzinka", "sotadi") orqali BOSHQA sohadagi yozuvni
 * "qutqarib" chiqargan. Har safar alohida so'z qoidasi bilan
 * tuzatilardi — keyingi yangi so'z yana xuddi shu yo'l bilan o'tib
 * ketardi.
 *
 * Tub yechim: faqat XAVFLI javoblar (AI aniqlagan kategoriyaga mos
 * kelmagan, jargon orqali kelgan) uchun AI'dan bitta qisqa savol
 * so'raladi: "bu odam aynan shu biznesni so'rayaptimi?" — so'z emas,
 * MA'NO tekshiriladi. Oddiy (kategoriya mos kelgan) javoblarga tegilmaydi,
 * shuning uchun AI byudjeti va tezlikka ta'siri kichik.
 */

const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const VERIFY_TIMEOUT_MS = 2500;
const CACHE_TTL_MS = 10 * 60 * 1000;

export type VerificationVerdict = 'relevant' | 'irrelevant' | 'unknown';

const cache = new Map<string, { verdict: VerificationVerdict; expiresAt: number }>();

const SYSTEM_PROMPT = `You are the final quality check of a local business directory bot in Olmaliq, Uzbekistan.
A person wrote a message in a city Telegram group (Uzbek Latin/Cyrillic, Russian, slang, typos).
The search engine proposes ONE business as the answer. Decide if sending it would be a correct, helpful answer.

relevant = true ONLY if the person is actually asking for this kind of business/service, or for this specific business.
A described problem or task that this kind of professional normally handles IS relevant even if the trade name is not written — e.g. "kran almashtirish kerak" / "unitaz tiqilib qoldi" → plumber (santexnik); "darvozaga svarka" → welder; "svet yo'q, rozetka kuydi" → electrician.
relevant = false if the message is about something else, for example:
- a road, turn, traffic, a place/landmark itself ("is the X turn open", "how is the road to X")
- news, events, gossip, safety, utility outages, prices of things in general
- an advertisement or someone offering their own service/item
- a different trade or product than the proposed business offers
- the overlap is only a shared word inside a place name (e.g. "To'ytepa" vs "Oqtepa lavash")
- the person wants to BUY or SELL an item (a car, phone, house…) or is looking for BUYERS/SELLERS of it — e.g. "Damas oladiganlar nomeri" (people who buy Damas cars) is NOT a request for a taxi or any transport service; a car model name alone does not mean they need a ride
If the proposed business is a "city service phone number" (electricity, gas, water dispatcher): a person reporting an outage/problem of THAT service or asking for its number IS relevant; a message that only contains a similar-looking word (e.g. "svetofor" traffic light vs "svet" electricity) is NOT.
Use "THIS BUSINESS SAYS IT OFFERS" to judge what the business really does — the category name alone can be too narrow.
When unsure, answer false — staying silent is better than a wrong contact.
Return only JSON: {"relevant": true|false}`;

export async function verifyAnswerRelevance(params: {
  message: string;
  listingName: string;
  categoryName: string | null;
  matchedPhrase: string | null;
  /** Yozuvning o'zi qanday xizmatlarni ko'rsatadi (jargon iboralari,
   * xizmatlar ro'yxati). Kategoriya nomi tor bo'lishi mumkin — masalan
   * "Televizor ustasi" kalonka ham tuzatadi; buni AI shu ro'yxatdan
   * biladi (aks holda to'g'ri javobni ham rad etardi). */
  services?: string[];
}): Promise<VerificationVerdict> {
  const key = crypto
    .createHash('md5')
    .update(`${params.message}|${params.listingName}|${params.categoryName}`)
    .digest('hex');
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.verdict;

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey === 'your_gemini_api_key_here' || geminiKey === 'mock_key') return 'unknown';
  if (!reserveGeminiCallSlot()) return 'unknown';

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), VERIFY_TIMEOUT_MS);
  try {
    const userText =
      `MESSAGE: "${params.message}"\n` +
      `PROPOSED BUSINESS: "${params.listingName}" (category: ${params.categoryName || 'unknown'})` +
      (params.matchedPhrase ? `\nMATCHED BY PHRASE: "${params.matchedPhrase}"` : '') +
      (params.services && params.services.length > 0
        ? `\nTHIS BUSINESS SAYS IT OFFERS: ${params.services.slice(0, 10).map((x) => `"${x}"`).join(', ')}`
        : '');
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': geminiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: { type: 'OBJECT', properties: { relevant: { type: 'BOOLEAN' } }, required: ['relevant'] },
          maxOutputTokens: 200,
          // Barqaror qaror: bir xil savol+javobga har safar bir xil hukm (2026-10-09:
          // standart tasodifiylik bilan "kran almashtirish → santexnik" goh o'tib, goh rad etilardi)
          temperature: 0,
          temperature: 0,
        },
      }),
      signal: abort.signal,
    });
    if (!res.ok) {
      console.warn(`⚠️ Javob tekshiruvi: Gemini HTTP ${res.status}`);
      return 'unknown';
    }
    const json: any = await res.json();
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = raw ? JSON.parse(raw) : null;
    if (typeof parsed?.relevant !== 'boolean') {
      console.warn('⚠️ Javob tekshiruvi: noaniq javob', String(raw).slice(0, 120), json.candidates?.[0]?.finishReason);
      return 'unknown';
    }
    const verdict: VerificationVerdict = parsed.relevant ? 'relevant' : 'irrelevant';
    cache.set(key, { verdict, expiresAt: Date.now() + CACHE_TTL_MS });
    return verdict;
  } catch (err) {
    console.warn('⚠️ Javob tekshiruvi xatosi:', (err as Error).message);
    return 'unknown';
  } finally {
    clearTimeout(timer);
  }
}
