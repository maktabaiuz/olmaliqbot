# TEXNIK TOPSHIRIQ

## "Kim bor?" — shahar ma'lumotnomasi boti

**Versiya:** 1.0
**Sana:** 2026-yil avgust
**Buyurtmachi:** Bobur (Olmaliq)
**Hujjat maqsadi:** loyihani ishlab chiqish uchun to'liq texnik va mahsulot talablari

---

# 1 · LOYIHA HAQIDA

## 1.1 Muammo
Shahar aholisi kundalik ehtiyoj uchun kerakli odamni topa olmaydi. Gazavik, santexnik, kafelchi, ish vaqti noma'lum do'kon — bularning hammasi guruh chatlarida so'raladi va javob tasodifiy keladi. Ko'pincha:
- Bitta savolga o'nlab odam javob yozadi, yarmi noto'g'ri
- Raqamlar eskirgan bo'ladi
- Javob umuman kelmaydi
- Chat tartibsiz bo'lib ketadi

Mavjud yechimlar bu muammoni hal qilmaydi: Google va 2GIS mahalliy ustalarni bilmaydi, OLX'da ishonch yo'q, marketplace ilovalari esa ilova yuklashni talab qiladi.

## 1.2 Yechim
Telegram guruhida yashaydigan bot. Odam odatdagidek savol yozadi, bot 3 soniyada aniq javob beradi. Ilova yuklash, ro'yxatdan o'tish, menyu bo'ylab yurish kerak emas.

## 1.3 Uch asosiy ustunlik
1. **Chat ichida yashaydi.** Dunyodagi o'xshash 15 ta loyihaning 14 tasi ilova yuklashni talab qiladi. Bizda ishqalanish nolga teng — odam allaqachon guruhda o'tiribdi.
2. **Mo'ljal bo'yicha qidiradi.** "Karzinka oldidagi do'kon", "bozor orqasi", "3-mavze" — mahalliy odamlar shunday gapiradi. Google buni tushunmaydi. Bu bilim faqat shu yerda yashovchilarda bor va uni nusxa ko'chirib bo'lmaydi.
3. **Ishonch shaxsiy tekshiruvga asoslangan.** Har bir ✅ belgi ortida "men bu odamni shaxsan ko'rganman" degan kafolat turadi.

## 1.4 Pozitsiyalash
> **"Kim bor?" — shahar miyasi. Savolingizni guruhga yozasiz, 3 soniyada javob olasiz.**

## 1.5 Biznes modeli
Ikki qavatli:
```
Siz (super-admin)  ←  oylik obuna  ←  shahar admini
shahar admini      ←  reklama/homiylik  ←  mahalliy biznes
```

| Tarif | Narx/oy | Kimga |
|---|---|---|
| Asoschi | 149 000 so'm | Birinchi 3 shahar, umrbod |
| Standart | 299 000 so'm | Oddiy shahar |
| Katta shahar | 499 000 so'm | 10 000+ auditoriya |

Xarajat: doimiy ~$10–15/oy + har shahar ~$2–6/oy. Marja ~80%.

---

# 2 · FOYDALANUVCHILAR VA ROLLAR

| Rol | Kim | Nima qila oladi |
|---|---|---|
| **Super-admin** | Bobur | Shahar ochish, ariza tasdiqlash, to'lovlar, umumiy lug'at, bot matnlari, barcha shahar ma'lumoti |
| **Shahar admini** | Kanal/guruh egasi | Faqat o'z shahri: baza, so'rovlar, mo'ljallar, moderator tayinlash, sozlamalar |
| **Moderator** | Admin yordamchisi | Rolga qarab: tasdiqlovchi / to'ldiruvchi / kuzatuvchi |
| **Foydalanuvchi** | Guruh a'zosi | Savol berish, baholash, ma'lumot taklif qilish |

## 2.1 Moderator rollari
Uch tayyor rol, keyin har bir huquqni alohida sozlash mumkin:
- **Tasdiqlovchi** — nomzodlarni ko'radi va tasdiqlaydi
- **To'ldiruvchi** — yozuv qo'shadi va tahrirlaydi
- **Kuzatuvchi** — faqat ko'radi

## 2.2 Muhim xavfsizlik qoidasi
**AI foydalanuvchining huquqini meros oladi va undan oshmaydi.** Angren admini AI'ga "Olmaliq bazasini ko'rsat" desa — AI qila olmaydi. Bu qoida kodda qattiq qulflanadi, aks holda AI maxfiylikni buzish yo'liga aylanadi.

---

# 3 · BOT MANTIQI

## 3.1 Bot qayerda ishlaydi

| Joy | Xatti-harakat |
|---|---|
| **Guruh** | Asosiy ish joyi. Bot admin bo'lishi shart |
| **Kanal izohlari** | Guruh bilan bir xil |
| **Lichka** | Kuniga 20 savol, shahar bir marta so'raladi |

## 3.2 Ikki bosqichli filtr
Guruhda kuniga 200–500 xabar bo'lishi mumkin. Har birini AI'ga yuborish qimmat va sekin.

