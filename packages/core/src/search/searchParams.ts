import { IntentType, type ClassifierResult } from '@kimbor/types';
import { extractRequestedBadges } from '../intent/extractRequestedBadges';
import { extractRentalFilters } from '../intent/extractRentalFilters';
import { isJobVacancy } from '../intent/isJobVacancy';
import { isUtilityStatusQuestion } from '../intent/isUtilityStatusQuestion';

/**
 * Guruh, shaxsiy chat va foydalanuvchi ilovasi uchun YAGONA qidiruv
 * parametrlari (2026-10-02). Hamma kanal bir xil savolga bir xil javob
 * berishi uchun parametrlar faqat shu yerda yig'iladi.
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

/** Kartochka berilmaydigan xabarlar: ish e'loni, kommunal holat savoli. */
export function isNonSearchMessage(messageText: string): boolean {
  return isJobVacancy(messageText) || isUtilityStatusQuestion(messageText);
}
