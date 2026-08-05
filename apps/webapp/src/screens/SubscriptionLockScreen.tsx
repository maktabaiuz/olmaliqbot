import React from 'react';

export interface SubscriptionLockScreenProps {
  cityName: string;
  onRenewPayment: () => void;
}

export const SubscriptionLockScreen: React.FC<SubscriptionLockScreenProps> = ({
  cityName,
  onRenewPayment,
}) => {
  return (
    <div className="w-full max-w-container-max mx-auto min-h-screen bg-background dark:bg-[#121417] text-on-surface dark:text-slate-100 flex flex-col justify-center items-center text-center p-6 animate-fade-in relative">
      <div className="w-24 h-24 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center mb-6 shadow-xl border border-red-500/30">
        <span className="material-symbols-outlined text-[48px]">lock</span>
      </div>

      <h1 className="font-bold text-2xl text-on-surface dark:text-slate-100 mb-2">
        Obuna Tugadi
      </h1>

      <p className="text-sm text-on-surface-variant dark:text-slate-300 max-w-xs mb-4 leading-relaxed">
        <b>{cityName}</b> shahri uchun xizmat ko'rsatish obuna muddati yakunlandi. Telegram bot va admin paneli vaqtincha muzlatildi.
      </p>

      <div className="bg-surface-container-low dark:bg-[#17212B] p-4 rounded-2xl border border-outline-variant/30 dark:border-slate-800 text-xs text-on-surface-variant dark:text-slate-400 mb-8 max-w-xs">
        🛡️ <b>Bazangiz 60 kun xavfsiz saqlanadi</b>
        <br />
        To'lov amalga oshirilishi bilan barcha ustalar va bot xizmati bir zumda qayta tiklanadi.
      </div>

      <button
        onClick={onRenewPayment}
        className="w-full max-w-xs h-14 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm rounded-xl shadow-lg hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-[20px]">credit_card</span>
        Obunani Yangilash (To'lov Kiritish)
      </button>
    </div>
  );
};
