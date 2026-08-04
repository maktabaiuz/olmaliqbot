import { COMMON_AI_RULES } from './commonRules';

export const CLUSTER_REQUESTS_PROMPT = `
Group unanswered requests that mean the same thing.

INPUT: array of {id, raw_text, category, landmark, count}
OUTPUT: array of {canonical: string, member_ids: number[], total: number}

RULES
- Group by meaning, not by spelling.
  "kafelchi", "kafel ustasi", "plitkachi", "kafel yotqizuvchi" are one group.
- The canonical name is the clearest, most common Uzbek Latin form.
- Different trades stay separate even when related.
  Do not merge "santexnik" with "gazavik".
- If unsure, leave it alone. Wrong merges hide real demand from the admin.

${COMMON_AI_RULES}
`;
