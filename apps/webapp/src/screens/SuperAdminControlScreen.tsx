import React, { useState } from 'react';

export interface SuperAdminControlScreenProps {
  onBackToDashboard: () => void;
}

export type ControlSection = 'menu' | 'cities' | 'applications' | 'payments' | 'stats' | 'dictionary' | 'bot_messages';

export const SuperAdminControlScreen: React.FC<SuperAdminControlScreenProps> = ({
  onBackToDashboard,
}) => {
  const [activeSection, setActiveSection] = useState<ControlSection>('menu');
  const [selectedCityForDetail, setSelectedCityForDetail] = useState<any | null>(null);

  // Cities Data State
  const [cities] = useState([
    {
      id: 'city-1',
      name: 'Olmaliq',
      status: 'ACTIVE',
      listingsCount: 247,
      dailyQuestions: 42,
      accuracyRate: 98.5,
      expiryDate: '2026-12-31',
      adminName: 'Bobur Admin',
      botStatus: 'Faol',
    },
    {
      id: 'city-2',
      name: 'Chirchiq',
      status: 'ACTIVE',
      listingsCount: 118,
      dailyQuestions: 19,
      accuracyRate: 96.0,
      expiryDate: '2026-10-15',
      adminName: 'Sardor',
      botStatus: 'Faol',
    },
    {
      id: 'city-3',
      name: 'Angren',
      status: 'ONBOARDING',
      listingsCount: 5,
      dailyQuestions: 0,
      accuracyRate: 100,
      expiryDate: '2026-09-01',
      adminName: 'Jasur',
      botStatus: 'Sozlanmoqda',
    },
  ]);

  // Applications State
  const [applications, setApplications] = useState([
    {
      id: 'app-1',
      applicantName: 'Davron Bekmirzayev',
      cityName: 'Buka',
      groupTitle: 'Buka Bozor & Elonlar',
      memberCount: 8450,
      isAdminVerified: true,
      paymentStatus: 'TO\'LANGAN',
      selfDescription: 'Buka tumanidagi eng katta Telegram guruh egasiman.',
    },
    {
      id: 'app-2',
      applicantName: 'Otabek Qo\'shqarov',
      cityName: 'Bekobod',
      groupTitle: 'Bekobod Yoshlari',
      memberCount: 12100,
      isAdminVerified: true,
      paymentStatus: 'TO\'LANGAN',
      selfDescription: 'Bekobod shahri bo\'yicha botni ishga tushirmoqchiman.',
    },
  ]);
  const [currentAppIndex] = useState(0);

  // Subscriptions & Payment History Sub-tab
  const [paymentSubTab, setPaymentSubTab] = useState<'subscriptions' | 'history'>('subscriptions');

  // Bot Messages Tab State
  const [selectedBotMessageLang, setSelectedBotMessageLang] = useState<'lotin' | 'cyrl' | 'rus'>('lotin');
  const [emergencyTemplates, setEmergencyTemplates] = useState([
    {
      id: 'em-1',
      key: 'gas_leak',
      name: '⚠️ Gaz hidi / Sizib chiqishi',
      textLotin: `🚨 XAVFSIZLIK YO'RIQNOMASI:\n1. Gaz kranini zudlik bilan yoping!\n2. Oynalarni oching, gugurt/svetchani yoqmang!\n\n📞 Shahar gaz xizmati: 104`,
      textCyrl: `🚨 ХАВФСИЗЛИК ЙЎРИҚНОМАСИ:\n1. Газ кранини зудлик билан ёпинг!\n\n📞 Шаҳар газ хизмати: 104`,
      textRus: `🚨 ИНСТРУКЦИЯ БЕЗОПАСНОСТИ:\n1. Срочно перекройте газ!\n\n📞 Служба газа: 104`,
      isEmergency: true,
    },
    {
      id: 'em-2',
      key: 'fire',
      name: "🔥 Yong'in shoshilinch xizmati",
      textLotin: `🚨 YONG'IN XAVFI:\n1. Bino ichidan darhol tashqariga chiqing!\n\n📞 Yong'in xavfsizligi: 101`,
      textCyrl: `🚨 ЁНҒИН ХАВФИ:\n1. Бино ичидан дарҳол ташқарига чиқинг!\n\n📞 Ёнғин хавфсизлиги: 101`,
      textRus: `🚨 ПОЖАРНАЯ БЕЗОПАСНОСТЬ:\n1. Немедленно покиньте здание!\n\n📞 Пожарная служба: 101`,
      isEmergency: true,
    },
  ]);

  // Handle Approve Application
  const handleApproveApp = (appId: string) => {
    alert("Ariza muvaffaqiyatli tasdiqlandi! Shahar yaratildi hamda login/parol login ma'lumotlari yuborildi.");
    setApplications(applications.filter((a) => a.id !== appId));
  };

  // Handle Reject Application (Refund trigger)
  const handleRejectApp = (appId: string) => {
    alert("Ariza rad etildi. To'lov avtomatik ravishda foydalanuvchiga qaytarildi (Refund).");
    setApplications(applications.filter((a) => a.id !== appId));
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in pb-10">
      {/* CONTROL TOP BAR */}
      <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-3">
        <button
          onClick={() => {
            if (selectedCityForDetail) setSelectedCityForDetail(null);
            else if (activeSection === 'menu') onBackToDashboard();
            else setActiveSection('menu');
          }}
          className="p-1.5 rounded-full text-primary dark:text-sky-400 hover:bg-surface-container-high dark:hover:bg-slate-800 transition-colors"
          title="Orqaga"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <h1 className="font-bold text-lg text-on-surface dark:text-slate-100">
          {selectedCityForDetail ? `${selectedCityForDetail.name} — Tafsilotlar` : (
            <>
              {activeSection === 'menu' && 'Boshqaruv (Super Admin)'}
              {activeSection === 'cities' && 'Shaharlar Boshqaruvi'}
              {activeSection === 'applications' && 'Yangi Arizalar'}
              {activeSection === 'payments' && 'To\'lovlar va Obunalar'}
              {activeSection === 'stats' && 'Platforma Statistikalari'}
              {activeSection === 'dictionary' && 'Kategoriyalar va Lug\'at'}
              {activeSection === 'bot_messages' && 'Bot Matnlari (Xavfsizlik)'}
            </>
          )}
        </h1>
      </div>

      {/* SECTION 1: MENU OVERVIEW */}
      {activeSection === 'menu' && (
        <div className="bg-surface dark:bg-[#17212B] rounded-2xl border border-outline-variant/30 dark:border-slate-800 overflow-hidden shadow-sm divide-y divide-outline-variant/20 dark:divide-slate-800">
          {/* Row 1: Shaharlar */}
          <button
            onClick={() => setActiveSection('cities')}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-container-low dark:hover:bg-slate-800/60 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌍</span>
              <div className="flex flex-col">
                <span className="font-bold text-sm text-on-surface dark:text-slate-100">Shaharlar</span>
                <span className="text-xs text-on-surface-variant dark:text-slate-400 mt-0.5">
                  {cities.length} ta · {cities.filter((c) => c.status === 'ONBOARDING').length} sozlanmoqda
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-outline dark:text-slate-500">chevron_right</span>
          </button>

          {/* Row 2: Arizalar */}
          <button
            onClick={() => setActiveSection('applications')}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-container-low dark:hover:bg-slate-800/60 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📄</span>
              <span className="font-bold text-sm text-on-surface dark:text-slate-100">Arizalar</span>
            </div>
            <div className="flex items-center gap-2">
              {applications.length > 0 && (
                <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  {applications.length} ta yangi
                </span>
              )}
              <span className="material-symbols-outlined text-outline dark:text-slate-500">chevron_right</span>
            </div>
          </button>

          {/* Row 3: To'lovlar */}
          <button
            onClick={() => setActiveSection('payments')}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-container-low dark:hover:bg-slate-800/60 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">💳</span>
              <span className="font-bold text-sm text-on-surface dark:text-slate-100">To'lovlar</span>
            </div>
            <span className="material-symbols-outlined text-outline dark:text-slate-500">chevron_right</span>
          </button>

          {/* Row 4: Umumiy statistika */}
          <button
            onClick={() => setActiveSection('stats')}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-container-low dark:hover:bg-slate-800/60 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <span className="font-bold text-sm text-on-surface dark:text-slate-100">Umumiy statistika</span>
            </div>
            <span className="material-symbols-outlined text-outline dark:text-slate-500">chevron_right</span>
          </button>

          {/* Row 5: Kategoriyalar va lug'at */}
          <button
            onClick={() => setActiveSection('dictionary')}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-container-low dark:hover:bg-slate-800/60 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏷️</span>
              <span className="font-bold text-sm text-on-surface dark:text-slate-100">Kategoriyalar va lug'at</span>
            </div>
            <span className="material-symbols-outlined text-outline dark:text-slate-500">chevron_right</span>
          </button>

          {/* Row 6: Bot matnlari */}
          <button
            onClick={() => setActiveSection('bot_messages')}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-container-low dark:hover:bg-slate-800/60 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">💬</span>
              <span className="font-bold text-sm text-on-surface dark:text-slate-100">Bot matnlari</span>
            </div>
            <span className="material-symbols-outlined text-outline dark:text-slate-500">chevron_right</span>
          </button>
        </div>
      )}

      {/* SECTION 2: SHAHARLAR LIST & DETAIL */}
      {activeSection === 'cities' && (
        <div className="space-y-4">
          {selectedCityForDetail ? (
            <div className="space-y-4">
              {/* City detail header summary */}
              <div className="bg-surface dark:bg-[#17212B] p-4 rounded-2xl border border-outline-variant/30 dark:border-slate-800 shadow-sm space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-base text-on-surface dark:text-slate-100">{selectedCityForDetail.name}</h3>
                  <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded-full">Faol</span>
                </div>
                <div className="text-xs text-slate-500 space-y-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <div>Admin: <span className="font-bold text-on-surface dark:text-slate-100">{selectedCityForDetail.adminName}</span></div>
                  <div>Obuna tugash sanasi: <span className="font-bold text-on-surface dark:text-slate-100">{selectedCityForDetail.expiryDate}</span></div>
                  <div>Jami yozuvlar: <span className="font-bold text-on-surface dark:text-slate-100">{selectedCityForDetail.listingsCount} ta</span></div>
                </div>
              </div>

              {/* Connected Groups/Channels */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">Ulangan guruh va kanallar</h4>
                
                {/* Channel card 1 */}
                <div className="bg-surface dark:bg-[#17212B] p-4 rounded-2xl border border-outline-variant/30 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-xs text-on-surface dark:text-slate-100">{selectedCityForDetail.name} Bozor & E'lonlar</h5>
                      <span className="text-[10px] text-sky-500 font-semibold">@olmaliq_bozor</span>
                    </div>
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-full">
                      Guruh
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <div>A'zolar soni: <span className="font-bold text-on-surface dark:text-slate-200">14,240 ta</span></div>
                    <div>Oydagi savollar: <span className="font-bold text-on-surface dark:text-slate-200">920 ta</span></div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Bot holati: Admin ✅ / Izoh ✅
                  </div>
                </div>

                {/* Channel card 2 */}
                <div className="bg-surface dark:bg-[#17212B] p-4 rounded-2xl border border-outline-variant/30 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-xs text-on-surface dark:text-slate-100">{selectedCityForDetail.name} Kunlik Yangiliklar</h5>
                      <span className="text-[10px] text-sky-500 font-semibold">@olmaliq_news</span>
                    </div>
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-full">
                      Kanal
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <div>A'zolar soni: <span className="font-bold text-on-surface dark:text-slate-200">8,100 ta</span></div>
                    <div>Oydagi savollar: <span className="font-bold text-on-surface dark:text-slate-200">310 ta</span></div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500">
                    <span className="material-symbols-outlined text-[16px]">warning</span>
                    Bot holati: Izoh berilmagan ⚠️
                  </div>
                </div>

                <button
                  onClick={() => alert("Yangi guruh/kanal ulash so'rovi yuborildi 📡")}
                  className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-on-surface dark:text-slate-100 font-bold text-xs rounded-xl border border-outline-variant/30 dark:border-slate-800 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  ＋ Yangi guruh/kanal ulash
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {cities.map((city) => (
                <div
                  key={city.id}
                  onClick={() => setSelectedCityForDetail(city)}
                  className="bg-surface dark:bg-[#17212B] p-4 rounded-2xl border border-outline-variant/30 dark:border-slate-800 shadow-sm space-y-2 relative overflow-hidden cursor-pointer hover:scale-[1.01] transition-transform"
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      city.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <div className="flex items-center justify-between pl-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-on-surface dark:text-slate-100">{city.name}</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          city.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {city.status === 'ACTIVE' ? 'Faol' : 'Sozlanmoqda'}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-primary dark:text-sky-400">{city.adminName}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs text-on-surface-variant dark:text-slate-400 pl-2 pt-1">
                    <div>
                      <span className="block font-bold text-on-surface dark:text-slate-200">{city.listingsCount} ta</span>
                      yozuvlar
                    </div>
                    <div>
                      <span className="block font-bold text-on-surface dark:text-slate-200">{city.dailyQuestions} ta</span>
                      kunlik savol
                    </div>
                    <div>
                      <span className="block font-bold text-on-surface dark:text-slate-200">{city.accuracyRate}%</span>
                      aniqlik
                    </div>
                  </div>

                  <div className="pl-2 pt-2 text-[11px] text-outline dark:text-slate-500 border-t border-outline-variant/20 flex items-center justify-between">
                    <span>Obuna muddati: {city.expiryDate}</span>
                    <span>Bot: <b>{city.botStatus}</b></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: ARIZALAR REVIEW CARD */}
      {activeSection === 'applications' && (
        <div className="space-y-4">
          {applications.length === 0 ? (
            <div className="bg-surface dark:bg-[#17212B] p-8 rounded-2xl border border-outline-variant/30 text-center text-xs text-on-surface-variant">
              Hozircha yangi arizalar mavjud emas.
            </div>
          ) : (
            (() => {
              const currentApp = applications[currentAppIndex] || applications[0];
              return (
                <div className="bg-surface dark:bg-[#17212B] p-5 rounded-2xl border border-outline-variant/30 dark:border-slate-800 shadow-md space-y-4">
                  <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                    <span className="text-xs font-bold text-primary dark:text-sky-400">
                      Ariza: {currentAppIndex + 1} / {applications.length}
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      {currentApp.paymentStatus}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-outline dark:text-slate-400 block">Ariza topshiruvchi:</span>
                      <p className="font-bold text-sm text-on-surface dark:text-slate-100">{currentApp.applicantName}</p>
                    </div>

                    <div>
                      <span className="text-outline dark:text-slate-400 block">Shahar:</span>
                      <p className="font-semibold text-on-surface dark:text-slate-200">{currentApp.cityName}</p>
                    </div>

                    <div>
                      <span className="text-outline dark:text-slate-400 block">Telegram Guruh:</span>
                      <p className="font-semibold text-primary dark:text-sky-400">{currentApp.groupTitle} ({currentApp.memberCount} a'zo)</p>
                    </div>

                    <div>
                      <span className="text-outline dark:text-slate-400 block">Izoh / O'zi haqida:</span>
                      <p className="italic text-on-surface dark:text-slate-300">"{currentApp.selfDescription}"</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => handleApproveApp(currentApp.id)}
                      className="flex-1 py-3 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-emerald-700 transition-colors"
                    >
                      Tasdiqlash
                    </button>
                    <button
                      onClick={() => handleRejectApp(currentApp.id)}
                      className="flex-1 py-3 bg-error text-white font-bold text-xs rounded-xl shadow-md hover:bg-red-600 transition-colors"
                    >
                      Rad etish (Refund)
                    </button>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* SECTION 4: TO'LOVLAR & OBUNALAR */}
      {activeSection === 'payments' && (
        <div className="space-y-4">
          <div className="flex bg-surface dark:bg-[#17212B] p-1 rounded-xl border border-outline-variant/30">
            <button
              onClick={() => setPaymentSubTab('subscriptions')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                paymentSubTab === 'subscriptions'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant dark:text-slate-400'
              }`}
            >
              Obunalar
            </button>
            <button
              onClick={() => setPaymentSubTab('history')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                paymentSubTab === 'history'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant dark:text-slate-400'
              }`}
            >
              To'lovlar Tarixi
            </button>
          </div>

          {paymentSubTab === 'subscriptions' ? (
            <div className="space-y-3">
              {/* 7 Days Expiry Reminder Alert */}
              <div className="bg-amber-500/15 border border-amber-500/40 p-3.5 rounded-xl text-xs text-amber-700 dark:text-amber-300 font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">notifications_active</span>
                Eslatma: Angren shahri obunasi tugashiga 7 kun qoldi!
              </div>

              {cities.map((c) => (
                <div key={c.id} className="bg-surface dark:bg-[#17212B] p-4 rounded-xl border border-outline-variant/30 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-sm text-on-surface dark:text-slate-100">{c.name}</h4>
                    <p className="text-outline dark:text-slate-400">Tugash sanasi: {c.expiryDate}</p>
                  </div>
                  <span className="font-bold text-emerald-500">Faol Obuna</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="bg-surface dark:bg-[#17212B] p-3 rounded-xl border border-outline-variant/30 flex justify-between">
                <span>Olmaliq — Yillik Obuna</span>
                <span className="font-bold text-emerald-500">+1 200 000 UZS</span>
              </div>
              <div className="bg-surface dark:bg-[#17212B] p-3 rounded-xl border border-outline-variant/30 flex justify-between">
                <span>Chirchiq — Oylik Obuna</span>
                <span className="font-bold text-emerald-500">+150 000 UZS</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: BOT MATNLARI (EMERGENCY TEMPLATES) */}
      {activeSection === 'bot_messages' && (
        <div className="space-y-4">
          <div className="flex bg-surface dark:bg-[#17212B] p-1 rounded-xl border border-outline-variant/30">
            {(['lotin', 'cyrl', 'rus'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedBotMessageLang(lang)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg uppercase transition-all ${
                  selectedBotMessageLang === lang
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant dark:text-slate-400'
                }`}
              >
                {lang === 'lotin' ? "O'zbek (Lotin)" : lang === 'cyrl' ? "Ўзбек (Кирилл)" : "Русский"}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {emergencyTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-surface dark:bg-[#17212B] p-4 rounded-xl border border-red-500/40 shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-red-500">{template.name}</h4>
                  <span className="bg-red-500/20 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    FAVQULODDA (O'CHMAYDI)
                  </span>
                </div>

                <textarea
                  value={
                    selectedBotMessageLang === 'lotin'
                      ? template.textLotin
                      : selectedBotMessageLang === 'cyrl'
                      ? template.textCyrl
                      : template.textRus
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setEmergencyTemplates(
                      emergencyTemplates.map((t) =>
                        t.id === template.id
                          ? {
                              ...t,
                              ...(selectedBotMessageLang === 'lotin' && { textLotin: val }),
                              ...(selectedBotMessageLang === 'cyrl' && { textCyrl: val }),
                              ...(selectedBotMessageLang === 'rus' && { textRus: val }),
                            }
                          : t
                      )
                    );
                  }}
                  rows={4}
                  className="w-full bg-surface-container-lowest dark:bg-[#121417] border border-outline-variant/40 dark:border-slate-800 rounded-xl p-3 text-xs text-on-surface dark:text-slate-100 font-mono resize-none focus:outline-none focus:border-red-500"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
