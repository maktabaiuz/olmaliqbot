import { Api, InlineKeyboard } from 'grammy';
import { db } from '@kimbor/db';
import { redisConnection } from '../queue/deleteQueue';

/**
 * Majburiy obuna (2026-10). Admin panelda kiritilgan kanal/guruhlar
 * ro'yxati 60 soniya, foydalanuvchining "obuna bo'lgan" holati 10 daqiqa
 * keshlanadi — har xabarda Telegram'ga qayta-qayta so'rov yuborilmasligi
 * uchun.
 *
 * Xato bo'lsa (bot kanalda admin emas, kanal o'chirilgan, chatId noto'g'ri)
 * o'sha kanal "obuna bo'lgan" deb hisoblanadi: sozlashdagi xato tufayli
 * barcha foydalanuvchilarning botdan foydalanishi to'xtab qolmasligi kerak.
 * Muammoli kanal admin panelda "Bot admin emas" deb ko'rinadi.
 */

interface ChannelRow {
  id: string;
  title: string;
  url: string;
  chatId: string | null;
}

let channelsCache: { rows: ChannelRow[]; expiresAt: number } | null = null;
const OK_TTL_SECONDS = 600;

async function getEnabledChannels(): Promise<ChannelRow[]> {
  if (channelsCache && channelsCache.expiresAt > Date.now()) return channelsCache.rows;
  const rows = await db.requiredChannel.findMany({
    where: { isEnabled: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, title: true, url: true, chatId: true },
  });
  channelsCache = { rows, expiresAt: Date.now() + 60_000 };
  return rows;
}

/** "https://t.me/kanal" -> "@kanal". Yopiq (+invite) havoladan chatId chiqarib bo'lmaydi. */
export function deriveChatIdFromUrl(url: string): string | null {
  const m = url.trim().match(/^(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([A-Za-z0-9_]{4,})\/?$/);
  return m ? `@${m[1]}` : null;
}

const MEMBER_STATUSES = new Set(['creator', 'administrator', 'member', 'restricted']);

/** Foydalanuvchi hali obuna bo'lmagan kanallar (bo'sh ro'yxat = hammasi joyida). */
export async function getMissingChannels(api: Api, userId: number): Promise<ChannelRow[]> {
  const channels = await getEnabledChannels();
  if (channels.length === 0) return [];

  const okKey = `kimbor:sub_ok:${userId}`;
  try {
    if (await redisConnection.get(okKey)) return [];
  } catch {
    // Redis vaqtincha ishlamasa — shunchaki har safar tekshiramiz.
  }

  const missing: ChannelRow[] = [];
  for (const ch of channels) {
    const chatId = ch.chatId || deriveChatIdFromUrl(ch.url);
    if (!chatId) continue;
    try {
      const member = await api.getChatMember(chatId, userId);
      const isMember =
        MEMBER_STATUSES.has(member.status) && !(member.status === 'restricted' && !(member as any).is_member);
      if (!isMember) missing.push(ch);
    } catch (err) {
      // MUHIM (2026-10-01, real xato — admin bot'ni kanalga admin qilib
      // qo'shgandan keyin ham "obuna bo'ling" gate'i hech kimga chiqmagan):
      // Telegram GURUHlar uchun hech qachon a'zo bo'lmagan odamni
      // so'ralganda oddiy status="left" qaytaradi, lekin KANALlar uchun
      // BUTUNLAY BOSHQACHA ishlaydi — aniq XATO qaytaradi
      // ("PARTICIPANT_ID_INVALID"). Bu xato avval "bot sozlamasi noto'g'ri,
      // bu kanalni o'tkazib yuboramiz" deb (fail-open) talqin qilingan edi —
      // natijada aynan "bu odam obuna emas" degan signalning O'ZI
      // yo'q qilib yuborilardi, va gate HECH QACHON ishlamasdi. Endi ikki
      // xato turi ANIQ ajratiladi: "bu foydalanuvchi topilmadi/a'zo emas"
      // (aniq, kutilgan holat — demak obuna emas) va "bot huquqi yo'q/kanal
      // topilmadi" (haqiqiy sozlama xatosi — shundagina o'tkazib yuboramiz).
      const desc = String((err as any)?.description || (err as Error).message || '');
      if (/PARTICIPANT_ID_INVALID|USER_NOT_PARTICIPANT|user not found|chat not found/i.test(desc)) {
        missing.push(ch);
      } else {
        console.warn(`⚠️ Obuna tekshiruvi ishlamadi (${chatId}):`, desc);
      }
    }
  }

  if (missing.length === 0) {
    redisConnection.set(okKey, '1', 'EX', OK_TTL_SECONDS).catch(() => {});
  }
  return missing;
}

export function buildSubscriptionGate(missing: ChannelRow[]) {
  const keyboard = new InlineKeyboard();
  for (const ch of missing) keyboard.url(`📢 ${ch.title}`, ch.url).row();
  keyboard.text("✅ Obuna bo'ldim", 'sub_check');
  const text =
    `<b>Assalomu alaykum! 👋</b>\n\n` +
    `Botdan foydalanish uchun quyidagi ${missing.length > 1 ? 'kanallarga' : 'kanalga'} obuna bo'ling, ` +
    `so'ng <b>"✅ Obuna bo'ldim"</b> tugmasini bosing.`;
  return { text, keyboard };
}
