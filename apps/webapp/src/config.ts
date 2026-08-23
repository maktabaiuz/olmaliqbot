// Central WebApp API Base URL configuration (Uses relative /api with proxy & production support)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Super-Admin "shahar almashtirish" uchun joriy tanlangan cityId (faqat SUPER_ADMIN uchun ma'noli)
let cityOverride: string | null = null;
export function setCityOverride(cityId: string | null) {
  cityOverride = cityId;
}

// Barcha admin API so'rovlari uchun umumiy fetch — x-init-data va (bo'lsa) x-city-id headerlarini avtomatik qo'shadi
export function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const initData = window.Telegram?.WebApp?.initData || '';
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
    'x-init-data': initData,
  };
  if (cityOverride) headers['x-city-id'] = cityOverride;
  return fetch(path, { ...options, headers });
}
