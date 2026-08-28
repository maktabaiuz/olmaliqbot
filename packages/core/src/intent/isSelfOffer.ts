import { normalizeText } from '../transliteration';

/**
 * Guruhdagi gap so'ROVmi yoki E'LONmi.
 * So'rov: odam xizmat/transport QIDIRADI → bot javob berishi kerak.
 * E'lon: odam o'zida bor narsani TAKLIF qiladi yoki yuk/ish qidiradi → bot JIM.
 *
 * Gemini xato qilsa ham, bu qoida groupHandlerda qattiq to'xtatadi:
 * kategoriya so'zi (labo, taksi, ...) xabarda bo'lgani javob uchun yetarli emas.
 */
export function isSelfOffer(text: string): boolean {
  const n = normalizeText(text);
  if (!n) return false;

  // Aniq so'rov belgisi ustun: "menga X kerak", "X bormi", "X nomeri"
  if (isClearSeek(n)) return false;

  if (hasFirstPersonPossession(n)) return true;
  if (/\byo'?lga chiqaman\b/.test(n)) return true;
  if (/\b(bo'sh|bosh) ketaman\b/.test(n)) return true;
  if (/\bolib ketaman\b/.test(n) && !/\bolib ketadigan\b/.test(n)) return true;
  if (/\bkimda yuk\b/.test(n)) return true;
  if (/\byuk bormi\b/.test(n) && hasVehicleHint(n)) return true;
  if (/\bish bo'?lsa\b/.test(n) && (/\bmenda\b/.test(n) || hasVehicleHint(n))) return true;
  if (/\b(menga|bizga)\s+yozing\b/.test(n)) return true;
  if (/\bkerak bo'?lsa\b/.test(n) && /\b(menga|bizga|yozing|qo'?ng'?iroq|qongiroq)\b/.test(n)) return true;
  if (/\b(menga|bizga)\s+qo'?ng'?iroq\b/.test(n)) return true;
  if (/\b(xizmat ko'?rsataman|ishlayman murojaat|murojaat qiling)\b/.test(n)) return true;

  return false;
}

function isClearSeek(n: string): boolean {
  if (/\bbormi\b/.test(n)) return true;
  if (/\b(nomeri|raqami|telefoni)\b/.test(n) && !/\bmenda\b/.test(n)) return true;
  if (/\bmenga\b/.test(n) && /\bkerak\b/.test(n) && !/\bkerak bo'?lsa\b/.test(n)) return true;
  if (/\b(qayerda|narxi|qancha|nechigacha)\b/.test(n)) return true;
  if (
    /\bkimda\b/.test(n) &&
    /\b(nomeri|raqami|labo|lobo|taksi|usta|gazavik)\b/.test(n) &&
    !/\bkimda yuk\b/.test(n)
  ) {
    return true;
  }
  return false;
}

function hasFirstPersonPossession(n: string): boolean {
  if (!/\bmenda\b/.test(n)) return false;
  if (/\bbormi\b/.test(n)) return false;
  return /\bbor\b/.test(n);
}

function hasVehicleHint(n: string): boolean {
  return /\b(labo|lobo|taksi|damas|starex|porter|gazel|gazelle|mashina|laboda|loboda|taksida)\b/.test(
    n
  );
}
