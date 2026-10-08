import React from 'react';
import ReactDOM from 'react-dom/client';
import { startAutoUpdate } from './autoUpdate';
import { App } from './App';
import { initTelegram } from './lib/telegram';
import './styles.css';

initTelegram();
// Telegram ishga tushirish parametrlarini (#tgWebAppData=...) URL hash'iga
// qo'yadi — SDK ularni allaqachon o'qib bo'lgan, routerimiz esa hash'ni
// sahifa yo'li sifatida ishlatadi. Shuning uchun boshlang'ich yo'lga
// almashtiramiz; ulashilgan havola (?listing=<id>) bo'lsa — o'sha sahifaga.
// Botdagi tugmalar va reklama havolalari: ?go=rent_add | rent (2026-10-06).
const GO_ROUTES: Record<string, string> = { rent_add: '/rent/add', rent: '/rent' };
if (!window.location.hash.startsWith('#/')) {
  const q = new URLSearchParams(window.location.search);
  const listing = q.get('listing');
  const go = GO_ROUTES[q.get('go') || ''];
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${listing ? `/listing/${listing}` : go || '/'}`);
}
startAutoUpdate();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
