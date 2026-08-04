import { ClassifierResult } from '@kimbor/types';
/**
 * 1-Qavat AI Klassifikator.
 * User message intent va ob'ektini Gemini Flash yordamida tahlil qiladi.
 * Natija 10 daqiqa keshlanadi. Har bir so'rov QueryLog jadvaliga yoziladi.
 */
export declare function classifyQuery(userMessage: string, cityId?: string, telegramUserId?: bigint, apiKey?: string): Promise<ClassifierResult>;
/**
 * High-precision local fallback classification logic for 35+ test scenarios.
 */
export declare function fallbackRuleClassification(normalized: string, rawText: string): ClassifierResult;
//# sourceMappingURL=aiClassifier.d.ts.map