**0-qavat — bepul filtr (kod, AI yo'q).**
Xabar tashlab yuboriladi, agar: `?` yo'q **VA** savol so'zlari yo'q **VA** lug'atdan hech bir so'z yo'q.

O'tkazish so'zlari: `kim biladi, kim bor, bormi, kerak, nomer, raqam, telefon, qayer, qanaqa, nechida, nechigacha, ochiqmi, qancha, bilasizmi, aytinglar, kerak edi`

Bu guruh xabarlarining ~90% ini AI'gacha yetkazmaydi.

**1-qavat — AI klassifikator.** Faqat filtrdan o'tgan xabar. JSON qaytaradi:
```json
{
  "intent": "SERVICE",
  "object_type": "USTA",
  "category": "gazavik",
  "name": null,
  "landmark": "Korzinka",
  "confidence": 0.91
}
```

**Qat'iy qoida: `confidence < 0.7` bo'lsa — bot jim.** Noto'g'ri javobdan ko'ra indamagan yaxshi.

## 3.3 Niyat turlari
| Intent | Misol |
|---|---|
| `CONTACT` | "Bahromni nomeri nechi edi" |
| `SERVICE` | "Gaz kolonka buzildi, kim bor?" |
| `HOURS` | "Karzinka oldidagi do'kon nechigacha ishlaydi" |
| `LOCATION` | "Notarius qayerda joylashgan?" |
| `PRICE` | "Konditsioner o'rnatish qancha turadi?" |
| `EMERGENCY` | "Gaz hidi kelyapti" |
| `NOT_RELEVANT` | qolgan hamma narsa → jim |

## 3.4 Til
Bot uchala tilni tushunadi: **o'zbek lotin, o'zbek kirill, rus.**
Har bir so'z bazada uch shaklda indekslanadi.
Javob tili shahar admini tomonidan tanlanadi: `Lotin` / `Kirill` / `Rus` / `Avtomatik`.

## 3.5 Javob ko'rinishi — guruhda
Bitta eng zo'r usta + "yana ko'rish" tugmasi:
```
🔧 Gazavik

Bahrom ✅ ⭐4.4
📍 Karzinka orqasi
🏷 Uyga boradi · Kafolat
📞 +998 90 123 45 67

[Yana 2 tasini ko'rish]

🕐 Bu xabar 15 daqiqada o'chadi
[⭐ Baholash]  [⚠️ Shikoyat]
```

## 3.6 Javob ko'rinishi — lichkada
Bot avval aniqlashtiradi, agar hudud noma'lum bo'lsa. Lichkada xabar o'chmaydi.

## 3.7 Nima kimga ko'rinadi
- 🔧 Usta javoblari: **Hamma**
- 🚨 Favqulodda ogohlantirish: **Hamma**
- ⭐ Baholash so'rovi: Faqat o'sha odam (ephemeral)
- ⚠️ Usta haqida ogohlantirish: Faqat so'ragan odam
- 🚫 Limit tugadi: Faqat o'sha odam
- ✅ Ma'lumot qabul qilindi: Faqat yuborgan odam

## 3.8 Boshqa qoidalar
- **Kuniga 20 savol** bir odamdan.
- **Takroriy savolga** 10 daqiqalik kesh ishlatiladi.
- **Bot javobi 15 daqiqada o'chadi**, favqulodda xabar o'chmaydi.
- **Bot javobi savolga reply** qilib yuboriladi.
- Bazada javob topilmasa: guruhda **jim**, lichkada qisqa "Bu bo'yicha ma'lumot yo'q" + so'rovlar jurnaliga yoziladi.
- Bot **24/7** ishlaydi.
- Bot **shaxsiy fuqarolar** haqida ma'lumot bermaydi — faqat bazadagi xizmat ko'rsatuvchilar.
- Bot **tibbiy maslahat bermaydi** — faqat 103.

---

# 4 · FAVQULODDA HOLAT MODULI

## 4.1 Asosiy qoida
**Javob matni AI tomonidan yozilmaydi.** AI faqat holatni aniqlaydi, matn oldindan yozilgan shablondan olinadi.

## 4.2 Uch daraja
### 🔴 1-daraja — hayotga xavf
`gaz hidi · yong'in · tutun · elektr urdi · hushidan ketdi · qon ketyapti · avariya`
**Hech qanday usta tavsiya qilinmaydi.** Faqat xavfsizlik va 104, 112 va h.k. Bu xabar **o'chmaydi**.

### 🟠 2-daraja — shoshilinch, xavfsiz
`quvur yorildi · suv oqyapti · lift qoldi · svet yo'q`
Avval rasmiy avariya xizmati, keyin usta.

### 🟢 3-daraja — oddiy
Odatdagi qidiruv.

## 4.3 Raqamlar
Har shahar uchun alohida jadval, 9 ta raqam.

---

# 5 · MA'LUMOTLAR BAZASI

## 5.1 Yozuv tuzilishi
- Majburiy: Ism/nom, Kasb/turi, Telefon, Asosiy mo'ljal
- Muhim: Ish vaqti, Belgilar (chiplar: uyga boradi, 24/7, kafolat, karta qabul qiladi, zudlik bilan, dam olishsiz, ruscha biladi), Xizmat hududi
- Ixtiyoriy: Aniq xizmatlar, Narx, Rasm (mo'ljal surati), Izoh
- Tizim maydonlari: city_id, holat, ishonch, manba, yaratilgan, oxirgi_yangilanish, homiy, to'liqlik_foizi

---

# 6 · ISHONCH VA SIFAT
- Sukut bo'yicha har doim ⚠️. ✅ faqat admin shaxsan ko'rishganda qo'yiladi.
- Bayes o'rtachasi bilan reyting hisoblash.

---

# 7 · SO'ROVLAR SIKLI
Missing query logging & AI grouping + auto notification when matching listing is added.

---

# 8 · WEB APP
Telegram Mini App (React + Vite + Tailwind CSS) with 12 Admin screens & 6 Super-Admin screens.

---

# 9 · AI MODULLARI & COPILOT
Gemini API (Flash for classifier, Pro for copilot function calling with permission boundaries).

---

# 10 · KO'P SHAHARLILIK
Multi-tenant database with strict `city_id` scoping across all queries.
