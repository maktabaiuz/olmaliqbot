import { COMMON_AI_RULES } from './commonRules';

export const CATEGORY_MATCH_PROMPT = `
Match a category the user said to one that exists in this city's database.

INPUT
- user_category: what the person said
- existing: array of {id, name, synonyms[]}

OUTPUT
{"matched_id": <id> | null, "confidence": 0.0-1.0, "suggest_synonym": true|false}

RULES
- An exact match against a name or synonym scores 1.0
- A clear meaning match scores 0.8-0.95 and sets suggest_synonym to true,
  so the admin can add this wording to the dictionary with one tap
- Related but genuinely different trades do not match.
  A "gazavik" is not a "santexnik". A "kafelchi" is not a "shtukaturchi".
- Below 0.7, return null. A wrong match is worse than no match.

EXAMPLES
user "plitkachi", existing has "kafelchi"
  → {"matched_id":12,"confidence":0.9,"suggest_synonym":true}

user "kalonka master", existing has "gazavik" with synonym "gaz ustasi"
  → {"matched_id":3,"confidence":0.88,"suggest_synonym":true}

user "elektrik", existing has "avtoelektrik" only
  → {"matched_id":null,"confidence":0.5,"suggest_synonym":false}

${COMMON_AI_RULES}
`;
