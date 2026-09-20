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
    <div className="w-full max-w-container-max mx-auto min-h-screen bg-ios-bg text-ios-label flex flex-col justify-center items-center text-center p-6">
      <div className="w-20 h-20 rounded-full bg-ios-red/10 text-ios-red flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-[36px]">lock</span>
      </div>

      <h1 className="font-semibold text-[22px] text-ios-label mb-2">
        Obuna Tugadi
      </h1>

      <p className="text-[15px] text-ios-label-secondary/70 max-w-xs mb-4 leading-relaxed">
        <b className="text-ios-label">{cityName}</b> shahri uchun xizmat ko'rsatish obuna muddati yakunlandi. Telegram bot va admin paneli vaqtincha muzlatildi.
      </p>

      <div className="bg-ios-card p-4 rounded-ios-lg text-[13px] text-ios-label-secondary/70 mb-8 max-w-xs shadow-sm">
        🛡️ <b className="text-ios-label">Bazangiz 60 kun xavfsiz saqlanadi</b>
        <br />
        To'lov amalga oshirilishi bilan barcha ustalar va bot xizmati bir zumda qayta tiklanadi.
      </div>

      <button
        onClick={onRenewPayment}
        className="w-full max-w-xs h-13 py-3.5 bg-ios-blue text-white font-medium text-[16px] rounded-ios active:opacity-70 transition-opacity flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-[18px]">credit_card</span>
        Obunani Yangilash
      </button>
    </div>
  );
};
