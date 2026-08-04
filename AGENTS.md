# Loyiha qoidalari

## Loyiha haqida
"Kim bor?" — O'zbekiston shaharlari uchun Telegram bot va admin panel.
Odam guruhda oddiy tilda savol yozadi ("karzinka oldida gazavik bormi?"),
bot 3 soniyada bazadan topib javob beradi.

To'liq talablar: `docs/TZ.md`
Dizayn: `design/screenshots/` va `design/code/`

## Texnik stek — o'zgartirilmaydi

| Qism | Texnologiya |
|---|---|
| Monorepo | pnpm workspaces |
| Til | TypeScript (strict rejim) |
| Bot | grammY |
| Backend | Fastify |
| Baza | PostgreSQL + Prisma |
| Navbat va kesh | Redis + BullMQ |
| Web App | React + Vite + Tailwind CSS |
| AI | Gemini API (klassifikator uchun Flash, murakkab ishlar uchun Pro) |
| Ishga tushirish | Docker Compose + Caddy |

## Papka tuzilishi

```
apps/
  bot/          Telegram bot (grammY)
  api/          REST API (Fastify)
  webapp/       Telegram Mini App (React)
packages/
  db/           Prisma sxemasi va klient
  core/         Umumiy mantiq: qidiruv, reyting, intent
  types/        Umumiy TypeScript turlari
docs/
design/
```

## Qat'iy qoidalar

### 1. TZ — yagona haqiqat manbai
Har qanday qaror `docs/TZ.md` ga muvofiq bo'lishi shart.
TZ da javob bo'lmasa — kod yozmasdan avval so'rang.
TZ ga zid narsa yozmang, hatto "yaxshiroq" bo'lib tuyulsa ham.

### 2. Dizayn — piksel darajasida takrorlanadi
`design/` papkasidagi ko'rinish aynan takrorlanadi.
Ranglar, oraliqlar, burchaklar, shriftlar — o'zingizdan qo'shmang.
Dizaynda yo'q ekran kerak bo'lsa, mavjudlaridan uslubni olib yasang.

### 3. Ko'p shaharlilik — birinchi kundan
Har jadvalda `city_id` bo'ladi.
Har bir so'rov `city_id` bo'yicha filtrlanadi — istisnosiz.
Bu qoidani buzgan kod qabul qilinmaydi.

### 4. Xavfsizlik
- Foydalanuvchi huquqidan oshadigan amal bo'lmasin
- Web App'ga kirish Telegram `initData` orqali tekshiriladi
- Sirlar `.env` da, kodda emas
- Har bir yozish amali jurnalga tushadi

### 5. Favqulodda modul
Favqulodda javob matnlari **kodda yozilgan shablonlar**.
AI ularni yozmaydi, o'zgartirmaydi, to'ldirmaydi.
Bu qismga tegishli har qanday o'zgarish alohida so'raladi.

### 6. Kod uslubi
- TypeScript strict, `any` ishlatilmaydi
- Fayl 300 qatordan oshsa bo'linadi
- Har bir modul uchun test
- Izohlar o'zbek yoki ingliz tilida, lekin bir xil

### 7. Ishlash
- Bot javobi 3 soniyadan kam
- Har bir AI so'rovi keshlanadi (10 daqiqa)
- Bazada `city_id` va matn qidiruv indekslari

## Interfeys tili
Web App va bot matnlari — **o'zbek lotin**.
Kod, o'zgaruvchi nomlari, izohlar — ingliz.

## Har bir vazifadan keyin
1. Nima qilinganini qisqacha yozing
2. TZ ning qaysi bandi bajarilganini ko'rsating
3. Testlarni ishga tushiring
4. Keyingi qadamni taklif qiling
