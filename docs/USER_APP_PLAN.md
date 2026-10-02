# Foydalanuvchi ilovasi — ish rejasi (2026-10-02)

## Arxitektura
- Yangi loyiha: `apps/userapp` (React + Vite + Tailwind — TZ steki). Admin `apps/webapp`ga TEGILMAYDI.
- Manzil: `https://olmaliq.online/app/` — Caddy'da alohida yo'l, alohida `kimbor_userapp` konteyner.
- Alohida Telegram bot (yangi token, `USER_BOT_TOKEN`) — ilova shu bot ichida ochiladi. Asosiy bot o'zgarmaydi.
- Baza: YANGI baza yo'q. Ilova `/api/public/*` orqali o'sha Postgres'ga ulanadi. API ikkala bot imzosini (BOT_TOKEN va USER_BOT_TOKEN) qabul qiladi.
- Dizayn manbasi: `design/user-app/` (Stitch eksporti, 39 ekran). Maskot "Borvoy" o'rniga jonli shakllar — kodda SVG + CSS animatsiya.

## Ma'lumot oqimi (baza bilan bog'liqlik)
| Ilovada | Qayerga tushadi | Kim ko'radi |
|---|---|---|
| Qidiruv | QueryLog | Admin statistikasi (bot bilan birga) |
| Raqam ochish | PhoneReveal | Limit + baholash huquqi |
| 👍/👎 baho | Review | Botdagi reyting ham o'zgaradi |
| "Noto'g'ri" xabari | Correction | Admin "Tuzatishlar" |
| Ma'lumot qo'shish | Candidate (source=webapp) | Admin "Nomzodlar" |
| "Bu men so'ragan emas" | SearchFeedback | Oltin test nomzodlari |
| Saqlash | Favorite | Faqat foydalanuvchi |

## Bosqichlar
1. Tayyorgarlik: dizayn tokenlari (ranglar, shrift Plus Jakarta Sans), jonli shakllar komponenti, API mijozi, initData.
2. Asosiy oqim: Bosh sahifa → Qidiruv → Natijalar / Topilmadi → Usta sahifasi → Raqam ochish → Baholash / Xabar berish.
3. Qolgan ekranlar: Onboarding + obuna, Kategoriya, Xarita (Leaflet/OSM), Arenda, SOS, Ma'lumot qo'shish, Saqlanganlar, Profil, tizim holatlari, Ulashish.
4. Qo'shimcha backend: AI yordamchi endpointi, ilova uchun shaxsiy statistika.
5. Infra: Dockerfile, Caddy `/app`, deploy, yangi botga Menu Button.
6. Sinov: haqiqiy Telegram ichida har ekran, limitlar, xavfsizlik (telefon faqat /phone orqali), oltin to'plam, light/dark.
7. Ochish: hammasi ishlagach — asosiy botga "📱 Ilovani ochish" tugmasi (alohida tasdiq bilan).

## Dizayn va ma'lumot nomuvofiqliklari (kodda shunday hal qilinadi)
- Yulduz "4.9" → "👍 92% tavsiya" (TZ).
- "350 m" masofa → ko'p yozuvda koordinata yo'q; mo'ljal nomi ko'rsatiladi, koordinata bo'lsa masofa.
- "Metan Gaz 190 bosim" → bizda "Zapravka" turi; soni bazadan.
- Soxta sonlar (142 ta, 86 ta) → bazadan haqiqiy son.
- Ovozli qidiruv → Telegram WebView qo'llasa ishlaydi, bo'lmasa tugma yashiriladi.
- Maskot rasmlari → jonli shakllar.
