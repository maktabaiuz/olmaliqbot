import { classifyQuery } from '../filter/aiClassifier';
import { searchListings } from './searchEngine';
import { findLocalDispatcherMatch } from '../emergency/localDispatcher';

/** AI'siz rejimda dispetcher tekshiruvi ham AI'siz ishlashi uchun kalitni
 * vaqtincha yashiradi. */
async function withMockKey<T>(fn: () => Promise<T>): Promise<T> {
  const saved = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'mock_key';
  try {
    return await fn();
  } finally {
    process.env.GEMINI_API_KEY = saved;
  }
}
import { IntentType } from '@kimbor/types';

/**
 * "Oltin test to'plami" (2026-10-02) — production'da REAL topilgan har bir
 * noto'g'ri javob (false positive) va kafolatlanishi shart bo'lgan to'g'ri
 * javoblar. Har deploydan keyin `verify.yml` orqali butun pipeline
 * (klassifikator + qidiruv + yakuniy tekshiruv) bilan ishga tushiriladi —
 * tuzatilgan xato qaytib kelsa, darhol ko'rinadi.
 *
 * Yangi real xato topilganda — shu ro'yxatga qo'shiladi (avval xato
 * qayta hosil qilinadi, keyin tuzatiladi, keyin shu yerga yoziladi).
 */
export type GoldenExpectation =
  | { kind: 'silence' }
  | { kind: 'any' }
  | { kind: 'includes'; text: string }
  | { kind: 'not_includes'; text: string };

export interface GoldenCase {
  message: string;
  expect: GoldenExpectation;
  /** Qaysi real xatodan kelib chiqqani — izoh uchun. */
  origin: string;
}

export const GOLDEN_CASES: GoldenCase[] = [
  // ---------- Bot JIM turishi shart bo'lgan holatlar ----------
  { message: 'Assalom aleykum akalar toy tepa pavarodi ochiqmikan othanlar bormi', expect: { kind: 'silence' }, origin: "To'ytepa yo'li → Oqtepa lavash (2026-10-02)" },
  { message: 'qiziltepa tomonga yol ochiqmi', expect: { kind: 'silence' }, origin: "To'ytepa xatosining varianti" },
  { message: 'Radugada korzinkani yonida TELEFON.UZB', expect: { kind: 'silence' }, origin: "Reklama matni → bo'yoqchi Behruz (karzinka)" },
  { message: 'Akala Alisa aqlli kalonka qayerda sotadi bilmislami', expect: { kind: 'silence' }, origin: 'Aqlli kalonka → TV usta (omonim)' },
  { message: 'Assalomu aleykum akalar 29 linya kanechnik tomondan qanaqa choyxona bor', expect: { kind: 'silence' }, origin: 'Qanaqa choyxona — tasodifiy tanlov' },
  { message: 'Raduga tomonlar tinchmi?', expect: { kind: 'silence' }, origin: 'Xavfsizlik savoli, xizmat emas' },
  { message: 'kecha labo band bolib ketdi hech qayerga bormadim', expect: { kind: 'silence' }, origin: 'Hikoya, so\'rov emas' },
  { message: 'Arendaga yengil mashina kerak edi uzoq muddatga taksi qilishga emas', expect: { kind: 'not_includes', text: 'Taksi' }, origin: 'Inkor: "taksi EMAS"' },
  { message: "ozi nega to'xtavogan, mumkinmasu svetafor tagida turish", expect: { kind: 'silence' }, origin: 'Svetofor → elektr dispetcheri (2026-10-02)' },
  { message: "oxirgi vaqtlar o'sha svetafor tagida moshina ko'payib qoldi o'zi", expect: { kind: 'silence' }, origin: 'Svetofor → elektr dispetcheri (2026-10-02)' },
  // ---------- Bot JAVOB BERISHI shart bo'lgan holatlar ----------
  { message: 'santexnik kerak', expect: { kind: 'any' }, origin: 'Asosiy xizmat' },
  { message: 'malyar kerak', expect: { kind: 'any' }, origin: 'Asosiy xizmat' },
  { message: 'beshbirdagi zaprafka ochiqmi', expect: { kind: 'any' }, origin: "Mo'ljal + soha" },
  { message: 'balon kerak', expect: { kind: 'includes', text: 'Largo' }, origin: 'Soha so\'zi orqali qutqarish' },
  { message: 'oqtepa lavash nomeri kerak', expect: { kind: 'includes', text: 'Oqtepa' }, origin: 'Atoqli nom' },
  { message: 'oq tepa lavashni nomeri kerak', expect: { kind: 'includes', text: 'Oqtepa' }, origin: 'Atoqli nom, ajratib yozilgan' },
  { message: 'n1 choyxona nomeri kerak', expect: { kind: 'includes', text: 'N1' }, origin: 'Qisqa atoqli nom' },
  { message: 'Gagarin choyxona nomeri bormi', expect: { kind: 'includes', text: 'Gagarin' }, origin: 'Atoqli nom' },
  { message: 'kalonka ustasi kerak', expect: { kind: 'any' }, origin: 'Kalonka — to\'g\'ri ma\'noda' },
  { message: "svet o'chib qoldi elektr nomeri kerak", expect: { kind: 'includes', text: 'Elektr' }, origin: 'Dispetcher — to\'g\'ri ma\'noda' },
  { message: 'Radugada korzinka yonida malyar kerak', expect: { kind: 'any' }, origin: "Mo'ljal + soha (karzinka to'g'ri ishlatilgan)" },
];

