# "Kim bor?" — foydalanuvchi ilovasi (Telegram Mini App)

> Admin paneldan ALOHIDA ilova. Admin webapp'ga tegilmaydi. Uslub — quvnoq, 3D ikonkali, animatsiyali.

## 1. Mantiq (bizda BOR imkoniyatlardan)

| Imkoniyat | Bazadagi asos | Ilovada |
|---|---|---|
| Aqlli qidiruv | `classifyQuery` + `searchListings` + AI tekshiruv | Oddiy tilda yozish ("karzinka oldida gazavik"), natija + "nega shu chiqdi" |
| Kategoriyalar | `Category` (emoji, group, objectType) | Bosh sahifa: Ustalar / Do'konlar / Muassasalar / Transport / Arenda / Zapravka |
| Mahallalar va mo'ljallar | `Landmark` + `boundary` (xarita) | Xarita (Leaflet/OSM), "Mening hududim", hudud bo'yicha ko'rish |
| Yozuv kartasi | name, phone, workFrom/To, badges, specificServices, approxPrice, photoUrls, mapUrl, verification | To'liq profil: qo'ng'iroq, lokatsiya, ish vaqti (hozir ochiq/yopiq), belgilar |
| Ishonch belgisi | `VERIFIED` / `COMMUNITY_UNVERIFIED` | ✅ Tasdiqlangan / ⚠️ Xalq aytgan |
| Baholash | `Review` (TZ: Bayes o'rtachasi) | Yulduzcha + izoh |
| Arenda filtri | roomCount, rentPrice, currency, rentTermType | Xona, narx, kunlik/oylik filtrlari |
| Favqulodda | shablonlar (kodda, o'zgarmaydi) | Doim ko'rinadigan SOS: 101/102/103/104/112 + mahalliy dispetcherlar |
| Ma'lumot qo'shish | `Candidate` (admin navbati) | "Usta/do'kon qo'shish" formasi |
| Xato tuzatish | `Correction` | "Raqam noto'g'ri / yopilgan" tugmasi |
| AI yordamchi | chatAssistant (18+/din/siyosat taqiqli) | Chat ekrani |

### False positive tamoyili ilovada ham amal qiladi
- Ishonchli moslik bo'lmasa — **tasodifiy natija ko'rsatilmaydi**, "Topilmadi — bilsangiz qo'shing" ekrani chiqadi.
- Har bir natijada **"Nega shu?"** qatori: "Siz 'kalonka' dedingiz → bu usta kalonka ta'mirlaydi".
- Natija xato bo'lsa — bir bosishda **"Bu men so'ragan narsa emas"** (QueryLog'ga yoziladi → oltin test to'plamiga nomzod).
- Ishonch past natijalar "Ehtimol shular" deb ALOHIDA, xira ko'rsatiladi, asosiy javob sifatida emas.

## 2. Google Stitch uchun prompt (inglizcha — Stitch shunda aniqroq ishlaydi)

### Asosiy prompt (birinchi bo'lib bering)

```
Design a mobile Telegram Mini App for regular city residents called "Kim bor?" — a playful, friendly local directory for Olmaliq, Uzbekistan. People find trusted craftsmen, shops, institutions, taxis, rentals and gas stations by typing in everyday Uzbek ("karzinka oldida gazavik bormi?") and get a verified phone contact in seconds. This is a CONSUMER app — NOT an admin dashboard: no tables, no stats, no dense lists.

Platform: iPhone-sized (390×844) inside Telegram; respect safe areas. Provide light and dark mode.

VISUAL STYLE — joyful, colorful, modern, 3D:
- Glossy 3D clay-style icons (soft, rounded, Blender-like, subtle shadows) for EVERY category and action — wrench for Ustalar, shopping bag for Do'konlar, building for Muassasalar, taxi car for Transport, house with key for Arenda, fuel pump for Zapravka, siren for SOS, map pin, star, bookmark, phone. All icons from ONE consistent 3D set: same lighting (top-left), same material, same angle, same pastel palette. Never mix flat icons with 3D icons.
- Bright friendly palette: primary violet #6C5CE7, accent sunny yellow #FFC93C, mint green #00C9A7 (open / success), coral #FF6B6B (SOS / closed), sky blue #4DA3FF. Soft gradient backgrounds (light: #F7F5FF → #FFFFFF; dark: #14112B → #1E1A3A).
- Rounded, bubbly shapes: 24px card radius, pill buttons, chunky friendly typography (Nunito or Poppins, bold headings 28-32px).
- Cards float with soft colored shadows; each category has its own pastel tint used consistently everywhere (tiles, chips, result cards, map pins).
- Mascot: a small cute 3D character (friendly round helper with a map-pin hat) appearing in empty states, onboarding, loading and success screens.

MOTION (describe in annotations): bouncy spring animations on tap (scale 0.95 → 1), category tiles that wobble slightly on press, results sliding up one by one with stagger, a playful loading animation of the mascot searching with a magnifier, confetti burst after adding a listing or leaving a review, pulsing green dot for "Hozir ochiq", smooth bottom-sheet transitions.

CONSISTENCY RULES: one icon set, one color per category, one corner radius system (24 cards / 16 chips / full pills), one type scale, same card anatomy on every screen.

Bottom tab bar (floating, rounded, glassy, with 3D icons): Bosh sahifa, Xarita, Qidiruv (big center button with gradient), Saqlanganlar, Profil.

Trust is the core value: every result shows "✅ Tasdiqlangan" or "⚠️ Xalq aytgan" badge and a small "Nega shu?" line explaining why it matched. The app never shows random guesses — when nothing reliable is found, the mascot invites the user to add the info. A coral SOS button is always reachable on home.

All UI text in Uzbek Latin.
```

### Ekranlar (har birini alohida prompt sifatida bering)

**1 — Bosh sahifa**
```
Home screen. Top: greeting "Assalomu alaykum 👋", city chip "📍 Olmaliq" (tap to change neighborhood), red circular SOS button top-right. Big rounded search field with placeholder "Kim kerak? Masalan: santexnik, taksi, dorixona…" and a microphone icon. Below: 6 large category tiles in a 3×2 grid with emoji and count: 🔧 Ustalar, 🛒 Do'konlar, 🏛 Muassasalar, 🚕 Transport, 🏠 Arenda, ⛽ Zapravka. Section "Hozir ochiq yaqiningizda" — horizontal cards (name, category, green "Ochiq · 20:00 gacha", distance, call button). Section "Ko'p so'ralgan" — chips (Gazavik, Santexnik, Elektrik, Labo, Choyxona). Bottom banner: "Usta yoki do'kon bilasizmi? Qo'shing ➕".
```

**2 — Qidiruv natijalari**
```
Search results screen for query "karzinka oldida gazavik". Top: search field with the query, below it parsed-understanding chips the user can remove: "🔧 Gazavik" and "📍 Karzinka". Filter row: Hozir ochiq, Uyga boradi, 24/7, Kafolat, Tasdiqlangan. Result cards: name, category with emoji, verification badge, rating ★4.8 (23), landmark "📍 Karzinka yonida · 600 m", open status, badges as small pills, and a gray line "Nega shu? Gazavik · Karzinka hududida ishlaydi". Two buttons per card: green "📞 Qo'ng'iroq" and gray "Batafsil". Under the first 3 strong results, a separated faded section titled "Ehtimol bular ham" for weaker matches. Small link at the bottom: "Bu men so'ragan narsa emas".
```

**3 — Topilmadi (empty state)**
```
Empty search result screen. Friendly illustration, title "Hozircha bazada yo'q", text "Biz faqat ishonchli ma'lumot beramiz — taxmin qilmaymiz. Siz bunday odamni bilsangiz, qo'shing, tekshirib bazaga kiritamiz." Primary button "➕ Ma'lumot qo'shish", secondary "Butun shahar bo'yicha qidirish", and "Yaqin sohalar" chips suggestions.
```

**4 — Yozuv (usta/do'kon) sahifasi**
```
Listing detail screen. Photo carousel header (or large emoji placeholder). Name, category, verification badge, rating with stars. Big action row: 📞 Qo'ng'iroq (green, primary), 💬 Telegram, 📍 Lokatsiya, 🔖 Saqlash, ↗ Ulashish. Info grouped list: Ish vaqti (with live "Hozir ochiq" green / "Yopiq" red), Manzil (landmark + mini map), Xizmat hududlari (chips of neighborhoods), Xizmatlar (e.g. "kolonka ta'miri, plita o'rnatish"), Taxminiy narx, Belgilar (Uyga boradi, Kafolat, 24/7). Reviews section with average and 2 review cards, button "⭐ Baholash". Bottom quiet link: "⚠️ Ma'lumot noto'g'rimi? Xabar bering".
```

**5 — Xarita**
```
Map screen (OpenStreetMap style, clean muted tiles). Neighborhoods (mahallalar) drawn as soft translucent colored polygons with labels. Category filter chips floating on top. Pins with category emoji; tapping shows a bottom sheet card with name, status, call button. "📍 Men qayerdaman" floating button. Bottom sheet header: "Bu hududda: 14 ta usta, 6 ta do'kon".
```

**6 — Arenda**
```
Rentals screen. Segmented control: Kvartira / Uy / Mashina / Ofis. Filters: xonalar soni (1,2,3,4+ chips), narx range slider with UZS/USD toggle, Kunlik/Oylik/Yillik. Cards with large photo, price bold "300 $ / oy", "2 xonali · Mikrorayon 5", call button.
```

**7 — SOS (Favqulodda)**
```
Emergency screen, red accent but calm. Title "Favqulodda yordam". Large tappable rows with icon and number: 🚒 Yong'in 101, 🚓 Militsiya 102, 🚑 Tez yordam 103, 🔥 Gaz xizmati 104, 🆘 Yagona 112. Section "Mahalliy xizmatlar": Elektr tarmoqlari, Suv, Gaz — with numbers. Each row has a large call button. Short safety tip card at bottom: "Gaz hidi bo'lsa: chiroqni yoqmang, derazalarni oching, 104 ga qo'ng'iroq qiling".
```

**8 — Ma'lumot qo'shish**
```
Add-listing form, 4 short steps with progress bar: 1) Nomi, 2) Soha (searchable category picker with emoji), 3) Telefon (+998 mask), 4) Manzil (neighborhood picker or tap on map). Optional: photo upload, ish vaqti, xizmatlar. Final screen: "Rahmat! Admin tekshiradi va 24 soat ichida qo'shiladi" with a checkmark animation.
```

**9 — AI yordamchi**
```
Chat screen with a friendly assistant avatar. Assistant bubbles can contain embedded result cards (name, badge, call button). Suggested prompts above the input: "Yaqin dorixona", "Kechasi ishlaydigan taksi", "Kalonka ustasi". Small note under the header: "Faqat bazadagi ishonchli ma'lumotdan javob beradi".
```

**10 — Saqlanganlar va Profil**
```
Saved screen: grouped list of saved listings with quick call buttons, and "Oxirgi qidiruvlar" history chips. Profile screen: user name/avatar from Telegram, my neighborhood, my submissions with status pills (Kutilmoqda / Qo'shildi / Rad etildi), my reviews, language (O'zbek / Ўзбек / Русский), dark mode toggle, "Bot kanaliga obuna" link.
```

## 3. Stitch bilan ishlash tartibi
1. Asosiy promptni bering → uslubni tasdiqlang.
2. Ekranlarni bittalab qo'shing. Har birining oxiriga qo'shing: "Use exactly the same playful 3D design system, icon set, colors and mascot as before."
3. Har ekranni light + dark ko'rinishda oling.
4. Tayyor dizaynlarni (PNG yoki HTML eksport) `design/user-app/` papkasiga qo'ying — kodni shunga piksel darajasida yozamiz.

## 4. Backend qarorlariga moslash (2026-10-02)
- Baholash TZ bo'yicha 👍/👎 (yulduz emas) → ekranlarda "92% tavsiya qiladi (25)" ko'rinishi.
- Telefon raqami darhol ko'rinmaydi: "📞 Qo'ng'iroq" bosilganda ochiladi (obuna + limit: 20/soat, 60/kun).
- Baho faqat raqamni ochgan (bog'langan) odam beradi.
- Joyi noma'lum yozuvlar manzili: "Olmaliq (butun shahar)".
- API: `/api/public/*` (home, categories, landmarks, listings, search, listings/:id, phone, favorites, review, report, search-feedback, candidates, me/candidates, me/subscription, emergency).
