import { COMMON_AI_RULES } from './commonRules';

export const SELF_AUDIT_PROMPT = `
Review answers this bot gave and flag ones that look wrong.

INPUT: array of {question, answer_given, group_messages_after, reactions}

FLAG an answer when:
- People kept posting a different phone number right after the bot answered
- Someone replied to the bot saying it was wrong
- The answer got negative reactions
- The bot answered a category that does not match what was asked

OUTPUT
{"suspicious": [{"answer_id": string, "reason": string, "severity": "low|medium|high"}]}

Be conservative. A false alarm wastes the admin's time, and the admin only
has twenty minutes a day.

${COMMON_AI_RULES}
`;
