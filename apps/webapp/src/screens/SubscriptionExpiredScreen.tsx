import React from 'react';

export const SubscriptionExpiredScreen: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-tg-bgLight dark:bg-tg-bgDark">
      <div className="bg-white dark:bg-[#16212F] p-6 rounded-card border border-ios-red/40 shadow-2xl w-full max-w-sm flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-ios-red/15 text-ios-red flex items-center justify-center">
          <span className="material-symbols-outlined text-[36px]">lock_reset</span>
        </div>

        <div>
          <h2 className="font-extrabold text-[20px] text-ios-red">
            Obuna Muddati Tugadi
          </h2>
          <p className="text-[12px] text-tg-textMuted mt-1">
            Olmaliq shahri uchun obuna to'lovi muddati 14 Avgust 2026 yilda yakunlangan. Admin paneldan foydalanish va bot javoblari uchun to'lovni uzaytiring.
          </p>
        </div>

        <div className="w-full bg-tg-bgLight dark:bg-tg-bgDark p-3 rounded-btn border border-ios-separator text-[12px] space-y-1">
          <div className="flex justify-between"><span>Joriy Tarif:</span> <strong>Standart (299 000 so'm/oy)</strong></div>
          <div className="flex justify-between"><span>Holati:</span> <strong className="text-ios-red">Muddati o'tgan</strong></div>
        </div>

        <button
          onClick={() => alert("To'lov yo'riqnomasi va Payme/Click havolasi botingizga yuborildi")}
          className="w-full py-3 rounded-btn bg-ios-red text-white font-bold text-[14px] shadow-sm active-scale"
        >
          💳 Obunani Uzaytirish va To'lash
        </button>
      </div>
    </div>
  );
};
