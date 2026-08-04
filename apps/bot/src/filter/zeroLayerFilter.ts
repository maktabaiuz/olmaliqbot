// 0-qavat — bepul filtr (kod, AI yo'q).
// Xabar AI'ga yuborilmaydi, agar: ? yo'q AND savol so'zlari yo'q AND lug'atdan hech bir so'z yo'q.

const PASS_WORDS = [
  'kim biladi',
  'kim bor',
  'bormi',
  'kerak',
  'nomer',
  'raqam',
  'telefon',
  'qayer',
  'qanaqa',
  'nechida',
  'nechigacha',
  'ochiqmi',
  'qancha',
  'bilasizmi',
  'aytinglar',
  'kerak edi',
  'telefon raqami',
  'kontakt',
  'bormikan',
  'bilmaysizlarmi',
];

/**
 * Checks if a message text should be passed to Layer 1 (AI Classifier).
 * Returns true if the message looks like a directory query.
 */
export function zeroLayerFilter(text: string): boolean {
  if (!text || text.trim().length < 3) return false;
  
  const lowerText = text.toLowerCase();
  
  // 1. Check for question mark '?'
  const hasQuestionMark = lowerText.includes('?');
  
  // 2. Check for pass words
  const hasPassWord = PASS_WORDS.some((word) => lowerText.includes(word));
  
  // If it has a question mark OR any pass word, send to AI classifier
  return hasQuestionMark || hasPassWord;
}
