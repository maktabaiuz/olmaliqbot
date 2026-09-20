import React from 'react';

export const AccessDeniedScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-ios-bg text-ios-label flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-sm space-y-4">
        <div className="w-16 h-16 bg-ios-blue/10 rounded-full flex items-center justify-center mx-auto text-ios-blue">
          <span className="material-symbols-outlined text-[30px]">lock</span>
        </div>

        <div>
          <h1 className="text-[20px] font-semibold text-ios-label mb-1">
            "Kim bor?" — Admin Boshqaruv Paneli
          </h1>
          <p className="text-[13px] text-ios-blue font-medium">Kirish huquqi cheklangan</p>
        </div>

        <div className="bg-ios-card rounded-ios-lg p-4 text-left text-[13px] space-y-1.5 shadow-sm">
          <p className="text-ios-label font-medium flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-ios-blue">group</span>
            <span>Oddiy aholi uchun:</span>
          </p>
          <p className="text-ios-label-secondary/70 leading-relaxed">
            Ilova yuklash yoki menyu bo'ylab yurish shart emas! Telegram guruhda shunchaki savolingizni yozasiz (masalan: <i>"gazavik kerak"</i>), bot 3 soniyada aniq javob beradi.
          </p>
        </div>

        <div className="bg-ios-card rounded-ios-lg p-4 text-left text-[13px] space-y-1.5 shadow-sm">
          <p className="text-ios-label font-medium flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-ios-orange">shield_person</span>
            <span>Adminlar uchun:</span>
          </p>
          <p className="text-ios-label-secondary/70 leading-relaxed">
            Ushbu panel shahar adminlari va Super-Admin uchun ma'lumotlar bazasi hamda AI boshqaruv panelidir. Admin bo'lsangiz, Telegram ID ingiz kiritilganini tekshiring.
          </p>
        </div>
      </div>
    </div>
  );
};
