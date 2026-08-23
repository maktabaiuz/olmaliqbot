import React, { useState, useEffect } from 'react';
import { TopHeader } from '../components/common/TopHeader';
import { API_BASE_URL } from '../config';

export interface AddListingScreenProps {
  onNavigateTab?: (tab: string) => void;
  initialCategoryName?: string;
}

export const AddListingScreen: React.FC<AddListingScreenProps> = ({
  onNavigateTab,
  initialCategoryName = '',
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState({
    name: '',
    categoryName: initialCategoryName,
    phone: '',
    landmarkName: '',
    workFrom: '08:00',
    workTo: '20:00',
    badges: [] as string[],
    approxPrice: '',
  });

  const [saving, setSaving] = useState<boolean>(false);
  const [successBanner, setSuccessBanner] = useState<string>('');
  const [step1Error, setStep1Error] = useState<string>('');

  useEffect(() => {
    if (initialCategoryName) {
      setFormData((prev) => ({ ...prev, categoryName: initialCategoryName }));
    }
  }, [initialCategoryName]);

  const updateField = (field: string, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    localStorage.setItem('kimbor_add_listing_draft', JSON.stringify(updated));
  };

  const goToStep = (targetStep: 1 | 2 | 3) => {
    if (targetStep > 1 && step === 1) {
      if (!formData.name || !formData.categoryName || !formData.phone || !formData.landmarkName) {
        setStep1Error("Iltimos, barcha majburiy (*) maydonlarni to'ldiring");
        return;
      }
      setStep1Error('');
    }
    setStep(targetStep);
  };

  const toggleBadge = (badge: string) => {
    const exists = formData.badges.includes(badge);
    const updatedBadges = exists
      ? formData.badges.filter((b) => b !== badge)
      : [...formData.badges, badge];
    updateField('badges', updatedBadges);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.categoryName || !formData.phone) {
      alert('Iltimos, barcha majburiy (*) maydonlarni to meyorltiring');
      return;
    }

    setSaving(true);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch(`${API_BASE_URL}/admin/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': initData,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        localStorage.removeItem('kimbor_add_listing_draft');
        setSuccessBanner("Yangi yozuv muvaffaqiyatli saqlandi va bazaga qo'shildi! ✅");

        // Clear form
        setFormData({
          name: '',
          categoryName: '',
          phone: '',
          landmarkName: '',
          workFrom: '08:00',
          workTo: '20:00',
          badges: [],
          approxPrice: '',
        });
        setStep(1);

        setTimeout(() => {
          if (onNavigateTab) onNavigateTab('database');
        }, 800);
      } else {
        alert('Saqlashda xatolik yuz berdi');
      }
    } catch (err) {
      alert('Tarmoq xatoligi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-24 animate-fade-in max-w-container-max mx-auto">
      <TopHeader
        title="Yangi yozuv qo'shish"
        rightAction={
          <button
            type="button"
            onClick={() => onNavigateTab?.('home')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-ios-gray hover:bg-ios-sep dark:hover:bg-slate-800 active:bg-ios-sep transition-colors"
            title="Yopish"
            aria-label="Yopish"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        }
      />

      {successBanner && (
        <div className="mx-4 p-3 bg-ios-green/15 text-ios-green border border-ios-green/30 text-[13px] font-bold rounded-btn text-center">
          {successBanner}
        </div>
      )}

      {/* 3 Step Wizard Numbers Bar */}
      <div className="px-4 text-[11px] font-semibold text-ios-gray">{step}-qadam / 3</div>
      <div className="px-4 flex items-center justify-between -mt-2">
        {[
          { num: 1, title: '1 Asosiy' },
          { num: 2, title: '2 Belgilar' },
          { num: 3, title: '3 Tasdiq' },
        ].map((s) => {
          const isDone = step > s.num;
          const isCurrent = step === s.num;
          return (
            <div
              key={s.num}
              onClick={() => goToStep(s.num as 1 | 2 | 3)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div
                className={`w-7 h-7 rounded-full text-[12px] font-bold flex items-center justify-center transition-all ${
                  isDone
                    ? 'bg-ios-green text-white'
                    : isCurrent
                    ? 'bg-tg text-white shadow-fab'
                    : 'bg-ios-sep dark:bg-slate-800 text-ios-gray'
                }`}
              >
                {isDone ? '✓' : s.num}
              </div>
              <span className={`text-[12px] font-semibold ${isCurrent ? 'text-tg font-bold' : 'text-ios-gray'}`}>
                {s.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Form Content Card */}
      <div className="px-4">
        <div className="bg-white dark:bg-[#16212F] p-4 rounded-card border border-ios-sep dark:border-ios-darkSeparator shadow-card flex flex-col gap-3">
          {step === 1 && (
            <>
              <h3 className="font-bold text-[16px]">1-Qadam: Asosiy Ma'lumotlar</h3>
              <div>
                <label className="text-[12px] font-semibold text-ios-gray">Ism va Sharifi *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Masalan: Usta Alisher"
                  className="w-full mt-1 p-3 rounded-btn bg-ios-bg dark:bg-[#0E141B] border border-ios-sep text-[14px]"
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-ios-gray">Kasbi / Xizmati *</label>
                <input
                  type="text"
                  value={formData.categoryName}
                  onChange={(e) => updateField('categoryName', e.target.value)}
                  placeholder="Masalan: Gazavik, Kafelchi..."
                  className="w-full mt-1 p-3 rounded-btn bg-ios-bg dark:bg-[#0E141B] border border-ios-sep text-[14px]"
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-ios-gray">Telefon raqami *</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full mt-1 p-3 rounded-btn bg-ios-bg dark:bg-[#0E141B] border border-ios-sep text-[14px] font-mono"
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-ios-gray">Mo'ljal *</label>
                <input
                  type="text"
                  value={formData.landmarkName}
                  onChange={(e) => updateField('landmarkName', e.target.value)}
                  placeholder="Masalan: Korzinka atrofi"
                  className="w-full mt-1 p-3 rounded-btn bg-ios-bg dark:bg-[#0E141B] border border-ios-sep text-[14px]"
                />
              </div>

              {step1Error && (
                <div className="p-2.5 bg-ios-red/15 text-ios-red border border-ios-red/30 text-[12px] font-bold rounded-btn">
                  {step1Error}
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="font-bold text-[16px]">2-Qadam: Belgilar va Ish Vaqti</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[12px] font-semibold text-ios-gray">Ish boshlanishi</label>
                  <input
                    type="time"
                    value={formData.workFrom}
                    onChange={(e) => updateField('workFrom', e.target.value)}
                    className="w-full mt-1 p-2.5 rounded-btn bg-ios-bg dark:bg-[#0E141B] border border-ios-sep text-[14px]"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-ios-gray">Ish tugashi</label>
                  <input
                    type="time"
                    value={formData.workTo}
                    onChange={(e) => updateField('workTo', e.target.value)}
                    className="w-full mt-1 p-2.5 rounded-btn bg-ios-bg dark:bg-[#0E141B] border border-ios-sep text-[14px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-semibold text-ios-gray mb-1.5 block">Xususiyat belgilari:</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'uyga_boradi', label: '🏡 Uyga boradi' },
                    { id: 'kafolat', label: '🛡 Kafolat' },
                    { id: '24_7', label: '🌙 24/7' },
                    { id: 'karta_qabul_qiladi', label: '💳 Karta' },
                    { id: 'zudlik_bilan', label: '⚡ Zudlik' },
                    { id: 'ruscha', label: '🗣 Ruscha' },
                  ].map((chip) => {
                    const isSelected = formData.badges.includes(chip.id);
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => toggleBadge(chip.id)}
                        className={`px-3 py-1.5 rounded-pill text-[12px] font-semibold ${
                          isSelected ? 'bg-tg text-white' : 'bg-ios-bg dark:bg-[#0E141B] text-ios-gray'
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="font-bold text-[16px]">3-Qadam: Tasdiqlash</h3>
              <div className="bg-ios-bg dark:bg-[#0E141B] p-3 rounded-btn text-[13px] space-y-1">
                <div>Ism: <strong>{formData.name}</strong></div>
                <div>Kasb: <strong>{formData.categoryName}</strong></div>
                <div>Telefon: <strong className="text-tg font-mono">{formData.phone}</strong></div>
                <div>Mo'ljal: <strong>{formData.landmarkName}</strong></div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 mt-4">
          {step > 1 && (
            <button
              onClick={() => setStep((step - 1) as any)}
              className="flex-1 py-3 rounded-btn bg-ios-sep text-tg-textLight font-bold"
            >
              ← Orqaga
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => goToStep((step + 1) as 1 | 2 | 3)}
              className="flex-1 py-3 rounded-btn bg-tg text-white font-bold shadow-fab"
            >
              Keyingi →
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-btn bg-ios-green text-white font-bold shadow-fab"
            >
              {saving ? 'Saqlanmoqda...' : '✔ Saqlash'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
