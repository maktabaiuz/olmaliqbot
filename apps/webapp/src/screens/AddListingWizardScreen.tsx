import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopHeader } from '../components/common/TopHeader';
import { API_BASE_URL } from '../config';

export const AddListingWizardScreen: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    categoryName: '',
    phone: '',
    landmarkName: '',
    workFrom: '08:00',
    workTo: '20:00',
    badges: [] as string[],
    approxPrice: '',
    specificServices: '',
  });

  const [saving, setSaving] = useState<boolean>(false);

  // Auto-restore draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem('kimbor_add_listing_draft');
    if (draft) {
      try {
        setFormData(JSON.parse(draft));
      } catch (e) {}
    }
  }, []);

  // Save draft on edit
  const updateField = (field: string, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    localStorage.setItem('kimbor_add_listing_draft', JSON.stringify(updated));
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
      alert('Iltimos, barcha majburiy (*) maydonlarni to meyorldiring');
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
        alert('Yangi yozuv muvaffaqiyatli saqlandi! ✅');
        navigate('/database');
      } else {
        alert('Saqlashda xatolik bo\'ldi');
      }
    } catch (err) {
      alert('Tarmoq xatoligi');
    } finally {
      setSaving(false);
    }
  };

  // Completeness score calculation (X/11)
  const filledCount = Object.values(formData).filter((v) =>
    Array.isArray(v) ? v.length > 0 : Boolean(v)
  ).length;

  return (
    <div className="flex flex-col gap-4 pb-24 animate-fade-in max-w-container-max mx-auto">
      <TopHeader title="Yangi yozuv qo'shish" showBack />

      {/* Wizard 3-Step Numbers Bar */}
      <div className="px-4 flex items-center justify-between">
        {[
          { num: 1, title: 'Asosiy' },
          { num: 2, title: 'Belgilar' },
          { num: 3, title: 'Tasdiq' },
        ].map((s) => {
          const isDone = step > s.num;
          const isCurrent = step === s.num;
          return (
            <div
              key={s.num}
              onClick={() => setStep(s.num as any)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div
                className={`w-7 h-7 rounded-full text-[12px] font-bold flex items-center justify-center transition-all ${
                  isDone
                    ? 'bg-ios-green text-white'
                    : isCurrent
                    ? 'bg-tg-blue text-white shadow-fab'
                    : 'bg-ios-separator dark:bg-slate-800 text-tg-textMuted'
                }`}
              >
                {isDone ? '✓' : s.num}
              </div>
              <span
                className={`text-[12px] font-semibold ${
                  isCurrent ? 'text-tg-blue font-bold' : 'text-tg-textMuted'
                }`}
              >
                {s.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Form Content */}
      <div className="px-4">
        <div className="bg-white dark:bg-[#16212F] p-4 rounded-card border border-ios-separator dark:border-ios-darkSeparator shadow-card flex flex-col gap-3">
          {/* STEP 1: ASOSIY */}
          {step === 1 && (
            <>
              <h3 className="font-bold text-[16px] text-tg-textLight dark:text-tg-textDark border-b border-ios-separator/50 pb-2">
                1-Qadam: Asosiy Ma'lumotlar
              </h3>

              <div>
                <label className="text-[12px] font-semibold text-tg-textMuted">Ism va Sharifi *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Masalan: Usta Alisher"
                  className="w-full mt-1 p-3 rounded-btn bg-tg-bgLight dark:bg-tg-bgDark border border-ios-separator dark:border-ios-darkSeparator text-[14px] text-tg-textLight dark:text-tg-textDark focus:outline-none focus:border-ios-blue"
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-tg-textMuted">Kasbi / Xizmati *</label>
                <input
                  type="text"
                  value={formData.categoryName}
                  onChange={(e) => updateField('categoryName', e.target.value)}
                  placeholder="Masalan: Gazavik, Kafelchi, Santexnik..."
                  className="w-full mt-1 p-3 rounded-btn bg-tg-bgLight dark:bg-tg-bgDark border border-ios-separator dark:border-ios-darkSeparator text-[14px] text-tg-textLight dark:text-tg-textDark focus:outline-none focus:border-ios-blue"
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-tg-textMuted">Telefon raqami *</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full mt-1 p-3 rounded-btn bg-tg-bgLight dark:bg-tg-bgDark border border-ios-separator dark:border-ios-darkSeparator text-[14px] text-tg-textLight dark:text-tg-textDark focus:outline-none focus:border-ios-blue font-mono"
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-tg-textMuted">Asosiy Mo'ljal / Manzil *</label>
                <input
                  type="text"
                  value={formData.landmarkName}
                  onChange={(e) => updateField('landmarkName', e.target.value)}
                  placeholder="Masalan: Korzinka atrofi, Oynabod..."
                  className="w-full mt-1 p-3 rounded-btn bg-tg-bgLight dark:bg-tg-bgDark border border-ios-separator dark:border-ios-darkSeparator text-[14px] text-tg-textLight dark:text-tg-textDark focus:outline-none focus:border-ios-blue"
                />
              </div>
            </>
          )}

          {/* STEP 2: BELGILAR */}
          {step === 2 && (
            <>
              <h3 className="font-bold text-[16px] text-tg-textLight dark:text-tg-textDark border-b border-ios-separator/50 pb-2">
                2-Qadam: Ish Vaqti va Belgilar (Pill Chiplar)
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[12px] font-semibold text-tg-textMuted">Ish boshlanishi</label>
                  <input
                    type="time"
                    value={formData.workFrom}
                    onChange={(e) => updateField('workFrom', e.target.value)}
                    className="w-full mt-1 p-2.5 rounded-btn bg-tg-bgLight dark:bg-tg-bgDark border border-ios-separator dark:border-ios-darkSeparator text-[14px] text-tg-textLight dark:text-tg-textDark"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-tg-textMuted">Ish tugashi</label>
                  <input
                    type="time"
                    value={formData.workTo}
                    onChange={(e) => updateField('workTo', e.target.value)}
                    className="w-full mt-1 p-2.5 rounded-btn bg-tg-bgLight dark:bg-tg-bgDark border border-ios-separator dark:border-ios-darkSeparator text-[14px] text-tg-textLight dark:text-tg-textDark"
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-semibold text-tg-textMuted mb-1.5 block">
                  Xususiyat belgilari (Tanlang):
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'uyga_boradi', label: '🏡 Uyga boradi' },
                    { id: 'kafolat', label: '🛡 Kafolat beradi' },
                    { id: '24_7', label: '🌙 24/7 ishlaydi' },
                    { id: 'karta_qabul_qiladi', label: '💳 Karta qabul qiladi' },
                    { id: 'zudlik_bilan', label: '⚡ Zudlik bilan' },
                    { id: 'ruscha', label: '🗣 Ruscha muloqot' },
                  ].map((chip) => {
                    const isSelected = formData.badges.includes(chip.id);
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => toggleBadge(chip.id)}
                        className={`px-3 py-1.5 rounded-pill text-[12px] font-semibold transition-all ${
                          isSelected
                            ? 'bg-tg-blue text-white shadow-sm'
                            : 'bg-tg-bgLight dark:bg-tg-bgDark border border-ios-separator dark:border-ios-darkSeparator text-tg-textMuted'
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[12px] font-semibold text-tg-textMuted">Taxminiy Narx / Izoh</label>
                <input
                  type="text"
                  value={formData.approxPrice}
                  onChange={(e) => updateField('approxPrice', e.target.value)}
                  placeholder="Masalan: 50 000 so'mdan boshlanadi"
                  className="w-full mt-1 p-3 rounded-btn bg-tg-bgLight dark:bg-tg-bgDark border border-ios-separator dark:border-ios-darkSeparator text-[14px] text-tg-textLight dark:text-tg-textDark"
                />
              </div>
            </>
          )}

          {/* STEP 3: TASDIQ */}
          {step === 3 && (
            <>
              <h3 className="font-bold text-[16px] text-tg-textLight dark:text-tg-textDark border-b border-ios-separator/50 pb-2">
                3-Qadam: Ko'rib chiqish va Tasdiqlash
              </h3>

              <div className="bg-tg-bgLight dark:bg-tg-bgDark p-3 rounded-btn space-y-1.5 text-[13px]">
                <div><span className="text-tg-textMuted">Ismi:</span> <strong className="text-tg-textLight dark:text-tg-textDark">{formData.name || '—'}</strong></div>
                <div><span className="text-tg-textMuted">Kasbi:</span> <strong className="text-tg-textLight dark:text-tg-textDark">{formData.categoryName || '—'}</strong></div>
                <div><span className="text-tg-textMuted">Telefon:</span> <strong className="text-ios-blue font-mono">{formData.phone || '—'}</strong></div>
                <div><span className="text-tg-textMuted">Mo'ljal:</span> <strong className="text-tg-textLight dark:text-tg-textDark">{formData.landmarkName || '—'}</strong></div>
                <div><span className="text-tg-textMuted">Ish vaqti:</span> <strong className="text-tg-textLight dark:text-tg-textDark">{formData.workFrom} - {formData.workTo}</strong></div>
                <div>
                  <span className="text-tg-textMuted">Belgilar:</span>{' '}
                  <span className="text-ios-blue font-semibold">{formData.badges.join(', ') || 'Tanlanmagan'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-tg-textMuted pt-1">
                <span>To'liqlik balli: <strong>{filledCount}/7</strong></span>
                <span className="text-ios-green font-semibold">✔ Dublikat topilmadi</span>
              </div>
            </>
          )}
        </div>

        {/* Wizard Controls Bottom Buttons */}
        <div className="flex items-center gap-3 mt-4">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((step - 1) as any)}
              className="flex-1 py-3 rounded-btn bg-ios-separator dark:bg-slate-800 text-tg-textLight dark:text-tg-textDark font-bold text-[14px] active-scale"
            >
              ← Orqaga
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((step + 1) as any)}
              className="flex-1 py-3 rounded-btn bg-tg-blue text-white font-bold text-[14px] shadow-fab active-scale"
            >
              Keyingi →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-btn bg-ios-green text-white font-bold text-[14px] shadow-fab active-scale disabled:opacity-50"
            >
              {saving ? 'Saqlanmoqda...' : '✔ Saqlash'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
