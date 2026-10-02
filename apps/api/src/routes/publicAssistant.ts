import { FastifyInstance } from 'fastify';
import { db } from '@kimbor/db';
import { classifyQuery, searchListings, buildSearchParams, sanitizeAiLandmarkName, isNonSearchMessage } from '@kimbor/core';
import { IntentType } from '@kimbor/types';
import { getPublicCityId, PUBLIC_LISTING_SELECT, toPublicCard } from './publicSupport';

/**
 * Ilova ichidagi "AI yordamchi" (2026-10). "Jim turish" tamoyili: javob
 * FAQAT bazadagi ishonchli natijadan — AI o'zidan ma'lumot to'qimaydi.
 * Qidiruv bot bilan bir xil pipeline (klassifikator + AI tekshiruv).
 */
const GREETING = /^(salom|assalom|assalomu|hello|privet|qalay|qalaysiz|rahmat|raxmat)\b/i;

// AI byudjetini himoya qilish: bitta foydalanuvchiga soatiga 30 ta savol
// (qidiruvdagi kabi har savol Gemini chaqiradi).
const HOURLY_LIMIT = 30;
const usage = new Map<string, { count: number; resetAt: number }>();
function overLimit(userKey: string): boolean {
  const now = Date.now();
  const u = usage.get(userKey);
  if (!u || u.resetAt < now) {
    usage.set(userKey, { count: 1, resetAt: now + 3600_000 });
    return false;
  }
  u.count++;
  return u.count > HOURLY_LIMIT;
}

export function registerAssistant(fastify: FastifyInstance) {
  fastify.post('/public/assistant', async (req: any, reply) => {
    const text = String(req.body?.message || '').trim().slice(0, 300);
    if (!text) return reply.code(400).send({ success: false });
    if (overLimit(req.publicUser.telegramId.toString())) {
      return reply.code(429).send({ success: false, message: "Juda ko'p savol. Birozdan keyin urinib ko'ring." });
    }
    const cityId = await getPublicCityId();

    if (GREETING.test(text) && text.split(/\s+/).length <= 3) {
      return {
        success: true,
        reply: "Assalomu alaykum! 😊 Kim kerakligini yozing — masalan \"Karzinka yonida gazavik\" yoki \"kechasi ishlaydigan dorixona\". Bazadan ishonchli raqam topib beraman.",
        items: [],
      };
    }

    const cls = await classifyQuery(text, cityId, req.publicUser.telegramId);
    cls.landmark = sanitizeAiLandmarkName(cls.landmark);
    if (cls.intent === IntentType.EMERGENCY) {
      return { success: true, reply: "🚨 Bu favqulodda holatga o'xshaydi. Darhol 112 ga qo'ng'iroq qiling yoki SOS bo'limini oching.", items: [], emergency: true };
    }
    if (cls.intent === IntentType.NOT_RELEVANT || isNonSearchMessage(text)) {
      return {
        success: true,
        reply: "Men faqat Olmaliqdagi ustalar, do'konlar, idoralar, transport va arenda bo'yicha yordam beraman. Kim kerakligini yozing 🙂",
        items: [],
      };
    }

    const result = await searchListings(buildSearchParams(cityId, text, cls));
    if (!result) {
      return {
        success: true,
        reply:
          `Hozircha bazada ishonchli ma'lumot topmadim${cls.category ? ` (${cls.category})` : ''}. Taxmin qilib noto'g'ri raqam bermayman. ` +
          "Agar shunday odamni bilsangiz — \"Ma'lumot qo'shish\" orqali yuboring, tekshirib qo'shamiz 🙏",
        items: [],
        canAdd: true,
      };
    }
    const ids = [result.listingId, ...result.otherMatches.map((m) => m.listingId)].slice(0, 3);
    const rows = await db.listing.findMany({ where: { id: { in: ids } }, select: PUBLIC_LISTING_SELECT });
    const byId = new Map(rows.map((r) => [r.id, toPublicCard(r)]));
    const items = ids.map((id) => byId.get(id)).filter(Boolean);
    return {
      success: true,
      reply: items.length > 1 ? `Topdim! Bazadagi ishonchli variantlar 👇` : `Topdim! Mana bazadagi ishonchli variant 👇`,
      items,
    };
  });
}
