/**
 * listingReply.ts
 *
 * Bitta yozuv kartasini (matn, kerak bo'lsa rasmlari bilan) va uning
 * tugmalarini ("Yana ko'rish"/yashil, kanal/qizil) quradigan hamda
 * yuboradigan umumiy yordamchi. Guruh javobi, DM javobi, VA "Yana
 * ko'rish" bosilganda navbatdagi yozuvni alohida post qilib yuborish —
 * uchalasi ham AYNAN BIR XIL mantiqqa muhtoj, shuning uchun bitta joyda.
 */

import { Context, InlineKeyboard } from 'grammy';
import { buildSlideshowHtml } from '@kimbor/core';
import { scheduleMessageDeletion } from '../queue/deleteQueue';
import { getCommunityUrl, getCommunityLabel } from '../settings/appSettings';

/**
 * "Yana ko'rish" (qolgan mosliklar bo'lsa) va kanal havolasi (sozlangan
 * bo'lsa) tugmalarini quradi — har bir alohida postda BIR XIL tartibda.
 */
export async function buildResultKeyboard(remainingCount: number, listingId: string): Promise<InlineKeyboard> {
  const keyboard = new InlineKeyboard();
  if (remainingCount > 0) {
    keyboard.text(`Yana ${remainingCount} tasini ko'rish`, `more_${listingId}`).success().row();
  }
  const communityUrl = await getCommunityUrl();
  const communityLabel = communityUrl ? await getCommunityLabel() : null;
  if (communityUrl && communityLabel) {
    keyboard.url(communityLabel, communityUrl).danger().row();
  }
  return keyboard;
}

export interface SendListingReplyOptions {
  formattedText: string;
  photoUrls: string[] | null | undefined;
  keyboard: InlineKeyboard;
  /** Guruhda savolga "reply" qilib yuborish uchun — DM'da berilmaydi. */
  replyToMessageId?: number;
  /** Berilsa — xabar 15 daqiqada avtomatik o'chiriladi (guruh xabarlari
   * uchun) va matnga shu haqda eslatma qo'shiladi. DM'da berilmaydi. */
  autoDeleteChatId?: number;
}

/**
 * Bitta yozuv kartasini yuboradi — rasm bo'lsa Rich Message (suriladigan
 * albom + karta matni + tugmalar BITTA postda), bo'lmasa oddiy matn+tugmalar.
 */
export async function sendListingReply(ctx: Context, opts: SendListingReplyOptions): Promise<void> {
  const publicBaseUrl = process.env.WEBAPP_URL || `https://${process.env.DOMAIN || 'olmaliq.online'}`;
  const bodyText = opts.autoDeleteChatId
    ? `${opts.formattedText}\n\n🕐 Bu xabar 15 daqiqada o'chadi`
    : opts.formattedText;
  const slideshowHtml = buildSlideshowHtml(opts.photoUrls, publicBaseUrl);
  const finalKeyboard = opts.keyboard.inline_keyboard.length > 0 ? opts.keyboard : undefined;
  const replyParams = opts.replyToMessageId !== undefined ? { reply_parameters: { message_id: opts.replyToMessageId } } : {};

  let sentMsg;
  if (slideshowHtml) {
    const richHtml = `${slideshowHtml}<br>${bodyText.replace(/\n/g, '<br>')}`;
    sentMsg = await ctx.replyWithRichMessage({ html: richHtml }, { reply_markup: finalKeyboard, ...replyParams });
  } else {
    sentMsg = await ctx.reply(bodyText, { parse_mode: 'HTML', reply_markup: finalKeyboard, ...replyParams });
  }

  if (opts.autoDeleteChatId && sentMsg?.message_id) {
    await scheduleMessageDeletion(opts.autoDeleteChatId, sentMsg.message_id, 15 * 60 * 1000);
  }
}
