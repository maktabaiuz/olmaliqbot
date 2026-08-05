import React from 'react';

export const AccessDeniedScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 max-w-sm w-full shadow-2xl backdrop-blur-md space-y-4">
        <div className="w-14 h-14 bg-brand-500/10 border border-brand-500/30 rounded-2xl flex items-center justify-center mx-auto text-brand-400 text-3xl shadow-inner">
          🔒
        </div>

        <div>
          <h1 className="text-lg font-bold text-slate-100 mb-1">
            "Kim bor?" — Admin Boshqaruv Paneli
          </h1>
          <p className="text-xs text-brand-400 font-medium">Texnik Topshiriq (TZ.md) bo'yicha</p>
        </div>

        <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-700/80 text-left text-xs space-y-2">
          <p className="text-slate-300 font-semibold flex items-center gap-1.5">
            <span>👥</span> <span>Oddiy aholi uchun:</span>
          </p>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Ilova yuklash yoki menyu bo'ylab yurish shart emas! Telegram guruhda shunchaki savolingizni yozasiz (masalan: <i>"gazavik kerak"</i>), bot 3 soniyada aniq javob beradi.
          </p>
        </div>

        <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-700/80 text-left text-xs space-y-2">
          <p className="text-slate-300 font-semibold flex items-center gap-1.5">
            <span>👑</span> <span>Adminlar uchun:</span>
          </p>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Ushbu panel shahar adminlari va Super-Admin uchun ma'lumotlar bazasi hamda AI boshqaruv panelidir. Admin bo'lsangiz, Telegram ID ingiz kiritilganini tekshiring.
          </p>
        </div>
      </div>
    </div>
  );
};
