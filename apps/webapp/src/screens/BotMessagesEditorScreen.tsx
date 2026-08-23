import React, { useState } from 'react';

export interface BotMessagesEditorScreenProps {
  onBack: () => void;
}

interface MessageTemplate {
  id: string;
  category: 'reply' | 'emergency' | 'other';
  title: string;
  latin: string;
  cyrillic: string;
  russian: string;
}

export const BotMessagesEditorScreen: React.FC<BotMessagesEditorScreenProps> = ({ onBack }) => {
  const [activeCategory, setActiveCategory] = useState<'reply' | 'emergency' | 'other'>('reply');
  const [activeLang, setActiveLang] = useState<'latin' | 'cyrillic' | 'russian'>('latin');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('single_listing_reply');
  const [toast, setToast] = useState<string | null>(null);

  const [templates, setTemplates] = useState<MessageTemplate[]>([
    {
      id: 'single_listing_reply',
      category: 'reply',
      title: 'Bitta Usta Javobi',
      latin: `🔧 {kasb}\n\n{ism} ✅ ⭐{reyting}\n📍 {moljal}\n🏷 {belgilar}\n📞 {telefon}\n\n[Yana 2 tasini ko'rish]\n\n🕐 Bu xabar 15 daqiqada o'chadi`,
      cyrillic: `🔧 {kasb}\n\n{ism} ✅ ⭐{reyting}\n📍 {moljal}\n🏷 {belgilar}\n📞 {telefon}\n\n[Яна 2 таsini кўриш]\n\n🕐 Бу хабар 15 дақиқада ўчади`,
      russian: `🔧 {kasb}\n\n{ism} ✅ ⭐{reyting}\n📍 {moljal}\n🏷 {belgilar}\n📞 {telefon}\n\n[Посмотреть еще 2]\n\n🕐 Это сообщение удалится через 15 минут`,
    },
    {
      id: 'gas_leak_emergency',
      category: 'emergency',
      title: '🔴 1.1 Gaz Hidi (Avariya)',
      latin: `🚨 GAZ HIDI — DARHOL:\n\n❌ Chiroq, gugurt, zajigalka — yoqmang\n❌ Vyklyuchatel, rozetka, telefonga tegmang\n❌ Liftga kirmang\n\n✅ Derazalarni keng oching\n✅ Gaz kranini yoping\n✅ Uydan chiqing\n✅ Qo'ng'iroqni tashqaridan qiling\n\n📞 104 — Gaz avariya xizmati\n📞 112 — Yagona qutqaruv\n📞 {mahalliy_gaz}\n\nUsta emas — avval avariya xizmatini chaqiring.`,
      cyrillic: `🚨 ГАЗ ХИДИ — ДАРҲОЛ:\n\n❌ Чироқ, гугурт — ёқманг\n❌ Включатель, розеткага тегманг\n❌ Лифтга кирманг\n\n✅ Деразаларни кенг очинг\n✅ Газ кранини ёпинг\n✅ Уйдан чиқинг\n\n📞 104 — Газ авария хизмати\n📞 112 — Ягона қутқарув\n📞 {mahalliy_gaz}`,
      russian: `🚨 ЗАПАХ ГАЗА — СРОЧНО:\n\n❌ Не включайте свет и спички\n❌ Не трогайте розетки и телефон\n❌ Не пользуйтесь лифтом\n\n✅ Откройте окна\n✅ Перекройте газ\n✅ Выйдите из помещения\n\n📞 104 — Аварийная газовая служба\n📞 112 — Единая служба спасения`,
    },
    {
      id: 'fire_emergency',
      category: 'emergency',
      title: '🔴 1.2 Yong\'in',
      latin: `🚨 YONG'IN — DARHOL:\n\n✅ Hammani uyg'oting, tashqariga chiqing\n✅ Chiqayotganda eshiklarni yopib boring\n✅ Liftdan foydalanmang — zinadan tushing\n✅ Qo'ng'iroqni xavfsiz joydan qiling\n\n❌ Narsa yig'ib o'tirmang\n❌ Katta olovni o'zingiz o'chirishga urinmang\n\n📞 101 — Yong'in xavfsizligi\n📞 112 — Yagona qutqaruv`,
      cyrillic: `🚨 ЁНҒИН — ДАРҲОЛ:\n\n✅ Ҳаммани уйғотинг, ташқарига чиқинг\n✅ Зинадан тушинг, лифтга кирманг\n\n📞 101 — Ёнғин хавфсизлиги\n📞 112 — Ягона қутқарув`,
      russian: `🚨 ПОЖАР — СРОЧНО:\n\n✅ Разбудите всех, выходите на улицу\n✅ Спускайтесь по лестнице\n\n📞 101 — Пожарная служба\n📞 112 — Единая спасательная служба`,
    },
    {
      id: 'water_leak_emergency',
      category: 'emergency',
      title: '🟠 2.1 Quvur Yorildi (Suv)',
      latin: `💧 SUV AVARIYASI:\n\n✅ Kvartira kranini yoping\n✅ Pastdagi qo'shnilarni ogohlantiring\n✅ Suv elektr shchitiga yetayotgan bo'lsa — avtomatni o'chiring\n\n📞 {mahalliy_suv} — Suv ta'minoti avariya xizmati\n\nKeyin ta'mirlash uchun:\n{santexnik_royxati}`,
      cyrillic: `💧 СУВ АВАРИЯСИ:\n\n✅ Квартира кранини ёпинг\n✅ Пастдаги қўшниларни огоҳлантиринг\n\n📞 {mahalliy_suv} — Сув таъминоти\n\nТаъмирлаш учун:\n{santexnik_royxati}`,
      russian: `💧 АВАРИЯ ВОДОПРОВОДА:\n\n✅ Перекройте кран в квартире\n✅ Предупредите соседей снизу\n\n📞 {mahalliy_suv} — Аварийная водоканала\n\nДля ремонта:\n{santexnik_royxati}`,
    },
    {
      id: 'not_found_private',
      category: 'other',
      title: "Lichkada Ma'lumot Yo'q",
      latin: `Kechirasiz, bu bo'yicha bazamizda hali tasdiqlangan ma'lumot yo'q.\n\nAdminlarga so'rov yuborildi. Ishonchli usta topilsa, tez orada qo'shiladi!`,
      cyrillic: `Кечирасиз, бу бўйича базамизда ҳали тасдиқланган маълумот йўқ.\n\nАдминларга сўров юборилди.`,
      russian: `Извините, по вашему запросу проверенной информации пока нет.\n\nЗапрос передан администраторам.`,
    },
  ]);

  const currentTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdateText = (val: string) => {
    setTemplates(prev =>
      prev.map(t => (t.id === selectedTemplateId ? { ...t, [activeLang]: val } : t))
    );
  };

  const insertToken = (token: string) => {
    const currentText = currentTemplate[activeLang];
    handleUpdateText(currentText + ' ' + token);
    showToastMsg(`"${token}" tokeni qo'shildi`);
  };

  const currentTextValue = currentTemplate[activeLang];

  // Substitute sample tokens for live Telegram preview
  const livePreview = currentTextValue
    .replace(/\{kasb\}/g, 'Gazavik')
    .replace(/\{ism\}/g, 'Bahrom')
    .replace(/\{telefon\}/g, '+998 90 123 45 67')
    .replace(/\{moljal\}/g, 'Korzinka orqasi')
    .replace(/\{reyting\}/g, '4.8')
    .replace(/\{belgilar\}/g, 'Uyga boradi · Kafolat')
    .replace(/\{mahalliy_gaz\}/g, '+998 71 234 56 78')
    .replace(/\{mahalliy_suv\}/g, '+998 71 987 65 43')
    .replace(/\{santexnik_royxati\}/g, '1. Alisher (+998 91 111 22 33)');

  return (
    <div className="min-h-screen bg-background dark:bg-[#121417] text-on-surface dark:text-slate-100 font-sans flex flex-col relative pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-full shadow-2xl border border-slate-700">
          {toast}
        </div>
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-surface/95 dark:bg-[#17212B]/95 backdrop-blur-md border-b border-outline-variant/30 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-xl hover:bg-surface-container-low dark:hover:bg-slate-800 text-on-surface-variant dark:text-slate-300 transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          <div>
            <h1 className="font-bold text-base text-on-surface dark:text-slate-100 flex items-center gap-2">
              Bot Matnlari & Shablonlar
              <span className="bg-purple-500/20 text-purple-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                Super-Admin
              </span>
            </h1>
            <p className="text-[11px] text-on-surface-variant dark:text-slate-400">
              Bot beradigan barcha xabarlar tahrirchisi
            </p>
          </div>
        </div>

        <button
          onClick={() => showToastMsg('✅ Barcha matnlar saqlandi!')}
          className="bg-primary text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-md"
        >
          Saqlash
        </button>
      </header>

      {/* CATEGORY TABS (JAVOBLAR / FAVQULODDA / BOSHQA) */}
      <div className="px-4 py-2.5 bg-surface dark:bg-[#17212B] border-b border-outline-variant/30 dark:border-slate-800 flex items-center gap-2">
        {[
          { id: 'reply', label: 'Javoblar' },
          { id: 'emergency', label: '🚨 Favqulodda (1-2 Daraja)' },
          { id: 'other', label: 'Boshqa Xabarlar' },
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              setActiveCategory(cat.id as any);
              const firstInCat = templates.find(t => t.category === cat.id);
              if (firstInCat) setSelectedTemplateId(firstInCat.id);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
              activeCategory === cat.id
                ? cat.id === 'emergency'
                  ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-md'
                  : 'bg-primary text-white border-primary shadow-md'
                : 'bg-surface-container-low dark:bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <main className="p-4 space-y-4 animate-fadeIn">
        {/* TEMPLATE LIST SELECTOR */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {templates
            .filter(t => t.category === activeCategory)
            .map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplateId(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  selectedTemplateId === t.id
                    ? 'bg-sky-500/20 text-sky-400 border-sky-500 font-bold'
                    : 'bg-surface-container-lowest dark:bg-[#17212B] text-slate-400 border-slate-800'
                }`}
              >
                {t.title}
              </button>
            ))}
        </div>

        {/* LANGUAGE SELECTOR TABS */}
        <div className="bg-surface-container-lowest dark:bg-[#17212B] rounded-2xl p-1.5 border border-outline-variant/30 dark:border-slate-800 flex">
          {[
            { id: 'latin', label: 'O\'zbek (Lotin)' },
            { id: 'cyrillic', label: 'Ўзбекcha (Kirill)' },
            { id: 'russian', label: 'Русский' },
          ].map(lang => (
            <button
              key={lang.id}
              onClick={() => setActiveLang(lang.id as any)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                activeLang === lang.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {/* TOKEN CHIPS INSERTION */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Dinamik Tokenlar (Bosib joylashtiring):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {['{kasb}', '{ism}', '{telefon}', '{moljal}', '{reyting}', '{belgilar}', '{mahalliy_gaz}', '{mahalliy_suv}'].map(tok => (
              <button
                key={tok}
                onClick={() => insertToken(tok)}
                className="bg-purple-500/15 text-purple-300 hover:bg-purple-500/30 text-xs font-mono px-2.5 py-1 rounded-lg border border-purple-500/30 transition-colors"
              >
                + {tok}
              </button>
            ))}
          </div>
        </div>

        {/* TEXTAREA EDITOR */}
        <div className="bg-surface-container-lowest dark:bg-[#17212B] rounded-2xl p-4 border border-outline-variant/30 dark:border-slate-800 space-y-2">
          <label className="block text-xs font-bold text-slate-300">
            Shablon Matni ({currentTemplate.title})
          </label>
          <textarea
            rows={7}
            value={currentTextValue}
            onChange={e => handleUpdateText(e.target.value)}
            className="w-full bg-surface-container-low dark:bg-[#1C2733] border border-slate-700 rounded-xl p-3.5 text-xs text-slate-100 font-mono outline-none focus:border-primary resize-none leading-relaxed"
          />
        </div>

        {/* LIVE TELEGRAM PREVIEW BUBBLE */}
        <div className="bg-surface-container-lowest dark:bg-[#17212B] rounded-2xl p-4 border border-outline-variant/30 dark:border-slate-800 space-y-2">
          <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">visibility</span>
            Jonli Telegram Natija Ko'rinishi
          </span>

          <div className="bg-[#182533] rounded-2xl p-4 text-xs font-sans text-slate-100 shadow-md border border-slate-800/80 whitespace-pre-wrap leading-relaxed">
            {livePreview}
          </div>
        </div>
      </main>
    </div>
  );
};
