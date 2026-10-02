// Telegram WebApp SDK ustidan yupqa qatlam. Telegram tashqarisida (brauzerda)
// ochilsa ham ilova yiqilmaydi — funksiyalar shunchaki hech narsa qilmaydi.

type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'select';

interface TgWebApp {
  initData: string;
  initDataUnsafe: { user?: { id: number; first_name?: string; last_name?: string; username?: string; photo_url?: string }; start_param?: string };
  colorScheme: 'light' | 'dark';
  ready(): void;
  expand(): void;
  openLink(url: string): void;
  openTelegramLink(url: string): void;
  setHeaderColor?(c: string): void;
  setBackgroundColor?(c: string): void;
  disableVerticalSwipes?(): void;
  BackButton: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
  HapticFeedback?: {
    impactOccurred(s: 'light' | 'medium' | 'heavy'): void;
    notificationOccurred(s: 'success' | 'error' | 'warning'): void;
    selectionChanged(): void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

export const tg = (): TgWebApp | undefined => window.Telegram?.WebApp;

export function initTelegram() {
  const w = tg();
  if (!w) return;
  w.ready();
  w.expand();
  w.setHeaderColor?.('#f4fafd');
  w.setBackgroundColor?.('#f4fafd');
  w.disableVerticalSwipes?.();
}

export const initData = () => tg()?.initData || '';
export const tgUser = () => tg()?.initDataUnsafe.user;
export const startParam = () => tg()?.initDataUnsafe.start_param;

export function haptic(kind: HapticKind = 'light') {
  const h = tg()?.HapticFeedback;
  if (!h) return;
  if (kind === 'success' || kind === 'error' || kind === 'warning') h.notificationOccurred(kind);
  else if (kind === 'select') h.selectionChanged();
  else h.impactOccurred(kind);
}

/** t.me havolalari Telegram ichida, qolganlari tashqi brauzerda ochiladi. */
export function openUrl(url: string) {
  const w = tg();
  if (!w) return void window.open(url, '_blank');
  if (/^https?:\/\/t\.me\//.test(url)) w.openTelegramLink(url);
  else w.openLink(url);
}

/** Qo'ng'iroq — tel: havolasi WebView'da ishonchli ochilishi uchun. */
export function callPhone(phone: string) {
  window.location.href = `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function shareToTelegram(url: string, text: string) {
  openUrl(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
}
