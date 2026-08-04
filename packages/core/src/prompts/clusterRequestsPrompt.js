"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLUSTER_REQUESTS_PROMPT = void 0;
const commonRules_1 = require("./commonRules");
exports.CLUSTER_REQUESTS_PROMPT = `
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

${commonRules_1.COMMON_AI_RULES}
`;
//# sourceMappingURL=clusterRequestsPrompt.js.map