export interface GoldenResult {
  message: string;
  origin: string;
  expected: string;
  got: string;
  pass: boolean;
  aiSource?: string;
  verifiedBy?: string;
}

function describe(e: GoldenExpectation): string {
  switch (e.kind) {
    case 'silence': return 'SILENCE';
    case 'any': return 'ANSWER';
    case 'includes': return `~${e.text}`;
    case 'not_includes': return `NOT ${e.text}`;
  }
}

/** Butun pipeline orqali barcha holatlarni ishga tushiradi. AI limitiga
 * tushmaslik uchun holatlar orasida kutish (`delayMs`) qo'yiladi. */
export async function runGoldenSuite(
  cityId: string,
  delayMs = 5500,
  /** true — klassifikator AI'siz (zaxira lug'at) ishlaydi: Gemini ishlamay
   * qolgan yoki limit tugagan holatni ATAYLAB sinash uchun. */
  withoutAi = false
): Promise<GoldenResult[]> {
  const results: GoldenResult[] = [];
  for (const c of GOLDEN_CASES) {
    // Botdagi tartib: avval mahalliy dispetcher raqamlari tekshiriladi.
    const dispatcher = withoutAi ? await withMockKey(() => findLocalDispatcherMatch(c.message, cityId)) : await findLocalDispatcherMatch(c.message, cityId);
    if (dispatcher) {
      const got = dispatcher.label;
      const e = c.expect;
      const pass = e.kind === 'any' || (e.kind === 'includes' && got.toLowerCase().includes(e.text.toLowerCase())) || (e.kind === 'not_includes' && !got.toLowerCase().includes(e.text.toLowerCase()));
      results.push({ message: c.message, origin: c.origin, expected: describe(e), got, pass, aiSource: 'dispatcher' });
      if (delayMs > 0) await new Promise((res) => setTimeout(res, delayMs));
      continue;
    }
    const cls = await classifyQuery(c.message, cityId, undefined, withoutAi ? 'mock_key' : undefined, { noCache: true });
    const seeking = cls.intent !== IntentType.NOT_RELEVANT;
    const r = await searchListings({
      cityId,
      categoryName: seeking ? cls.category : null,
      landmarkName: seeking ? cls.landmark : null,
      rawMessage: c.message,
      intent: cls.intent,
      name: seeking ? cls.name : null,
      requestedBadges: [],
      rentalFilters: null,
      objectType: seeking ? cls.object_type : null,
      disableAiVerification: withoutAi,
    });
    const got: string = r ? (r.listing?.name as string) || 'ANSWER' : 'SILENCE';
    const e = c.expect;
    const pass =
      e.kind === 'silence' ? !r
      : e.kind === 'any' ? !!r
      : e.kind === 'includes' ? !!r && got.toLowerCase().includes(e.text.toLowerCase())
      : !r || !got.toLowerCase().includes(e.text.toLowerCase());
    results.push({ message: c.message, origin: c.origin, expected: describe(e), got, pass, aiSource: cls.source, verifiedBy: r?.verifiedBy });
    if (delayMs > 0) await new Promise((res) => setTimeout(res, delayMs));
  }
  return results;
}
