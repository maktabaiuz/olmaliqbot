import React from 'react';

export const PendingLockScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-8 max-w-sm w-full shadow-2xl backdrop-blur-md space-y-4">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400 text-3xl shadow-inner animate-pulse">
          ⏳
        </div>

        <h1 className="text-xl font-bold text-slate-100">
          Arizangiz ko'rib chiqilmoqda
        </h1>

        <p className="text-slate-300 text-sm leading-relaxed">
          1 kun ichida javob beramiz.<br />
          Tasdiqlangach panel ochiladi.
        </p>

        <div className="pt-2">
          <div className="bg-slate-900/80 rounded-xl p-3.5 border border-slate-800 text-xs text-slate-400 text-left space-y-1.5">
            <div className="flex items-center gap-2 text-brand-400 font-semibold">
              <span>ℹ️</span> <span>Holat bo'yicha:</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Super-Admin guruh va kanal ma'lumotlarini tekshirgach, Telegram botingizga avtomatik tasdiqlash bildirishnomasi yuboriladi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
