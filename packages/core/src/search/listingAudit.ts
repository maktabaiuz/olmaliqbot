import { db } from '@kimbor/db';
import { IntentType } from '@kimbor/types';
import { classifyQuery } from '../filter/aiClassifier';
import { searchListings } from './searchEngine';
import { normalizeText } from '../transliteration';

/**
 * Baza bo'yicha to'liq false-positive auditi (2026-10-02).
 *
 * Har bir FAOL yozuvning HAR BIR jargon iborasi bittalab sinaladi:
 *  - statik xavflar: juda qisqa, faqat manzil nomi, boshqa kategoriya nomi,
 *    turli sohadagi yozuvlarda bir xil ibora;
 *  - dinamik sinov: ibora "shovqin" gaplarga (yo'l, savdo e'loni, hikoya)
 *    qo'yiladi — bot JIM turishi shart; "<ibora> kerak" gapida esa javob
 *    shu sohadan kelishi shart.
 * Sinov AI'siz (eng zaif rejim) o'tkaziladi — shu rejimda o'tgan ibora AI
 * bilan ham xavfsiz.
 */

const NOISE_TEMPLATES = [
  '{s} tomonda yol yopiqmi bugun',
  '{s} sotaman arzon narxda yozinglar',
  'kecha {s} haqida gaplashib otirdik',
];
// Ibora odatda butun gap ("labo kerak edi nomeri bormi") — shovqin sinovi
// uchun undan faqat SOHA so'zi ajratiladi, aks holda sinov gapi ichida
// baribir so'rov qolib ketadi.
const REQUEST_WORDS = new Set(['kerak', 'kere', 'edi', 'bormi', 'bor', 'nomeri', 'nomer', 'nemeri', 'raqami', 'ochiqmi', 'ishlaydimi', 'nechigacha', 'ishlaydi', 'bugun', 'qaysi', 'qayerda', 'kim', 'biladi', 'bilasizlarmi', 'tavsiya', 'olmaliqda', 'da', 'ga', 'lar', 'bollar', '?']);
function coreTerm(phrase: string): string {
  return phrase.split(/\s+/).filter((w) => w && !REQUEST_WORDS.has(w)).join(' ');
}

const REQUEST_TEMPLATE = '{s} kerak edi nomeri bormi';

export interface AuditIssue {
  listing: string;
  category: string;
  phrase: string;
  kind: 'short' | 'landmark_only' | 'other_category' | 'shared_cross_category' | 'noise_answered' | 'request_wrong_category';
  detail: string;
}

export async function auditListings(cityId: string, opts: { dynamic?: boolean; limit?: number } = {}): Promise<{
  listings: number;
  phrases: number;
  issues: AuditIssue[];
}> {
  const listings = await db.listing.findMany({
    where: { cityId, status: 'ACTIVE' },
    select: { id: true, name: true, categoryId: true, jargonSynonyms: true, category: { select: { name: true } } },
    take: opts.limit,
  });
  const landmarks = await db.landmark.findMany({ where: { cityId }, select: { name: true, synonyms: true } });
  const categories = await db.category.findMany({ select: { id: true, name: true, synonyms: true } });

  const landmarkTerms = new Set(landmarks.flatMap((l) => [l.name, ...l.synonyms]).map((x) => normalizeText(x)));
  const categoryTerms = new Map<string, string>();
  for (const c of categories) for (const t of [c.name, ...c.synonyms]) categoryTerms.set(normalizeText(t), c.id);

  const phraseOwners = new Map<string, Set<string>>();
  for (const l of listings) {
    for (const s of l.jargonSynonyms) {
      const k = normalizeText(s);
      if (!phraseOwners.has(k)) phraseOwners.set(k, new Set());
      phraseOwners.get(k)!.add(l.categoryId);
    }
  }

  const issues: AuditIssue[] = [];
  let phrases = 0;
  const seenCore = new Set<string>();
  for (const l of listings) {
    for (const raw of l.jargonSynonyms) {
      const s = normalizeText(raw);
      if (!s) continue;
      phrases++;
      const base = { listing: l.name, category: l.category?.name || '?', phrase: raw };
      if (s.replace(/\s/g, '').length < 4) issues.push({ ...base, kind: 'short', detail: 'juda qisqa ibora' });
      if (landmarkTerms.has(s)) issues.push({ ...base, kind: 'landmark_only', detail: "faqat manzil nomi — sohani bildirmaydi" });
      const catOwner = categoryTerms.get(s);
      if (catOwner && catOwner !== l.categoryId) issues.push({ ...base, kind: 'other_category', detail: 'boshqa kategoriyaning nomi/sinonimi' });
      if ((phraseOwners.get(s)?.size || 0) > 1) issues.push({ ...base, kind: 'shared_cross_category', detail: `${phraseOwners.get(s)!.size} xil sohada bor` });

      if (!opts.dynamic) continue;
      const core = coreTerm(s);
      if (!core || seenCore.has(core)) continue;
      seenCore.add(core);
      for (const t of NOISE_TEMPLATES) {
        const msg = t.replace('{s}', core);
        const r = await runOnce(cityId, msg);
        if (r) issues.push({ ...base, kind: 'noise_answered', detail: `"${msg}" → ${r.name}` });
      }
      const req = REQUEST_TEMPLATE.replace('{s}', core);
      const r = await runOnce(cityId, req);
      if (r && r.categoryId !== l.categoryId && !landmarkTerms.has(s)) {
        issues.push({ ...base, kind: 'request_wrong_category', detail: `"${req}" → ${r.name} (${r.categoryName})` });
      }
    }
  }
  return { listings: listings.length, phrases, issues };
}

