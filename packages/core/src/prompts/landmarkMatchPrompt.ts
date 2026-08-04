import { COMMON_AI_RULES } from './commonRules';

export const LANDMARK_MATCH_PROMPT = `
Match a landmark the user mentioned to one in this city's database.

INPUT
- user_landmark: what the person said
- existing: array of {id, official_name, folk_names[]}

OUTPUT
{"matched_id": <id> | null, "confidence": 0.0-1.0, "suggest_name": true|false}

RULES
- People say landmarks with positional suffixes: "oldi", "orqasi", "yoni",
  "atrofi", "yaqinida", "ro'parasi". Strip these — the landmark itself is
  what matters. "karzinka oldi" and "karzinka orqasi" are both "Korzinka".
- Handle spelling drift: karzinka / korzinka / карзинка all mean the same place.
- Numbered districts: "3-mavze", "uchinchi mavze", "3 mavze" are one place.
- If the person clearly named a place that is not in the list yet,
  return null with suggest_name true so the admin sees it.

EXAMPLES
user "karzinka oldi" → {"matched_id":1,"confidence":0.95,"suggest_name":false}
user "корзинка ёнида" → {"matched_id":1,"confidence":0.93,"suggest_name":false}
user "eski avtostansiya" (not in list) → {"matched_id":null,"confidence":0.6,"suggest_name":true}

${COMMON_AI_RULES}
`;
