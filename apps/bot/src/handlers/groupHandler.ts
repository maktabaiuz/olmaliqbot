import { Context } from 'grammy';
import { zeroLayerFilter } from '../filter/zeroLayerFilter';
import { classifyQuery } from '../filter/aiClassifier';

export async function handleGroupMessage(ctx: Context, cityId: string) {
  const messageText = ctx.message?.text;
  if (!messageText) return;

  // 1. 0-qavat: Free Regex & Keyword Filter
  const passedZeroLayer = zeroLayerFilter(messageText);
  if (!passedZeroLayer) {
    // 90% non-search group chatter ignored silently here
    return;
  }

  const telegramUserId = ctx.from?.id ? BigInt(ctx.from.id) : BigInt(0);

  // 2. 1-qavat: AI Classifier
  const classification = await classifyQuery(messageText, cityId, telegramUserId);

  // Bot logs understood message to console (No response sent in Phase 2)
  console.log(`🤖 [Bot Classifier Log] City: ${cityId} | User: ${telegramUserId} | Intent: ${classification.intent} | Category: ${classification.category} | Landmark: ${classification.landmark} | Confidence: ${classification.confidence}`);

  // Strict Rule: confidence < 0.7 => bot stays silent
  if (classification.confidence < 0.7 || classification.intent === 'NOT_RELEVANT') {
    return;
  }
}
