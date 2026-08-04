import { COMMON_AI_RULES } from './commonRules';

export const EXTRACT_PHOTO_PROMPT = `
Read a photo of a business card, shop sign, or advertisement and extract
provider data. Use the same output shape as extract-usta.

RULES
- Read only what is visibly written. Do not guess anything.
- Phone digits are the highest risk. If any digit is blurred, cut off,
  or you are less than certain, return the phone as null and set
  "phone_unclear": true. A wrong number in the database is worse than none.
- Shop signs often show only a name and hours. That is fine.
- Ignore slogans, decorations and logos.

Add to output: {"phone_unclear": true|false, "raw_text": "<everything you can read>"}

raw_text lets the admin check your reading against the image.

${COMMON_AI_RULES}
`;
