"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMERGENCY_TEMPLATES = void 0;
exports.EMERGENCY_TEMPLATES = {
    // 1.1 GAZ HIDI
    gas_leak: {
        category: 'gas_leak',
        level: 1,
        keywords: ['gaz hidi', 'gaz isi', 'gaz chiqyapti', 'gaz hidi kelyapti', 'газ пахнет', 'запах газа', 'утечка газа', 'gaz sizyapti'],
        templates: {
            lotin: `🚨 GAZ HIDI — DARHOL:

❌ Chiroq, gugurt, zajigalka — yoqmang
❌ Vyklyuchatel, rozetka, telefonga tegmang
❌ Liftga kirmang

✅ Derazalarni keng oching
✅ Gaz kranini yoping
✅ Uydan chiqing
✅ Qo'ng'iroqni tashqaridan qiling

📞 104 — Gaz avariya xizmati
📞 112 — Yagona qutqaruv
{mahalliy_gaz}

Usta emas — avval avariya xizmatini chaqiring.`,
            kirill: `🚨 ГАЗ ҲИДИ — ДАРҲОЛ:

❌ Чироқ, гугурт, зажигалка — ёқманг
❌ Выключатель, розетка, телефонга тегманг
❌ Лифтга кирманг

✅ Деразаларни кенг очинг
✅ Газ кранини ёпинг
✅ Уйдан чиқинг
✅ Қўнғироқни ташқаридан қилинг

📞 104 — Газ авария хизмати
📞 112 — Ягона қутқарув
{mahalliy_gaz}

Уста эмас — аввал авария хизматини чақиринг.`,
            rus: `🚨 ЗАПАХ ГАЗА — СРОЧНО:

❌ Не включайте свет, спички, зажигалку
❌ Не трогайте выключатели, розетки, телефон
❌ Не пользуйтесь лифтом

✅ Широко откройте окна
✅ Перекройте газ
✅ Выйдите из дома
✅ Звоните с улицы

📞 104 — Аварийная газовая служба
📞 112 — Единая служба спасения
{mahalliy_gaz}

Не ищите мастера — сначала вызывайте аварийную службу!`,
        },
    },
    // 1.2 YONG'IN
    fire: {
        category: 'fire',
        level: 1,
        keywords: ["yong'in", "o't ketdi", 'yonyapti', 'olov', 'пожар', 'горит', 'загорелось'],
        templates: {
            lotin: `🚨 YONG'IN — DARHOL:

✅ Hammani uyg'oting, tashqariga chiqing
✅ Chiqayotganda eshiklarni yopib boring
✅ Liftdan foydalanmang — zinadan tushing
✅ Qo'ng'iroqni xavfsiz joydan qiling

❌ Narsa yig'ib o'tirmang
❌ Katta olovni o'zingiz o'chirishga urinmang
❌ Yonayotgan joyga qaytmang

📞 101 — Yong'in xavfsizligi
📞 112 — Yagona qutqaruv`,
            kirill: `🚨 ЁНҒИН — ДАРҲОЛ:

✅ Ҳаммани уйғотинг, ташқарига чиқинг
✅ Чиқаётганда эшикларни ёпиб боринг
✅ Лифтдан фойдаланманг — зинадан тушинг
✅ Қўнғироқни хавфсиз жойдан қилинг

❌ Нарса йиғиб ўтирманг
❌ Катта оловни ўзингиз ўчиришга уринманг
❌ Ёнаётган жойга қайтманг

📞 101 — Ёнғин хавфсизлиги
📞 112 — Ягона қутқарув`,
            rus: `🚨 ПОЖАР — СРОЧНО:

✅ Разбудите всех, выходите на улицу
✅ Закрывайте за собой двери
✅ Не пользуйтесь лифтом — спускайтесь по лестнице
✅ Звоните из безопасного места

❌ Не тратьте время на сбор вещей
❌ Не тушите крупный пожар самостоятельно
❌ Не возвращайтесь в горящее помещение

📞 101 — Пожарная служба
📞 112 — Единая служба спасения`,
        },
    },
    // 1.3 TUTUN
    smoke: {
        category: 'smoke',
        level: 1,
        keywords: ['tutun', 'tutun bosdi', 'nafas ololmayapman', 'дым', 'задымление'],
        templates: {
            lotin: `🚨 TUTUN — DARHOL:

✅ Past egiling — toza havo pastda bo'ladi
✅ Og'iz va burnini nam mato bilan yoping
✅ Devor bo'ylab chiqish tomon yuring
✅ Tashqariga chiqing

❌ Tik turib yurmang
❌ Liftga kirmang

📞 101 — Yong'in xavfsizligi
📞 112 — Yagona qutqaruv`,
            kirill: `🚨 ТУТУН — ДАРҲОЛ:

✅ Паст эгилинг — тоза ҳаво пастда бўлади
✅ Оғиз ва бурнини нам мато билан ёпинг
✅ Девор бўйлаб чиқиш томон юринг
✅ Ташқарига чиқинг

❌ Тик туриб юрманг
❌ Лифтга кирманг

📞 101 — Ёнғин хавфсизлиги
📞 112 — Ягона қутқарув`,
            rus: `🚨 ДЫМ — СРОЧНО:

✅ Наклонитесь ниже — чистый воздух внизу
✅ Закройте нос и рот влажной тканью
✅ Двигайтесь вдоль стены к выходу
✅ Выходите на улицу

❌ Не передвигайтесь во весь рост
❌ Не входите в лифт

📞 101 — Пожарная служба
📞 112 — Единая служба спасения`,
        },
    },
    // 1.4 ELEKTR URDI
    electric_shock: {
        category: 'electric_shock',
        level: 1,
        keywords: ['elektr urdi', 'tok urdi', 'elektrdan', 'током ударило', 'удар током'],
        templates: {
            lotin: `🚨 ELEKTR URDI — DARHOL:

❌ Odamga qo'l tegizmang — tok sizga ham o'tadi

✅ Avval tokni o'chiring (avtomat yoki rozetkani uzing)
✅ O'chira olmasangiz — quruq yog'och yoki plastmassa bilan simni odamdan uzoqlashtiring
✅ Keyin 103 ga qo'ng'iroq qiling
✅ Dispecher aytganini bajaring

📞 103 — Tez tibbiy yordam
📞 112 — Yagona qutqaruv
{mahalliy_elektr}`,
            kirill: `🚨 ЭЛЕКТР УРДИ — ДАРҲОЛ:

❌ Одамга қўл тегизманг — ток сизга ҳам ўтади

✅ Аввал токни ўчиринг (автомат ёки розеткани узинг)
✅ Ўчира олмасангиз — қуруқ ёғоч ёки пластмасса билан симни одамдан узоқлаштиринг
✅ Кейин 103 га қўнғироқ қилинг
✅ Диспетчер айтганини бажаринг

📞 103 — Тез тиббий ёрдам
📞 112 — Ягона қутқарув
{mahalliy_elektr}`,
            rus: `🚨 УДАР ТОКОМ — СРОЧНО:

❌ Не прикасайтесь к человеку — ток перейдет на вас

✅ Сначала отключите ток (выключите автомат или выдерните вилку)
✅ Если не получается — оттолкните провод сухой деревянной или пластиковой палкой
✅ Затем звоните 103
✅ Следуйте указаниям диспетчера

📞 103 — Скорая помощь
📞 112 — Единая служба спасения
{mahalliy_elektr}`,
        },
    },
    // 1.5 HUSHIDAN KETDI
    unconscious: {
        category: 'unconscious',
        level: 1,
        keywords: ['hushidan ketdi', 'yiqilib tushdi', "uyg'onmayapti", 'без сознания', 'потерял сознание', 'упал'],
        templates: {
            lotin: `🚨 DARHOL 103 GA QO'NG'IROQ QILING

✅ Dispecher bilan gaplashing — u sizga aytib turadi
✅ Nafas olayotganini tekshiring
✅ Nafas olayotgan bo'lsa — yon tomonga yotqizing
✅ Odam yonida qoling

❌ Suv yoki dori bermang
❌ Silkitmang, turg'izmang
❌ Yolg'iz qoldirmang

📞 103 — Tez tibbiy yordam
📞 112 — Yagona qutqaruv`,
            kirill: `🚨 ДАРҲОЛ 103 ГА ҚЎНҒИРОҚ ҚИЛИНГ

✅ Диспетчер билан гаплашинг — у сизга айтиб туради
✅ Нафас олаётганини текширинг
✅ Нафас олаётган бўлса — ён томонга ётқизинг
✅ Одам ёнида қолинг

❌ Сув ёки дори берманг
❌ Силкитманг, турғизманг
❌ Ёлғиз қолдирманг

📞 103 — Тез тиббий ёрдам
📞 112 — Ягона қутқарув`,
            rus: `🚨 СРОЧНО ЗВОНИТЕ 103

✅ Говорите с диспетчером — он даст инструкции
✅ Проверьте дыхание
✅ Если дышит — положите на бок
✅ Оставайтесь рядом

❌ Не давайте воду или лекарства
❌ Не трясите и не пытайтесь поднять
❌ Не оставляйте одного

📞 103 — Скорая помощь
📞 112 — Единая служба спасения`,
        },
    },
    // 1.6 QON KETYAPTI
    bleeding: {
        category: 'bleeding',
        level: 1,
        keywords: ['qon ketyapti', 'qattiq kesildi', "qon to'xtamayapti", 'кровь', 'сильно порезался', 'кровотечение'],
        templates: {
            lotin: `🚨 DARHOL 103 GA QO'NG'IROQ QILING

✅ Toza mato bilan jarohat ustidan qattiq bosing
✅ Bosishni to'xtatmang, mato qonga to'lsa ustiga yana qo'ying
✅ Qo'l yoki oyoq bo'lsa — yuqoriroq ko'taring
✅ Dispecher aytganini bajaring

❌ Jarohatdagi narsani sug'urib olmang
❌ Yarani yuvmang, dori sepmang

📞 103 — Tez tibbiy yordam
📞 112 — Yagona qutqaruv`,
            kirill: `🚨 ДАРҲОЛ 103 ГА ҚЎНҒИРОҚ ҚИЛИНГ

✅ Тоза мато билан жароҳат устидан қаттиқ босинг
✅ Босишни тўхтатманг, мато қонга тўлса устига яна қўйинг
✅ Қўл ёки оёқ бўлса — юқорироқ кўтаринг
✅ Диспетчер айтганини бажаринг

❌ Жароҳатдаги нарсани суғуриб олманг
❌ Ярани ювманг, дори сепманг

📞 103 — Тез тиббий ёрдам
📞 112 — Ягона қутқарув`,
            rus: `🚨 СРОЧНО ЗВОНИТЕ 103

✅ Прижмите чистую ткань к ране с силой
✅ Не отпускайте давление, если ткань пропиталась — наложите еще сверху
✅ Если ранена конечность — поднимите ее выше уровня сердца
✅ Следуйте указаниям диспетчера

❌ Не извлекайте предметы из раны
❌ Не промывайте рану и не сыпьте лекарства

📞 103 — Скорая помощь
📞 112 — Единая служба спасения`,
        },
    },
    // 1.7 ACCIDENT
    accident: {
        category: 'accident',
        level: 1,
        keywords: ['avariya', 'mashina urdi', "to'qnashdi", 'авария', 'дтп', 'сбила машина'],
        templates: {
            lotin: `🚨 AVARIYA — DARHOL:

✅ 103 va 102 ga qo'ng'iroq qiling
✅ Avariya belgisini qo'ying, ogohlantiruvchi chiroqni yoqing
✅ Jabrlanganni qimirlatmang — yong'in xavfi bo'lmasa

❌ Voqea joyini tark etmang
❌ Mashinalarni surmang

📞 103 — Tez tibbiy yordam
📞 102 — Militsiya
📞 112 — Yagona qutqaruv`,
            kirill: `🚨 АВАРИЯ — ДАРҲОЛ:

✅ 103 ва 102 га қўнғироқ қилинг
✅ Авария белгисини қўйинг, огоҳлантирувчи чироқни ёқинг
✅ Жабрланганни қимирлатманг — ёнғин хавфи бўлмаса

❌ Воқеа жойини тарк этманг
❌ Машиналарни сурманг

📞 103 — Тез тиббий ёрдам
📞 102 — Милиция
📞 112 — Ягона қутқарув`,
            rus: `🚨 ДТП / АВАРИЯ — СРОЧНО:

✅ Звоните 103 и 102
✅ Поставьте знак аварийной остановки, включите аварийку
✅ Не перемещайте пострадавшего — кроме случая угрозы пожара

❌ Не покидайте место ДТП
❌ Не двигайте автомобили

📞 103 — Скорая помощь
📞 102 — Милиция
📞 112 — Единая служба спасения`,
        },
    },
    // 1.8 DROWNING
    drowning: {
        category: 'drowning',
        level: 1,
        keywords: ['suvga tushdi', "cho'kyapti", 'тонет', 'утонул'],
        templates: {
            lotin: `🚨 DARHOL 103 VA 112 GA QO'NG'IROQ QILING

✅ Suzishni bilmasangiz — suvga tushmang
✅ Suzadigan narsa uloqtiring: kamera, plastik idish, arqon
✅ Qirg'oqdan turib uzatishga harakat qiling

❌ O'zingizni ham xavf ostiga qo'ymang — ikkinchi qurbon bo'lish holati juda ko'p uchraydi

📞 103 — Tez tibbiy yordam
📞 112 — Yagona qutqaruv`,
            kirill: `🚨 ДАРҲОЛ 103 ВА 112 ГА ҚЎНҒИРОҚ ҚИЛИНГ

✅ Сузишни билмасангиз — сувга тушманг
✅ Сузадиган нарса улоқтиринг: камера, пластик идиш, арқон
✅ Қирғоқдан туриб узатишга ҳаракат қилинг

❌ Ўзингизни ҳам хавф остига қўйманг — иккинчи қурбон бўлиш ҳолати жуда кўп учрайди

📞 103 — Тез тиббий ёрдам
📞 112 — Ягона қутқарув`,
            rus: `🚨 СРОЧНО ЗВОНИТЕ 103 И 112

✅ Если не умеете плавать — не бросайтесь в воду
✅ Бросьте плавающий предмет: круг, канистру, веревку
✅ Старайтесь помочь с берега

❌ Не рискуйте собой — не становитесь второй жертвой!

📞 103 — Скорая помощь
📞 112 — Единая служба спасения`,
        },
    },
    // 1.9 CRIME
    crime: {
        category: 'crime',
        level: 1,
        keywords: ["o'g'irlik", 'bosqin', 'urishyapti', 'kaltaklashyapti', 'qurol', 'грабят', 'нападение', 'драка'],
        templates: {
            lotin: `🚨 DARHOL 102 GA QO'NG'IROQ QILING

✅ Xavfsiz joyga o'ting
✅ Qayerdaligingizni aniq ayting
✅ Iloji bo'lsa gaplashib turing

❌ Qarshilik ko'rsatmang, ushlashga urinmang
❌ Narsa uchun tavakkal qilmang

📞 102 — Ichki ishlar
📞 112 — Yagona qutqaruv`,
            kirill: `🚨 ДАРҲОЛ 102 ГА ҚЎНҒИРОҚ ҚИЛИНГ

✅ Хавфсиз жойга ўтинг
✅ Қаердалигингизни аниқ айтинг
✅ Иложи бўлса гаплашиб туринг

❌ Қаршилик кўрсатманг, ушлашга уринманг
❌ Нарса учун таваккал қилманг

📞 102 — Ички ишлар
📞 112 — Ягона қутқарув`,
            rus: `🚨 СРОЧНО ЗВОНИТЕ 102

✅ Отодвиньтесь в безопасное место
✅ Четко сообщите ваше местоположение
✅ По возможности оставайтесь на связи

❌ Не оказывайте сопротивления, не пытайтесь задерживать
❌ Не рискуйте жизнью ради вещей

📞 102 — Милиция
📞 112 — Единая служба спасения`,
        },
    },
    // 1.10 MISSING CHILD
    missing_child: {
        category: 'missing_child',
        level: 1,
        keywords: ['bola yo\'qoldi', 'bola topilmayapti', 'ребенок потерялся', 'пропал ребенок'],
        templates: {
            lotin: `🚨 DARHOL 102 GA QO'NG'IROQ QILING

Kutmang. "O'zi kelib qolar" deb o'ylamang — birinchi soatlar eng muhim.

✅ Bolaning bugungi kiyimini eslab qo'ying
✅ Yaqin surati tayyor tursin
✅ Oxirgi ko'rilgan joyni ayting
✅ Bir kishi uyda qolsin — bola qaytishi mumkin

📞 102 — Ichki ishlar
📞 112 — Yagona qutqaruv`,
            kirill: `🚨 ДАРҲОЛ 102 ГА ҚЎНҒИРОҚ ҚИЛИНГ

Кутманг. "Ўзи келиб қолар" деб ўйламанг — биринчи соатлар энг муҳим.

✅ Боланинг бугунги кийимини эслаб қўйинг
✅ Яқин сурати тайёр турсин
✅ Охирги кўрилган жойни айтинг
✅ Бир киши уйда қолсин — бола қайтиши мумкин

📞 102 — Ички ишлар
📞 112 — Ягона қутқарув`,
            rus: `🚨 СРОЧНО ЗВОНИТЕ 102

Не ждите! Первые часы — самые важные.

✅ Вспомните, во что ребенок был одет сегодня
✅ Приготовьте свежее фото
✅ Назовите последнее место, где его видели
✅ Оставьте одного человека дома — ребенок может вернуться сам

📞 102 — Милиция
📞 112 — Единая служба спасения`,
        },
    },
    // 2.1 WATER PIPE (LEVEL 2)
    water_pipe: {
        category: 'water_pipe',
        level: 2,
        keywords: ['quvur yorildi', 'suv oqyapti', 'suv bosdi', 'труба прорвало', 'затопило'],
        templates: {
            lotin: `💧 SUV AVARIYASI

✅ Kvartira kranini yoping (odatda hammom yoki oshxonada)
✅ Pastdagi qo'shnilarni ogohlantiring
✅ Suv rozetka yoki elektr shchitiga yetayotgan bo'lsa — avtomatni o'chiring

{mahalliy_suv}

Keyin ta'mirlash uchun:
{santexnik_royxati}`,
            kirill: `💧 СУВ АВАРИЯСИ

✅ Квартира кранини ёпинг (одатда ҳаммом ёки ошхонада)
✅ Пастдаги қўшниларни огоҳлантиринг
✅ Сув розетка ёки электр щитига етаётган бўлса — автоматни ўчиринг

{mahalliy_suv}

Кейин таъмирлаш учун:
{santexnik_royxati}`,
            rus: `💧 АВАРИЯ ВОДОПРОВОДА

✅ Перекройте краны в квартире (в ванной или на кухне)
✅ Предупредите соседей снизу
✅ Если вода подбирается к розеткам или щитку — отключите автомат

{mahalliy_suv}

Для ремонта затем:
{santexnik_royxati}`,
        },
    },
    // 2.2 POWER OUTAGE (LEVEL 2)
    power_outage: {
        category: 'power_outage',
        level: 2,
        keywords: ['svet yo\'q', 'elektr yo\'q', 'tok yo\'q', 'света нет', 'отключили свет'],
        templates: {
            lotin: `⚡ ELEKTR YO'Q

✅ Avtomatni tekshiring — o'chib qolgan bo'lishi mumkin
✅ Qo'shnilarda ham yo'qmi — so'rang. Hammada yo'q bo'lsa, bu umumiy uzilish

{mahalliy_elektr}

Faqat sizda bo'lsa, elektrik kerak:
{elektrik_royxati}`,
            kirill: `⚡ ЭЛЕКТР ЁҚ

✅ Автоматни текширинг — ўчиб қолган бўлиши мумкин
✅ Қўшниларда ҳам йўқми — сўранг. Ҳаммада йўқ бўлса, бу умумий узилиш

{mahalliy_elektr}

Фақат сизда бўлса, электрик керак:
{elektrik_royxati}`,
            rus: `⚡ НЕТ ЭЛЕКТРИЧЕСТВА

✅ Проверьте автоматы в щитке — возможно выбило
✅ Спросите соседей. Если нет у всех — это общее отключение

{mahalliy_elektr}

Если нет только у вас, нужен электрик:
{elektrik_royxati}`,
        },
    },
    // 2.3 STUCK ELEVATOR (LEVEL 2)
    stuck_elevator: {
        category: 'stuck_elevator',
        level: 2,
        keywords: ['liftda qoldim', 'lift to\'xtab qoldi', 'застрял в лифте'],
        templates: {
            lotin: `🛗 LIFTDA QOLGANDA

✅ Lift ichidagi qo'ng'iroq tugmasini bosib turing
✅ Tinch turing — havo yetarli bo'ladi
✅ 112 ga qo'ng'iroq qiling

❌ Eshikni ochishga urinmang
❌ Tepaga chiqishga urinmang

📞 112 — Yagona qutqaruv
{mahalliy_hokimiyat}`,
            kirill: `🛗 ЛИФТДА ҚОЛГАНДА

✅ Лифт ичидаги қўнғироқ тугмасини босиб туринг
✅ Тинч туринг — ҳаво етарли бўлади
✅ 112 га қўнғироқ қилинг

❌ Эшикни очишга уринманг
❌ Тепага чиқишга уринманг

📞 112 — Ягона қутқарув
{mahalliy_hokimiyat}`,
            rus: `🛗 ЗАСТРЯЛ В ЛИФТЕ

✅ Нажмите и удерживайте кнопку вызова диспетчера в лифте
✅ Сохраняйте спокойствие — воздуха достаточно
✅ Звоните 112

❌ Не пытайтесь самостоятельно открыть двери
❌ Не пытайтесь вылезти

📞 112 — Единая служба спасения
{mahalliy_hokimiyat}`,
        },
    },
    // 2.4 HEATING ISSUE (LEVEL 2)
    heating_issue: {
        category: 'heating_issue',
        level: 2,
        keywords: ['isitish yo\'q', 'batareya sovuq', 'отопления нет', 'батареи холодные'],
        templates: {
            lotin: `🔥 ISITISH YO'Q

{mahalliy_issiqlik}

Uy ichidagi muammo bo'lsa, usta kerak:
{santexnik_royxati}`,
            kirill: `🔥 ИСИТИШ ЁҚ

{mahalliy_issiqlik}

Уй ичидаги муаммо бўлса, уста керак:
{santexnik_royxati}`,
            rus: `🔥 НЕТ ОТОПЛЕНИЯ

{mahalliy_issiqlik}

Если проблема внутри квартиры, нужен сантехник:
{santexnik_royxati}`,
        },
    },
};
//# sourceMappingURL=templates.js.map