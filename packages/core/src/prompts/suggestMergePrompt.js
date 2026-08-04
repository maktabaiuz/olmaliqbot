"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUGGEST_MERGE_PROMPT = void 0;
const commonRules_1 = require("./commonRules");
exports.SUGGEST_MERGE_PROMPT = `
Decide whether a new category should be merged into an existing one.

INPUT: {new_category, existing: [{id, name, synonyms[], record_count}]}
OUTPUT: {"action":"merge"|"create", "merge_into": <id>|null,
         "reason": "<one short sentence in Uzbek>", "confidence": 0.0-1.0}

Lean toward merging. Too many near-identical categories break search,
and a wrong merge is easy for the admin to undo.

But never merge genuinely different trades just because the words look similar.

EXAMPLE
new "kalonka master", existing includes "gazavik"
{"action":"merge","merge_into":3,
 "reason":"Kolonka ustasi — gazavikning bir turi","confidence":0.85}

${commonRules_1.COMMON_AI_RULES}
`;
//# sourceMappingURL=suggestMergePrompt.js.map