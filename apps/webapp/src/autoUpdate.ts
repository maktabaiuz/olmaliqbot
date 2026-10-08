/**
 * Yangi versiya chiqqanini aniqlab, sahifani o'zi yangilaydi (2026-10-08).
 *
 * Telegram endi Mini App'ni yopmaydi — kichraytirib, fonda saqlaydi. Qayta
 * ochilganda sahifa qayta yuklanmaydi, xotiradagi ESKI versiya ko'rinadi
 * (deploy'dan keyin admin yangi bo'limlarni ko'rmagan). Shu sabab: ekranga
 * qaytilganda va har 2 daqiqada index.html dagi skript nomi (Vite hash)
 * tekshiriladi; o'zgargan bo'lsa — sahifa yangilanadi.
 */
const currentScript = () =>
  Array.from(document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]'))
    .map((s) => new URL(s.src, location.href).pathname)
    .find((p) => p.includes('/assets/')) || null;

let checking = false;
async function check() {
  if (checking || document.visibilityState !== 'visible') return;
  const mine = currentScript();
  if (!mine) return; // dev rejimi
  checking = true;
  try {
    const base = mine.slice(0, mine.indexOf('/assets/') + 1);
    const html = await fetch(`${base}?_=${Date.now()}`, { cache: 'no-store' }).then((r) => (r.ok ? r.text() : ''));
    const latest = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)?.[1];
    if (latest && new URL(latest, location.href).pathname !== mine) {
      location.reload();
    }
  } catch {
    /* tarmoq yo'q — keyinroq */
  } finally {
    checking = false;
  }
}

export function startAutoUpdate() {
  document.addEventListener('visibilitychange', check);
  window.addEventListener('focus', check);
  setInterval(check, 120_000);
  setTimeout(check, 5_000);
}
