/**
 * gamblingAiCheck.ts
 *
 * Brend nomisiz, "yashiringan" qimor reklamalarini (masalan "tetya Anvar
 * har kuni yutyapti, qiziqsangiz shaxsiyga yozing") aniqlash uchun Gemini'ga
 * qo'shimcha, tor savol beradi. FAQAT `looksLikePossibleGamblingAd()` allaqachon
 * "shubhali" deb topgan xabarlarda chaqiriladi (ya'ni juda kam, aksariyat
 * xabarlarda umuman ishlamaydi) — shu sabab ASOSIY AI klassifikator bilan
 * BIR XIL umumiy Gemini byudjetini (`reserveGeminiCallSlot`) baham ko'radi,
 * alohida cheklov shart emas.
 */

const GEMINI_MODEL = 'gemini-3.5-flash-lite';

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    isGamblingAd: { type: 'BOOLEAN' },
  },
  required: ['isGamblingAd'],
};

const SYSTEM_PROMPT =
  "Siz o'zbek shahar guruh-chatlaridagi xabarlarni tahlil qilasiz. Sizga bitta xabar beriladi — u brend nomisiz, " +
  "yashiringan qimor/bukmeker reklamasi yoki taklifi (masalan 'har kuni yutaman, qiziqsangiz shaxsimga yozing') " +
  "ekanini aniqlang. Oddiy sport-muhokama, tabrik yoki umuman aloqasi yo'q xabarlarni QIMOR REKLAMASI DEB " +
  "HISOBLAMANG. Faqat JSON qaytaring: {\"isGamblingAd\": true} yoki {\"isGamblingAd\": false}.";

/**
 * `true` — bu haqiqatan ham (Gemini fikricha) yashiringan qimor reklamasi.
 * Har qanday xato (tarmoq, vaqt tugashi, rate-limit) holatida `false`
 * qaytaradi — noaniq holatda odamni jazolamaslik xavfsizroq.
 */
export async function checkGamblingWithAI(text: string, geminiKey: string): Promise<boolean> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 6000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': geminiKey, 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: `Xabar: "${text}"` }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: SCHEMA,
            maxOutputTokens: 50,
          },
        }),
        signal: abortController.signal,
      }
    );

    if (!response.ok) {
      console.warn(`⚠️ Qimor-AI tekshiruvi HTTP ${response.status}`);
      return false;
    }

    const json = await response.json();
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return false;
    const parsed = JSON.parse(rawText);
    return parsed.isGamblingAd === true;
  } catch (err) {
    console.warn("⚠️ Qimor-AI tekshiruvi muvaffaqiyatsiz:", (err as any)?.message || err);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
