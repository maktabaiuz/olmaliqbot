import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopHeader } from '../../components/common/TopHeader';

export const SuperAdminOnboardingScreen: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState({
    cityName: '',
    adminPhone: '',
    planType: 'STANDART', // ASOSCHI (149K) | STANDART (299K) | KATTA_SHAHAR (499K)
  });

  const handleNext = () => {
    if (step === 1 && !formData.cityName) {
      alert('Iltimos, shahar nomini kiriting');
      return;
    }
    if (step < 3) setStep((step + 1) as any);
    else {
      alert('Yangi shahar muvaffaqiyatli qo\'shildi va tarif faollashtirildi! 🚀');
      navigate('/superadmin');
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 animate-fade-in max-w-container-max mx-auto">
      <TopHeader title="Yangi Shahar Qo'shish" showBack />

      {/* 3 Step Indicator */}
      <div className="flex items-center justify-around">
        {[
          { num: 1, label: 'Shahar' },
          { num: 2, label: 'Tarif' },
          { num: 3, label: 'Tasdiq' },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-1.5">
            <div
              className={`w-7 h-7 rounded-full text-[12px] font-bold flex items-center justify-center ${
                step >= s.num ? 'bg-gold-start text-white' : 'bg-ios-separator text-tg-textMuted'
              }`}
            >
              {s.num}
            </div>
            <span className={`text-[12px] font-semibold ${step === s.num ? 'text-gold-start' : 'text-tg-textMuted'}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-[#16212F] p-4 rounded-card border border-ios-separator/50 shadow-card flex flex-col gap-3">
        {step === 1 && (
          <>
            <h3 className="font-bold text-[16px]">1-Qadam: Shahar va Admin Ma'lumotlari</h3>
            <div>
              <label className="text-[12px] font-semibold text-tg-textMuted">Shahar Nomi *</label>
              <input
                type="text"
                value={formData.cityName}
                onChange={(e) => setFormData({ ...formData, cityName: e.target.value })}
                placeholder="Masalan: Bekobod, Navoiy..."
                className="w-full mt-1 p-3 rounded-btn bg-tg-bgLight dark:bg-tg-bgDark border border-ios-separator text-[14px]"
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-tg-textMuted">Shahar Adminining Telefon Raqami</label>
              <input
                type="text"
                value={formData.adminPhone}
                onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                placeholder="+998 90 123 45 67"
                className="w-full mt-1 p-3 rounded-btn bg-tg-bgLight dark:bg-tg-bgDark border border-ios-separator text-[14px]"
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h3 className="font-bold text-[16px]">2-Qadam: Obuna Tarifini Tanlang</h3>

            <div className="space-y-3">
              {[
                { id: 'ASOSCHI', name: 'Asoschi Tarifi', price: "149 000 so'm/oy", desc: 'Kichik shaharlar va startaplar uchun' },
                { id: 'STANDART', name: 'Standart Tarif', price: "299 000 so'm/oy", desc: "O'rta shaharlar uchun (Olmaliq, Chirchiq)" },
                { id: 'KATTA_SHAHAR', name: 'Katta Shahar Tarifi', price: "499 000 so'm/oy", desc: 'Cheksiz guruh va kanallar ulanadi' },
              ].map((plan) => {
                const isSelected = formData.planType === plan.id;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setFormData({ ...formData, planType: plan.id })}
                    className={`p-3.5 rounded-card border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-2 border-tg-blue bg-tg-blue/10 shadow-sm'
                        : 'border-ios-separator/60 hover:bg-tg-bgLight dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-[15px]">{plan.name}</h4>
                      <span className="text-[13px] font-extrabold text-tg-blue">{plan.price}</span>
                    </div>
                    <p className="text-[11px] text-tg-textMuted mt-1">{plan.desc}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h3 className="font-bold text-[16px]">3-Qadam: Tasdiqlash</h3>
            <div className="bg-tg-bgLight dark:bg-tg-bgDark p-3 rounded-btn space-y-1.5 text-[13px]">
              <div>Shahar nomi: <strong>{formData.cityName}</strong></div>
              <div>Admin telefoni: <strong>{formData.adminPhone || 'Kiritilmagan'}</strong></div>
              <div>Tanlangan tarif: <strong className="text-tg-blue">{formData.planType}</strong></div>
            </div>
          </>
        )}
      </div>

      <button
        onClick={handleNext}
        className="w-full py-3.5 rounded-btn bg-gold-start text-white font-bold text-[15px] shadow-gold active-scale"
      >
        {step < 3 ? 'Keyingi →' : '✔ Shaharni Yaratish va Faollashtirish'}
      </button>
    </div>
  );
};
