import { isSelfOffer, isJobVacancy, isUtilityStatusQuestion, extractRequestedBadges, extractRentalFilters } from '@kimbor/core';
import { IntentType, type ClassifierResult } from '@kimbor/types';

/**
 * Guruh va shaxsiy chat uchun YAGONA qidiruv parametrlari (2026-10-02).
 *
 * Avval ikkala handler parametrlarni o'zi yig'ardi va bir xil savolga turli
 * javob chiqishi mumkin edi (shaxsiy chat kategoriyani qo'shimcha lug'atdan
 * olardi, ish e'loni/kommunal savol filtrlari yo'q edi). Endi manzil,
 * kategoriya va filtrlar shu bitta funksiyadan keladi — natija bir xil.
 */
export function buildSearchParams(cityId: string, messageText: string, classification: ClassifierResult) {
  const isSeeking = classification.intent !== IntentType.NOT_RELEVANT;
  return {
    cityId,
    categoryName: isSeeking ? classification.category : null,
    landmarkName: isSeeking ? classification.landmark : null,
    rawMessage: messageText,
    intent: classification.intent,
    name: isSeeking ? classification.name : null,
    objectType: isSeeking ? classification.object_type : null,
    requestedBadges: extractRequestedBadges(messageText),
    rentalFilters: extractRentalFilters(messageText),
  };
}

/** Kartochka yuborilmasligi kerak bo'lgan xabarlar: ish e'loni, kommunal
 * holat savoli. (O'z-taklifi alohida — shaxsiy chatda unga "qo'shamizmi?"
 * deb javob beriladi.) */
export function isNonSearchMessage(messageText: string): boolean {
  return isJobVacancy(messageText) || isUtilityStatusQuestion(messageText);
}

export { isSelfOffer };
