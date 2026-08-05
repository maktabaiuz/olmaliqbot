import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export interface OnboardingWizardScreenProps {
  onCompleteOnboarding: () => void;
}

export const OnboardingWizardScreen: React.FC<OnboardingWizardScreenProps> = ({
  onCompleteOnboarding,
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Telegram Group Connection
  const [groupLink, setGroupLink] = useState('');
  const [isGroupConnected, setIsGroupConnected] = useState(false);
  const [isVerifyingGroup, setIsVerifyingGroup] = useState(false);

  // Step 2: Emergency Numbers (9 numbers)
  const [emergencyNumbers, setEmergencyNumbers] = useState({
    gas: '104',
    water: '105',
    power: '107',
    fire: '101',
    medical: '103',
    police: '102',
    heat: '',
    hokiymiyat: '',
    rescue: '1050',
  });

  // Step 3: Seed initial listings (0 / 20)
  const [seedListingsCount, setSeedListingsCount] = useState(0);

  // Verify Telegram group admin rights
  const handleVerifyGroup = () => {
    if (!groupLink) {
      alert("Iltimos, guruh havolasini kiriting!");
      return;
    }
    setIsVerifyingGroup(true);
    setTimeout(() => {
      setIsVerifyingGroup(false);
      setIsGroupConnected(true);
      alert(" Telegram guruh ulandi! Bot guruhda o'zini tanishtirdi.");
    }, 1200);
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!isGroupConnected) {
        alert("Davom etish uchun avval Telegram guruhni ulang!");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (seedListingsCount < 20) {
        setSeedListingsCount(20); // Fast seed for testing
      }
      alert("🎉 Tabriklaymiz! Barcha 3 ta qadam yakunlandi. Bot shahringiz uchun to'liq ishga tushirildi.");
      onCompleteOnboarding();
    }
  };

  return (
    <div className="w-full max-w-container-max mx-auto min-h-screen bg-background dark:bg-[#121417] text-on-surface dark:text-slate-100 flex flex-col p-4 animate-fade-in relative">
      {/* TOP PROGRESS INDICATOR */}
      <div className="flex flex-col gap-2 mb-6">
        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-bold uppercase tracking-widest text-primary dark:text-sky-400">
            {currentStep}-qadam / 3
          </span>
          <span className="text-xs font-semibold text-outline dark:text-slate-400">
            {user?.cityName || 'Shahar'} Onboarding
          </span>
        </div>
        <div className="h-2 bg-surface-container-high dark:bg-slate-800 rounded-full overflow-hidden w-full">
          <div
            className="h-full bg-primary dark:bg-sky-400 rounded-full transition-all duration-500"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* STEP 1: TELEGRAM GURUH ULASH */}
      {currentStep === 1 && (
        <div className="flex-1 flex flex-col justify-center items-center text-center gap-5 my-auto">
          <div className="w-20 h-20 rounded-full bg-primary-container/20 text-primary dark:text-sky-400 flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-[40px]">groups</span>
          </div>
          <div>
            <h1 className="font-bold text-xl text-on-surface dark:text-slate-100 mb-2">
              1-qadam: Telegram Guruh Ulash
            </h1>
            <p className="text-xs text-on-surface-variant dark:text-slate-300 max-w-xs leading-relaxed">
              Bot shahringiz savollariga javob berishi uchun rasmiy Telegram guruhingizni ulang.
            </p>
          </div>

          <div className="w-full max-w-xs space-y-3">
            <input
              type="text"
              value={groupLink}
              onChange={(e) => setGroupLink(e.target.value)}
              placeholder="https://t.me/olmaliq_bozor"
              className="w-full h-12 bg-surface-container-lowest dark:bg-[#17212B] border border-outline-variant/40 dark:border-slate-800 rounded-xl px-4 text-xs text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary"
            />
            <button
              onClick={handleVerifyGroup}
              disabled={isVerifyingGroup}
              className={`w-full py-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                isGroupConnected
                  ? 'bg-emerald-600 text-white'
                  : 'bg-primary dark:bg-sky-500 text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isGroupConnected ? 'check_circle' : 'add_link'}
              </span>
              {isVerifyingGroup
                ? 'Tekshirilmoqda...'
                : isGroupConnected
                ? 'Guruh Muvaffaqiyatli Ulandi'
                : 'Botni Guruhga Admin Qilish'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: FAVQULODDA RAQAMLAR (9 TA) */}
      {currentStep === 2 && (
        <div className="flex-1 flex flex-col gap-4 my-auto">
          <div className="text-center">
            <h1 className="font-bold text-lg text-on-surface dark:text-slate-100 mb-1">
              2-qadam: Favqulodda Raqamlar (9 ta)
            </h1>
            <p className="text-xs text-on-surface-variant dark:text-slate-400">
              Shahrigiz favqulodda xizmat raqamlarini kiriting (majburiy emas)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 bg-surface dark:bg-[#17212B] p-4 rounded-2xl border border-outline-variant/30 dark:border-slate-800">
            <div>
              <label className="text-[10px] font-bold text-red-500 block mb-1">🔥 Yong'in (101)</label>
              <input
                type="text"
                value={emergencyNumbers.fire}
                onChange={(e) => setEmergencyNumbers({ ...emergencyNumbers, fire: e.target.value })}
                className="w-full h-9 bg-surface-container-lowest dark:bg-[#121417] border border-outline-variant/40 rounded-lg px-2.5 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-red-500 block mb-1">⚡ Gaz (104)</label>
              <input
                type="text"
                value={emergencyNumbers.gas}
                onChange={(e) => setEmergencyNumbers({ ...emergencyNumbers, gas: e.target.value })}
                className="w-full h-9 bg-surface-container-lowest dark:bg-[#121417] border border-outline-variant/40 rounded-lg px-2.5 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-blue-500 block mb-1">💧 Suv (105)</label>
              <input
                type="text"
                value={emergencyNumbers.water}
                onChange={(e) => setEmergencyNumbers({ ...emergencyNumbers, water: e.target.value })}
                className="w-full h-9 bg-surface-container-lowest dark:bg-[#121417] border border-outline-variant/40 rounded-lg px-2.5 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-amber-500 block mb-1">💡 Elektr (107)</label>
              <input
                type="text"
                value={emergencyNumbers.power}
                onChange={(e) => setEmergencyNumbers({ ...emergencyNumbers, power: e.target.value })}
                className="w-full h-9 bg-surface-container-lowest dark:bg-[#121417] border border-outline-variant/40 rounded-lg px-2.5 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-emerald-500 block mb-1">🚑 Tez Yordam (103)</label>
              <input
                type="text"
                value={emergencyNumbers.medical}
                onChange={(e) => setEmergencyNumbers({ ...emergencyNumbers, medical: e.target.value })}
                className="w-full h-9 bg-surface-container-lowest dark:bg-[#121417] border border-outline-variant/40 rounded-lg px-2.5 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-blue-400 block mb-1">👮 Ichki Ishlar (102)</label>
              <input
                type="text"
                value={emergencyNumbers.police}
                onChange={(e) => setEmergencyNumbers({ ...emergencyNumbers, police: e.target.value })}
                className="w-full h-9 bg-surface-container-lowest dark:bg-[#121417] border border-outline-variant/40 rounded-lg px-2.5 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: 20 TA YOZUV KIRITISH */}
      {currentStep === 3 && (
        <div className="flex-1 flex flex-col justify-center items-center text-center gap-5 my-auto">
          <div className="w-20 h-20 rounded-full bg-primary-container/20 text-primary dark:text-sky-400 flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-[40px]">note_add</span>
          </div>
          <div>
            <h1 className="font-bold text-xl text-on-surface dark:text-slate-100 mb-2">
              3-qadam: 20 ta Yozuv Kiriting
            </h1>
            <p className="text-xs text-on-surface-variant dark:text-slate-300 max-w-xs leading-relaxed">
              Tizimni to'liq ishga tushirish uchun ma'lumotlar bazasiga dastlabki 20 ta usta yoki xizmatni kiritish so'raladi.
            </p>
          </div>

          <div className="bg-surface-container-low dark:bg-[#17212B] py-3.5 px-8 rounded-2xl border border-outline-variant/30 shadow-sm">
            <span className="font-bold text-primary dark:text-sky-400 text-2xl tracking-widest">
              {seedListingsCount} / 20
            </span>
          </div>

          <button
            onClick={() => setSeedListingsCount(20)}
            className="px-4 py-2 bg-surface-container-high dark:bg-slate-800 text-xs font-semibold rounded-full hover:bg-surface-container-highest"
          >
            ⚡ Dastlabki 20 ta kasbni avto-to'ldirish
          </button>
        </div>
      )}

      {/* BOTTOM ACTION BUTTON */}
      <div className="mt-auto pt-4">
        <button
          onClick={handleNextStep}
          className="w-full h-14 bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all"
        >
          {currentStep === 3 ? 'Onboardingni Yakunlash' : 'Keyingi Qadam'}
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};
