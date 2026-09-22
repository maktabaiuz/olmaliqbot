/**
 * appSettings.ts
 *
 * Admin panelidan o'zgartiriladigan, kodga qattiq yozilmagan sozlamalar
 * (masalan "Kanal/Guruhga o'tish" tugmasi havolasi). Har xabarda bazaga
 * murojaat qilmaslik uchun qisqa muddatli xotirada keshlanadi — admin
 * qiymatni o'zgartirsa, keyingi 60 soniya ichida botga ham qo'llanadi.
 */

import { db } from '@kimbor/db';
import { getCoreEmergencyNumbers } from '@kimbor/core';

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { value: string; expiresAt: number }>();

export async function getAppSetting(key: string): Promise<string> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const row = await db.appSetting.findUnique({ where: { key } });
    const value = row?.value || '';
    cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  } catch (err) {
    console.error(`Failed to read app setting "${key}":`, err);
    // Xato bo'lsa ham eski keshlangan qiymat bo'lsa shuni qaytaramiz,
    // aks holda bo'sh (tugma shunchaki ko'rsatilmaydi, bot yiqilmaydi).
    return cached?.value || '';
  }
}

/** Guruh/kanal havolasi tugmasi uchun qulay yordamchi. */
export async function getCommunityUrl(): Promise<string> {
  return getAppSetting('community_url');
}

/** Guruh/kanal havolasi tugmasining ko'rinadigan matni (admin o'zgartira oladi). */
export async function getCommunityLabel(): Promise<string> {
  const label = await getAppSetting('community_label');
  return label || '📣 Kanal/Guruhga o\'tish';
}

/**
 * Favqulodda xabarlarida ko'rsatiladigan MAHALLIY xizmat raqamlari —
 * admin panelidan (Yana > Mahalliy raqamlar) sozlanadi. Milliy raqamlar
 * (101, 102, 103, 104, 112) shablon matniga qattiq yozilgan — o'zgarmaydi,
 * chunki ular butun O'zbekiston bo'yicha bir xil. Bu yerdagilar esa
 * SHAHARGA XOS (gaz idorasi, suv ta'minoti va h.k.), shu sabab admin
 * tomonidan kiritilishi kerak.
 *
 * MUHIM (2026-09, ikkinchi bosqich): avval bu 5 ta raqam AppSetting'da
 * (alohida, jargon so'zsiz) saqlanardi. Endi ular EmergencyNumber
 * jadvaliga (packages/core/src/emergency/localDispatcher.ts,
 * CORE_EMERGENCY_KEYS) ko'chirildi — shu bilan ularga ham jargon so'z
 * qo'shib bo'ladi va bitta yagona manba (bir joyda) qoladi.
 */
export async function getEmergencyLocalNumbers(cityId: string): Promise<{
  mahalliy_gaz?: string;
  mahalliy_suv?: string;
  mahalliy_elektr?: string;
  mahalliy_issiqlik?: string;
  mahalliy_hokimiyat?: string;
}> {
  return getCoreEmergencyNumbers(cityId);
}
