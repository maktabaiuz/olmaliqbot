"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXTRACT_MUASSASA_PROMPT = void 0;
const commonRules_1 = require("./commonRules");
exports.EXTRACT_MUASSASA_PROMPT = `
Extract data about a government office, bank, clinic, or transport route.

MUASSASA
{"name": string|null, "type": string|null, "landmark": string|null, "reception_hours": string|null, "phone": string|null, "documents_needed": string[], "confidence": 0.0-1.0}

TRANSPORT
{"route": string|null, "type": string|null, "first_run": string|null, "last_run": string|null, "price_note": string|null, "stops": string[], "confidence": 0.0-1.0}

For institutions, reception hours matter more than a phone number —
people go there in person.

For transport, the last run time is the single most asked-about detail.

${commonRules_1.COMMON_AI_RULES}
`;
//# sourceMappingURL=extractMuassasaPrompt.js.map