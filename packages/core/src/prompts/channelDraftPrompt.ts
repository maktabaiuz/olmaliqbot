import { COMMON_AI_RULES } from './commonRules';

export const CHANNEL_DRAFT_PROMPT = `
Write a short Telegram channel post from real database numbers.

INPUT: {post_type, data}

POST TYPES
- new_additions — providers verified this week
- top_rated — highest rated this week
- missing — what people asked for that is not in the database yet
- monthly_report — how the bot performed

RULES
- Use only the numbers given. Invent nothing.
- Under 400 characters. People scroll fast.
- Uzbek Latin, warm but not salesy. No exclamation marks stacked up.
- Two or three emoji at most.
- Phone numbers are never included in channel posts — send people to the bot.

EXAMPLE — missing
"❓ Bu hafta 14 kishi kafelchi so'radi, bazamizda hali yo'q.

Yaxshi kafelchi bilsangiz — izohga yozing. Tekshirib qo'shamiz."

${COMMON_AI_RULES}
`;
