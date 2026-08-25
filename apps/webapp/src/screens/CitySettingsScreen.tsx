import React, { useState } from 'react';

export interface CitySettingsScreenProps {
  cityName?: string;
  onNavigateScreen?: (screen: string) => void;
  onBack: () => void;
}

export const CitySettingsScreen: React.FC<CitySettingsScreenProps> = ({
  cityName = 'Olmaliq',
  onNavigateScreen,
  onBack,
}) => {
  const [botLanguage, setBotLanguage] = useState<'AUTO' | 'LATIN' | 'CYRILLIC' | 'RUSSIAN'>('AUTO');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [notificationsOnlyDowntime, setNotificationsOnlyDowntime] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);
  const [toast, setToast] = useState<string | null>(null);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case 'LATIN': return 'O\'zbek (Lotin)';
      case 'CYRILLIC': return 'O\'zbek (Kirill)';
      case 'RUSSIAN': return 'Русский';
      default: return 'Avtomatik (Savol tilida)';
    }
  };

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
            <h1 className="font-bold text-base text-on-surface dark:text-slate-100">
              Shahar Sozlamalari
            </h1>
            <p className="text-[11px] text-on-surface-variant dark:text-slate-400">
              {cityName} shahri bot parametrlari
            </p>
          </div>
        </div>
      </header>

      {/* SETTINGS GROUPED LIST */}
      <main className="p-4 space-y-4 animate-fadeIn">
        {/* GROUP 1: INTEGRATSIYA & MULOQOT */}
        <section className="bg-surface-container-lowest dark:bg-[#17212B] rounded-2xl border border-outline-variant/30 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-outline-variant/20 dark:border-slate-800/80 bg-surface-container-low/40 dark:bg-slate-800/30">
            <h2 className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">
              Integratsiya & Muloqot
            </h2>
          </div>

          {/* 1. GURUH VA KANAL */}
          <div className="p-4 border-b border-outline-variant/20 dark:border-slate-800/60 flex items-center justify-between hover:bg-surface-container-low/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">groups</span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-on-surface dark:text-slate-100">Guruh va Kanal</h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Olmaliq Chat · Ulangan
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-[20px] text-slate-500">check_circle</span>
          </div>

          {/* 2. FAVQULODDA RAQAMLAR */}
          <button
            onClick={() => onNavigateScreen && onNavigateScreen('emergency')}
            className="w-full p-4 border-b border-outline-variant/20 dark:border-slate-800/60 flex items-center justify-between hover:bg-surface-container-low/20 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">emergency</span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-on-surface dark:text-slate-100">Favqulodda Raqamlar</h3>
                <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-0.5">
                  9 ta xizmat raqami kiritilgan
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-[20px] text-slate-500">chevron_right</span>
          </button>

          {/* 3. BOT TILI */}
          <button
            onClick={() => setShowLanguageModal(true)}
            className="w-full p-4 flex items-center justify-between hover:bg-surface-container-low/20 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:text-sky-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">translate</span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-on-surface dark:text-slate-100">Bot Tili</h3>
                <p className="text-xs text-primary dark:text-sky-400 font-semibold mt-0.5">
                  {getLanguageLabel(botLanguage)}
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-[20px] text-slate-500">unfold_more</span>
          </button>
        </section>

        {/* GROUP 2: XODIMLAR & OBUNA */}
        <section className="bg-surface-container-lowest dark:bg-[#17212B] rounded-2xl border border-outline-variant/30 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-outline-variant/20 dark:border-slate-800/80 bg-surface-container-low/40 dark:bg-slate-800/30">
            <h2 className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">
              Xodimlar & Obuna
            </h2>
          </div>

          {/* 4. MODERATORLAR */}
          <button
            onClick={() => onNavigateScreen && onNavigateScreen('moderators')}
            className="w-full p-4 border-b border-outline-variant/20 dark:border-slate-800/60 flex items-center justify-between hover:bg-surface-container-low/20 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">badge</span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-on-surface dark:text-slate-100">Moderatorlar</h3>
                <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-0.5">
                  2 ta xodim biriktirilgan
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-[20px] text-slate-500">chevron_right</span>
          </button>

          {/* 5. OBUNA HOLATI */}
          <button
            onClick={() => onNavigateScreen && onNavigateScreen('subscription')}
            className="w-full p-4 flex items-center justify-between hover:bg-surface-container-low/20 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">workspace_premium</span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-on-surface dark:text-slate-100">Obuna Holati</h3>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                  31.08.2026 gacha faol (Standart tarif)
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-[20px] text-slate-500">chevron_right</span>
          </button>
        </section>

        {/* GROUP 3: BILDIRISHNOMALAR & AI PARAMETRLARI */}
        <section className="bg-surface-container-lowest dark:bg-[#17212B] rounded-2xl border border-outline-variant/30 dark:border-slate-800 p-4 space-y-4 shadow-sm">
          <h2 className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">
            AI & Bildirishnomalar
          </h2>

          {/* BILDIRISHNOMALAR TOGGLE */}
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <h3 className="font-bold text-sm text-on-surface dark:text-slate-100">Shoshilinch Bildirishnomalar</h3>
              <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-0.5">
                Faqat bot faoliyati to'xtaganda yoki favqulodda so'rov tushganda
              </p>
            </div>
            <button
              onClick={() => {
                setNotificationsOnlyDowntime(!notificationsOnlyDowntime);
                showToastMsg('Bildirishnoma sozlamasi yangilandi');
              }}
              className={`w-12 h-7 rounded-full transition-colors relative p-0.5 ${
                notificationsOnlyDowntime ? 'bg-primary' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white transition-transform ${
                  notificationsOnlyDowntime ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="border-t border-outline-variant/20 dark:border-slate-800 pt-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm text-on-surface dark:text-slate-100">
                AI Sezgichlik Chegarasi (Confidence)
              </h3>
              <span className="font-mono text-xs font-bold text-primary dark:text-sky-400 bg-primary/10 px-2 py-0.5 rounded">
                {confidenceThreshold}
              </span>
            </div>
            <input
              type="range"
              min="0.6"
              max="0.9"
              step="0.05"
              value={confidenceThreshold}
              onChange={e => {
                setConfidenceThreshold(parseFloat(e.target.value));
                showToastMsg(`AI sezgichligi ${e.target.value} ga o'zgartirildi`);
              }}
              className="w-full accent-primary cursor-pointer"
            />
            <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1">
              0.7 dan past ishonchdagi so'rovlarda bot guruhda jim turadi (TZ 3.2 qoidasi).
            </p>
          </div>
        </section>
      </main>

      {/* LANGUAGE SELECTOR MODAL */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-3xl p-5 w-full max-w-sm space-y-3 shadow-2xl animate-scale-up">
            <h3 className="font-bold text-base text-on-surface dark:text-slate-100 mb-2">
              Bot Javob Tilini Tanlang
            </h3>

            {[
              { id: 'AUTO', label: 'Avtomatik (Savol berilgan tilda)' },
              { id: 'LATIN', label: 'O\'zbekcha (Lotin)' },
              { id: 'CYRILLIC', label: 'Ўзбекча (Кирилл)' },
              { id: 'RUSSIAN', label: 'Русский' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setBotLanguage(item.id as any);
                  setShowLanguageModal(false);
                  showToastMsg(`Bot tili "${item.label}" ga o'tkazildi`);
                }}
                className={`w-full text-left p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between border transition-all ${
                  botLanguage === item.id
                    ? 'bg-primary/10 border-primary text-primary dark:text-sky-400 font-bold'
                    : 'bg-surface-container-low dark:bg-slate-800/60 border-slate-700 text-slate-200'
                }`}
              >
                {item.label}
                {botLanguage === item.id && (
                  <span className="material-symbols-outlined text-[18px]">check</span>
                )}
              </button>
            ))}

            <button
              onClick={() => setShowLanguageModal(false)}
              className="w-full mt-2 py-3 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Yopish
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
