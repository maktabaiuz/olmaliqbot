import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { initTelegram } from './lib/telegram';
import './styles.css';

initTelegram();
// Telegram ishga tushirish parametrlarini (#tgWebAppData=...) URL hash'iga
// qo'yadi — SDK ularni allaqachon o'qib bo'lgan, routerimiz esa hash'ni
// sahifa yo'li sifatida ishlatadi. Shuning uchun boshlang'ich yo'lga
// almashtiramiz; ulashilgan havola (?listing=<id>) bo'lsa — o'sha sahifaga.
if (!window.location.hash.startsWith('#/')) {
  const listing = new URLSearchParams(window.location.search).get('listing');
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${listing ? `/listing/${listing}` : '/'}`);
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
