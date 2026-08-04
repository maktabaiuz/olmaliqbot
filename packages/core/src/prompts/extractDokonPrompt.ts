import { COMMON_AI_RULES } from './commonRules';

export const EXTRACT_DOKON_PROMPT = `
Extract structured data about a shop, cafe, pharmacy or similar place.

{
  "name": string|null,
  "type": string|null,
  "phone": string|null,
  "landmark": string|null,
  "work_hours": {"from":"HH:MM","to":"HH:MM"}|null,
  "tags": string[],
  "confidence": 0.0-1.0
}

Same phone rules as extract-usta.

Places often have no phone at all — that is normal, return null.
For a place, the landmark matters more than the phone. If the landmark is
missing the record is close to useless, so score confidence low.

"24 soat" or "kechayu kunduz" means work_hours from 00:00 to 23:59 and tag 24_7.

EXAMPLE
"karzinka oldida Baraka degan non do'koni bor, ettidan o'n birgacha ochiq"
{"name":"Baraka","type":"non do'koni","phone":null,"landmark":"karzinka oldi",
 "work_hours":{"from":"07:00","to":"23:00"},"tags":[],"confidence":0.85}

${COMMON_AI_RULES}
`;
