"use strict";
// Transliteration module: Uzbek Latin <-> Uzbek Cyrillic <-> Russian mapping
Object.defineProperty(exports, "__esModule", { value: true });
exports.cyrillicToLatin = cyrillicToLatin;
exports.normalizeText = normalizeText;
exports.indexThreeScripts = indexThreeScripts;
const CYRL_TO_LATIN_MAP = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'j',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'x', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': "'", 'ы': 'i', 'ь': '', 'э': 'e', 'ю': 'yu',
    'я': 'ya', 'ў': "o'", 'қ': 'q', 'ғ': "g'", 'ҳ': 'h',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'J',
    'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O',
    'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'X', 'Ц': 'Ts',
    'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ъ': "'", 'Ы': 'I', 'Ь': '', 'Э': 'E', 'Ю': 'Yu',
    'Я': 'Ya', 'Ў': "O'", 'Қ': 'Q', 'Ғ': "G'", 'Ҳ': 'H'
};
/**
 * Converts Uzbek Cyrillic text to normalized Uzbek Latin text.
 */
function cyrillicToLatin(text) {
    if (!text)
        return '';
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        result += CYRL_TO_LATIN_MAP[char] !== undefined ? CYRL_TO_LATIN_MAP[char] : char;
    }
    return result;
}
/**
 * Normalizes Uzbek/Russian input text into lowercase Latin representation for matching.
 */
function normalizeText(text) {
    if (!text)
        return '';
    const latinized = cyrillicToLatin(text.trim().toLowerCase());
    return latinized
        .replace(/[`’'‘ʼ]/g, "'")
        .replace(/\s+/g, ' ');
}
/**
 * Generates 3-script index forms: Latin, Cyrillic, and normalized text.
 */
function indexThreeScripts(text) {
    const normalized = normalizeText(text);
    return {
        latin: normalized,
        cyrillic: text.toLowerCase(),
        normalized
    };
}
//# sourceMappingURL=index.js.map