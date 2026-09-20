import crypto from 'crypto';
import { db } from '@kimbor/db';

/**
 * Salted Password Hashing using PBKDF2 (SHA512, 10,000 iterations)
 */
export function hashPassword(password: string): string {
  const salt = process.env.PASSWORD_SALT || 'kimbor_hyperlocal_secure_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

// MUHIM (2026-09, professional audit orqali topilgan xato): avval bu yerda
// "if (hash === password) return true" degan zaxira qator bor edi — u
// "legacy plain hashes during migration" (eski, xeshlanmagan parollar
// uchun) deb izohlangan edi. Tekshirilganda bu FAQAT nazariy emasligi
// aniqlandi: production bazasida 2 ta HAQIQIY hisob (1 SUPER_ADMIN, 1
// CITY_ADMIN) parolini AYNAN OCHIQ MATNDA saqlab kelayotgan edi — agar
// baza qandaydir yo'l bilan sizib chiqsa (masalan zaxira nusxa orqali),
// bu ikkala parol darhol o'qilishi mumkin edi. Ikkala hisob ham to'g'ri
// PBKDF2 xeshga o'tkazildi (bir martalik migratsiya skripti orqali),
// shundan keyingina bu zaxira qator xavfsiz olib tashlandi.
export function verifyPassword(password: string, hash: string): boolean {
  if (!password || !hash) return false;
  return hashPassword(password) === hash;
}

/**
 * Verify Telegram WebApp initData HMAC-SHA256 signature
 */
export function verifyTelegramInitData(initDataStr: string): { isValid: boolean; telegramId?: bigint; userRaw?: any } {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken || !initDataStr) return { isValid: false };

  try {
    const urlParams = new URLSearchParams(initDataStr);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    const paramsArray = Array.from(urlParams.entries());
    paramsArray.sort((a, b) => a[0].localeCompare(b[0]));
    const dataCheckString = paramsArray.map(([k, v]) => `${k}=${v}`).join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (calculatedHash !== hash) {
      return { isValid: false };
    }

    const userParam = urlParams.get('user');
    if (!userParam) return { isValid: false };
    const tgUser = JSON.parse(userParam);
    return { isValid: true, telegramId: BigInt(tgUser.id), userRaw: tgUser };
  } catch (err) {
    return { isValid: false };
  }
}

/**
 * Resolve and Authenticate User from Request securely.
 * Rejects header spoofing or default fallback IDs.
 */
export async function authenticateRequest(req: any): Promise<{ user: any; error?: { status: number; body: any } }> {
  if (req.user) {
    return { user: req.user };
  }

  const initDataHeader = req.headers['x-init-data'] || req.headers['initdata'] || req.body?.initData;
  if (!initDataHeader) {
    return {
      user: null,
      error: { status: 401, body: { success: false, accessDenied: true, message: 'Autentifikatsiya ma\'lumotlari (initData) talab qilinadi 🔒' } },
    };
  }

  const { isValid, telegramId } = verifyTelegramInitData(initDataHeader as string);
  if (!isValid || !telegramId) {
    return {
      user: null,
      error: { status: 401, body: { success: false, accessDenied: true, message: 'Telegram imzo (HMAC) xatosi! Kirish rad etildi 🔒' } },
    };
  }

  const dbUser = await db.user.findUnique({
    where: { telegramId },
    include: { city: true },
  });

  if (!dbUser) {
    return {
      user: null,
      error: { status: 403, body: { success: false, accessDenied: true, message: 'Foydalanuvchi tizimda ro\'yxatdan o\'tmagan 🔒' } },
    };
  }

  if (dbUser.isSuspended) {
    return {
      user: null,
      error: { status: 403, body: { success: false, accessDenied: true, message: 'Hisobingiz to\'xtatilgan yoki o\'chirilgan 🔒' } },
    };
  }

  req.user = dbUser;
  return { user: dbUser };
}
