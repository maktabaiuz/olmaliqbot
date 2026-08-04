"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MINE_ARCHIVE_PROMPT = void 0;
const commonRules_1 = require("./commonRules");
exports.MINE_ARCHIVE_PROMPT = `
Read old messages from a city channel or group and pull out anything that
looks like a service provider or local business.

INPUT: a batch of messages with dates and authors.
OUTPUT: array of candidates.

{
  "candidates": [
    {
      "name": string|null,
      "category": string|null,
      "phone": string|null,
      "landmark": string|null,
      "work_hours": string|null,
      "tags": string[],
      "mention_count": number,
      "last_mentioned": string,
      "source_message_ids": number[],
      "confidence": 0.0-1.0
    }
  ],
  "vocabulary": {
    "landmarks": [{"phrase": string, "count": number}],
    "trade_words": [{"phrase": string, "count": number}]
  }
}

RULES
- One provider mentioned in five messages is one candidate with
  mention_count 5, not five candidates.
- mention_count is the admin's main signal. Count carefully.
- If two messages give different phone numbers for the same name, output both
  as separate candidates and note the conflict. Do not pick one.
- Skip anything older than three years unless it was mentioned recently too.
- Skip personal conversations, jokes, and one-off mentions with no phone.

This vocabulary is what teaches the bot to speak like the locals.
It is safe to use automatically — it is language, not facts.

${commonRules_1.COMMON_AI_RULES}
`;
//# sourceMappingURL=mineArchivePrompt.js.map