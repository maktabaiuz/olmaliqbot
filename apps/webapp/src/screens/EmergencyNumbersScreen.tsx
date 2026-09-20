import React, { useState, useEffect } from 'react';
import { IosHeader } from '../components/ios/IosHeader';

export interface EmergencyNumbersScreenProps {
  cityName?: string;
  onBack: () => void;
}

const HAIRLINE = { borderTop: '0.5px solid rgb(var(--ios-separator) / 0.29)' };

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
    <div className="flex flex-col gap-5 animate-fade-in pb-16 -mx-4 -mt-2 px-4 pt-1">
      <IosHeader
        title="Mahalliy raqamlar"
        subtitle={`${cityName} — favqulodda javoblarda ko'rsatiladi`}
        onBack={onBack}
      />

      {/* Tushuntirish banneri */}
      <div className="bg-ios-blue/10 rounded-ios-lg p-3.5 flex items-start gap-2.5">
        <span className="material-symbols-outlined text-[18px] text-ios-blue shrink-0 mt-0.5">info</span>
        <p className="text-[12px] text-ios-label-secondary/90 leading-relaxed">
          101, 102, 103, 104, 112 — butun O'zbekiston bo'yicha bir xil, doim
          avtomatik ko'rsatiladi, bu yerda o'zgartirish shart emas. Quyidagilar
          esa <b className="text-ios-label">faqat {cityName}ga xos</b> raqamlar — favqulodda xabarda milliy
          raqamlar bilan bir qatorda qo'shimcha ko'rsatiladi. Bo'sh qoldirilgan
          maydon shablonda umuman ko'rinmaydi.
        </p>
      </div>

      <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden">
        {FIELDS.map((f, idx) => (
          <div key={f.key} className="p-4 space-y-1.5" style={idx === 0 ? undefined : HAIRLINE}>
            <label className="text-[13px] font-medium text-ios-label">{f.label}</label>
            <p className="text-[12px] text-ios-label-secondary/70 leading-relaxed">{f.help}</p>
            {loading ? (
              <div className="h-10 bg-ios-fill/20 rounded-ios animate-pulse" />
            ) : (
              <input
                type="text"
                value={values[f.key] || ''}
                onChange={(e) => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full bg-ios-fill/[0.12] rounded-ios px-3.5 py-2.5 text-[15px] text-ios-label placeholder:text-ios-label-secondary/50 outline-none focus:ring-1 focus:ring-ios-blue"
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={loading || saving}
        className="w-full bg-ios-blue active:opacity-70 text-white font-medium py-3.5 rounded-ios text-[16px] transition-opacity disabled:opacity-40"
      >
        {saving ? 'Saqlanmoqda...' : saved ? 'Saqlandi ✓' : 'Saqlash'}
      </button>
    </div>
  );
};
