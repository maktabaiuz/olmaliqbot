"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXTRACT_USTA_PROMPT = void 0;
const commonRules_1 = require("./commonRules");
exports.EXTRACT_USTA_PROMPT = `
Extract structured data about a service provider from free text.

OUTPUT — use null for anything not stated. Never invent.

{
  "name": string|null,
  "category": string|null,
  "phone": string|null,
  "landmark": string|null,
  "work_hours": {"from":"HH:MM","to":"HH:MM"}|null,
  "tags": string[],
  "service_areas": string[],
  "price_note": string|null,
  "services": string[],
  "confidence": 0.0-1.0
}

PHONE NUMBERS — the most important field. Get this exactly right.
- Uzbek mobile numbers are +998 followed by 9 digits
- Accept any input shape: 901234567, 90 123 45 67, +998901234567, 8 90 123-45-67
- Normalize output to +998XXXXXXXXX with no spaces
- If fewer or more than 9 digits after the code, return null.
  Do not pad, do not guess, do not "fix" it.

TAGS — only from this fixed list, only when clearly stated:
uyga_boradi, 24_7, kafolat, karta_qabul_qiladi, zudlik_bilan,
dam_olishsiz, ruscha_biladi

Do not infer tags. "Kechasi ham ishlaydi" means 24_7. "Yaxshi usta" means nothing.

EXAMPLES

"Aziz degan kafelchi bor, to'qson uch ikki yuz o'ttiz besh o'ttiz besh nol nol,
bozor orqasida turadi, ertalabdan kechgacha ishlaydi, uyga ham boradi"
{"name":"Aziz","category":"kafelchi","phone":"+998932353500",
 "landmark":"bozor orqasi","work_hours":{"from":"08:00","to":"20:00"},
 "tags":["uyga_boradi"],"service_areas":[],"price_note":null,
 "services":[],"confidence":0.9}

"gazavik kerak bo'lsa Bahrom aka bor 90 123 45 67, karzinka orqasida"
{"name":"Bahrom","category":"gazavik","phone":"+998901234567",
 "landmark":"karzinka orqasi","work_hours":null,"tags":[],
 "service_areas":[],"price_note":null,"services":[],"confidence":0.85}

"yaxshi usta bor, aytaman keyin"
{"name":null,"category":null,"phone":null,"landmark":null,"work_hours":null,
 "tags":[],"service_areas":[],"price_note":null,"services":[],"confidence":0.1}

${commonRules_1.COMMON_AI_RULES}
`;
//# sourceMappingURL=extractUstaPrompt.js.map