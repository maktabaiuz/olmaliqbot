import React, { useState, useEffect } from 'react';

export interface EmergencyNumbersScreenProps {
  cityName?: string;
  onBack: () => void;
}

// Har bir maydon botning shablon matnidagi {mahalliy_...} o'rniga aynan
// shu tartibda qo'yiladi — kalitlar backend (AppSetting) va bot
// (getEmergencyLocalNumbers) bilan bir xil bo'lishi SHART.
const FIELDS: { key: string; label: string; help: string; placeholder: string }[] = [
  {
    key: 'emergency_mahalliy_gaz',
    label: 'Gaz idorasi (mahalliy)',
    help: "Gaz hidi/avariyasida 104 va 112 dan keyin ko'rsatiladigan shahar gaz xizmati raqami",
    placeholder: '+998 70 xxx xx xx',
  },
  {
    key: 'emergency_mahalliy_suv',
    label: "Suv ta'minoti (mahalliy)",
    help: 'Quvur yorilishi, issiq/sovuq suv yo\'qligida ko\'rsatiladigan suv avariya xizmati raqami',
    placeholder: '+998 70 xxx xx xx',
  },
  {
    key: 'emergency_mahalliy_elektr',
    label: 'Elektr tarmoqlari (mahalliy)',
    help: "Tok urishi va elektr avariyasida ko'rsatiladigan mahalliy elektr xizmati raqami",
    placeholder: '+998 70 xxx xx xx',
  },
  {
    key: 'emergency_mahalliy_issiqlik',
    label: "Issiqlik ta'minoti (mahalliy)",
    help: "Isitish yo'qligida ko'rsatiladigan issiqlik tarmog'i raqami",
    placeholder: '+998 70 xxx xx xx',
  },
  {
    key: 'emergency_mahalliy_hokimiyat',
    label: 'Hokimiyat navbatchisi',
    help: "Liftda qolish kabi ma'muriy holatlarda ko'rsatiladigan hokimiyat navbatchi raqami",
    placeholder: '+998 70 xxx xx xx',
  },
];

export const EmergencyNumbersScreen: React.FC<EmergencyNumbersScreenProps> = ({
  cityName = 'Olmaliq',
  onBack,
}) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all(FIELDS.map(f => fetch(`/api/admin/settings/${f.key}`).then(r => r.json())))
      .then(results => {
        const next: Record<string, string> = {};
        results.forEach((r, i) => { next[FIELDS[i].key] = r?.value || ''; });
        setValues(next);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const headers = { 'Content-Type': 'application/json', 'x-init-data': initData };
      const results = await Promise.all(
        FIELDS.map(f =>
          fetch(`/api/admin/settings/${f.key}`, {
            method: 'PUT', headers, body: JSON.stringify({ value: (values[f.key] || '').trim() }),
          })
        )
      );
      if (results.every(r => r.ok)) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      // jim — foydalanuvchi "Saqlash"ni qayta bosib ko'radi
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in pb-16">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-on-surface dark:text-slate-100 font-bold active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px] font-bold">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-bold text-on-surface dark:text-slate-100">{cityName} — Mahalliy xizmat raqamlari</h1>
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Favqulodda javoblarda ko'rsatiladi</p>
        </div>
      </div>

      {/* Tushuntirish banneri */}
      <div className="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-3.5 flex items-start gap-2.5">
        <span className="material-symbols-outlined text-[18px] text-sky-500 shrink-0 mt-0.5">info</span>
        <p className="text-[11px] text-sky-700 dark:text-sky-300 leading-relaxed">
          101, 102, 103, 104, 112 — butun O'zbekiston bo'yicha bir xil, doim
          avtomatik ko'rsatiladi, bu yerda o'zgartirish shart emas. Quyidagilar
          esa <b>faqat {cityName}ga xos</b> raqamlar — favqulodda xabarda milliy
          raqamlar bilan bir qatorda qo'shimcha ko'rsatiladi. Bo'sh qoldirilgan
          maydon shablonda umuman ko'rinmaydi.
        </p>
      </div>

      <div className="bg-surface dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-sm divide-y divide-outline-variant/10 dark:divide-slate-800/80 overflow-hidden">
        {FIELDS.map((f) => (
          <div key={f.key} className="p-4 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase">{f.label}</label>
            <p className="text-[10px] text-slate-500 leading-relaxed">{f.help}</p>
            {loading ? (
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ) : (
              <input
                type="text"
                value={values[f.key] || ''}
                onChange={(e) => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full bg-slate-50 dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-on-surface dark:text-slate-100 placeholder-slate-500 outline-none focus:border-primary"
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={loading || saving}
        className="w-full py-3.5 bg-gradient-to-r from-[#2AABEE] to-[#0088CC] text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all disabled:opacity-50"
      >
        {saving ? 'Saqlanmoqda...' : saved ? '✅ Saqlandi!' : 'Saqlash'}
      </button>
    </div>
  );
};
