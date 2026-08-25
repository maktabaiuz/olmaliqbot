import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

interface SettingsLanguageThemeScreenProps {
  onBack: () => void;
}

export const SettingsLanguageThemeScreen: React.FC<SettingsLanguageThemeScreenProps> = ({ onBack }) => {
  const { theme, setTheme } = useTheme();
  
  // Settings values (prefilled or dummy)
  const [botLang, setBotLang] = useState<'uz_latin' | 'uz_cyril' | 'ru' | 'auto'>('uz_latin');
  const [interfaceLang, setInterfaceLang] = useState<'uz' | 'ru'>('uz');

  const handleSave = () => {
    alert("Sozlamalar saqlandi! ✅");
    onBack();
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in pb-16">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-on-surface dark:text-slate-100 font-bold active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px] font-bold">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-bold text-on-surface dark:text-slate-100">Til & Mavzu</h1>
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Tizim tili va interfeys sozlamalari</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Bot Response Language */}
        <section className="flex flex-col gap-2">
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">Bot javob tili</h3>
          <div className="bg-surface dark:bg-[#17212B] rounded-2xl border border-outline-variant/30 dark:border-slate-800 shadow-sm overflow-hidden p-4 space-y-3">
            {[
              { id: 'uz_latin', label: "O'zbekcha (Lotin) 🇺🇿" },
              { id: 'uz_cyril', label: "Ўзбекча (Кирилл) 🇺🇿" },
              { id: 'ru', label: 'Русский 🇷🇺' },
              { id: 'auto', label: 'Avtomatik (Mijoz tiliga mos)' },
            ].map((opt) => (
              <label key={opt.id} className="flex items-center justify-between cursor-pointer py-1.5">
                <span className="text-xs text-on-surface dark:text-slate-100">{opt.label}</span>
                <input
                  type="radio"
                  name="bot_lang"
                  checked={botLang === opt.id}
                  onChange={() => setBotLang(opt.id as any)}
                  className="w-4 h-4 text-primary focus:ring-primary dark:bg-slate-800"
                />
              </label>
            ))}
          </div>
        </section>

        {/* Interface Theme */}
        <section className="flex flex-col gap-2">
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">Interfeys ko'rinishi</h3>
          <div className="bg-surface dark:bg-[#17212B] rounded-2xl border border-outline-variant/30 dark:border-slate-800 shadow-sm overflow-hidden p-4 space-y-3">
            {[
              { id: 'light', label: 'Kunduzgi rejim (Light) ☀️' },
              { id: 'dark', label: 'Tungi rejim (Dark) 🌙' },
            ].map((opt) => (
              <label key={opt.id} className="flex items-center justify-between cursor-pointer py-1.5">
                <span className="text-xs text-on-surface dark:text-slate-100">{opt.label}</span>
                <input
                  type="radio"
                  name="theme"
                  checked={theme === opt.id}
                  onChange={() => setTheme(opt.id as any)}
                  className="w-4 h-4 text-primary focus:ring-primary dark:bg-slate-800"
                />
              </label>
            ))}
          </div>
        </section>

        {/* Panel Language */}
        <section className="flex flex-col gap-2">
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">Interfeys tili</h3>
          <div className="bg-surface dark:bg-[#17212B] rounded-2xl border border-outline-variant/30 dark:border-slate-800 shadow-sm overflow-hidden p-4 space-y-3">
            {[
              { id: 'uz', label: "O'zbekcha" },
              { id: 'ru', label: 'Русский' },
            ].map((opt) => (
              <label key={opt.id} className="flex items-center justify-between cursor-pointer py-1.5">
                <span className="text-xs text-on-surface dark:text-slate-100">{opt.label}</span>
                <input
                  type="radio"
                  name="interface_lang"
                  checked={interfaceLang === opt.id}
                  onChange={() => setInterfaceLang(opt.id as any)}
                  className="w-4 h-4 text-primary focus:ring-primary dark:bg-slate-800"
                />
              </label>
            ))}
          </div>
        </section>
      </div>

      <button
        onClick={handleSave}
        className="w-full py-3.5 bg-gradient-to-r from-[#2AABEE] to-[#0088CC] text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all"
      >
        Saqlash & Yangilash
      </button>
    </div>
  );
};
