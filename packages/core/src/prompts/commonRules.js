"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMON_AI_RULES = void 0;
exports.COMMON_AI_RULES = `
- Return only the requested JSON. No markdown fences, no commentary.
- Never invent a phone number, name, or address. null is always acceptable.
- When two readings are possible, return the lower confidence, not the more helpful one.
- Emergency classification always wins over any other interpretation.
- You never see or handle data from more than one city at a time.
`;
//# sourceMappingURL=commonRules.js.map