async function runOnce(cityId: string, message: string): Promise<{ name: string; categoryId: string; categoryName: string } | null> {
  const cls = await classifyQuery(message, cityId, undefined, 'mock_key', { noCache: true });
  if (cls.intent === IntentType.NOT_RELEVANT) return null;
  const r = await searchListings({
    cityId,
    categoryName: cls.category,
    landmarkName: cls.landmark,
    rawMessage: message,
    intent: cls.intent,
    name: cls.name,
    requestedBadges: [],
    rentalFilters: null,
    objectType: cls.object_type,
    disableAiVerification: true,
  });
  if (!r) return null;
  return { name: r.listing.name as string, categoryId: r.listing.categoryId as string, categoryName: (r.listing.category?.name as string) || '' };
}

/**
 * Audit topgan xavfli ma'lumotni tozalash (2026-10-02, admin tasdig'i bilan):
 *  1) Manzil SINONIMLARI ichidagi kasb/kategoriya nomlari ("kalonka ustasi",
 *     "kafelchi") — manzil sifatida noto'g'ri moslik beradi;
 *  2) yozuv jargonidagi FAQAT manzildan iborat iboralar ("karzinka",
 *     "eski bozor") — shu joydagi har qanday savolga shu yozuvni chiqaradi.
 * Manzilning O'Z NOMI kasb bo'lsa — faqat hisobotga yoziladi (unga yozuvlar
 * bog'langan, o'chirish/qayta nomlashni admin hal qiladi).
 * Har bir o'zgarish AuditLog'ga eski qiymati bilan yoziladi (qaytarish uchun).
 */
export async function cleanupRiskyTerms(cityId: string, apply: boolean) {
  const categories = await db.category.findMany({ select: { name: true, synonyms: true } });
  const categoryTerms = new Set(categories.flatMap((c) => [c.name, ...c.synonyms]).map((x) => normalizeText(x)).filter(Boolean));
  const landmarks = await db.landmark.findMany({ where: { cityId }, select: { id: true, name: true, synonyms: true } });

  const changes: { kind: string; target: string; removed: string[] }[] = [];
  const professionNamedLandmarks: string[] = [];
  const cleanLandmarkTerms = new Set<string>();

  for (const l of landmarks) {
    if (categoryTerms.has(normalizeText(l.name))) professionNamedLandmarks.push(l.name);
    else cleanLandmarkTerms.add(normalizeText(l.name));
    const removed = l.synonyms.filter((s) => categoryTerms.has(normalizeText(s)));
    const kept = l.synonyms.filter((s) => !categoryTerms.has(normalizeText(s)));
    kept.forEach((s) => cleanLandmarkTerms.add(normalizeText(s)));
    if (removed.length === 0) continue;
    changes.push({ kind: 'landmark_synonym', target: l.name, removed });
    if (apply) {
      await db.landmark.update({ where: { id: l.id }, data: { synonyms: kept } });
      await db.auditLog.create({ data: { cityId, action: 'CLEANUP_LANDMARK_SYNONYMS', details: { landmarkId: l.id, name: l.name, before: l.synonyms, removed } } });
    }
  }

  const listings = await db.listing.findMany({ where: { cityId }, select: { id: true, name: true, jargonSynonyms: true } });
  for (const l of listings) {
    const removed = l.jargonSynonyms.filter((s) => cleanLandmarkTerms.has(normalizeText(s)));
    if (removed.length === 0) continue;
    changes.push({ kind: 'listing_jargon', target: l.name, removed });
    if (apply) {
      await db.listing.update({ where: { id: l.id }, data: { jargonSynonyms: l.jargonSynonyms.filter((s) => !removed.includes(s)) } });
      await db.auditLog.create({ data: { cityId, action: 'CLEANUP_LISTING_JARGON', details: { listingId: l.id, name: l.name, before: l.jargonSynonyms, removed } } });
    }
  }
  return { applied: apply, changes, professionNamedLandmarks };
}
