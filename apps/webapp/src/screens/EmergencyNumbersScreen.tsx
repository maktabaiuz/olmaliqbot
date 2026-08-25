import React, { useState } from 'react';

export interface EmergencyNumbersScreenProps {
  cityName?: string;
  onBack: () => void;
}

export const EmergencyNumbersScreen: React.FC<EmergencyNumbersScreenProps> = ({
  cityName = 'Olmaliq',
  onBack,
}) => {
  const [saving, setSaving] = useState(false);

  // Grouped Emergency Numbers State
  // 1-daraja (Hayotga xavf)
  const [fire, setFire] = useState('101');
  const [ambulance, setAmbulance] = useState('103');
  const [police, setPolice] = useState('102');
  const [gasEmergency, setGasEmergency] = useState('104');

  // 2-daraja (Shoshilinch)
  const [water, setWater] = useState('+998 70 613 44 55');
  const [electric, setElectric] = useState('+998 70 613 88 99');
  const [gasOffice, setGasOffice] = useState('+998 70 613 22 11');

  // 3-daraja (Oddiy)
  const [cityHall, setCityHall] = useState('+998 70 613 00 00');
  const [heat, setHeat] = useState('+998 70 613 77 00');

  const handleSave = async () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      alert('✅ 9 ta favqulodda raqam muvaffaqiyatli saqlandi!');
      onBack();
    }, 600);
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
          <h1 className="text-xl font-bold text-on-surface dark:text-slate-100 font-extrabold">{cityName} Favqulodda raqamlar</h1>
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Guruhlangan tezkor raqamlar</p>
        </div>
      </div>

      <div className="space-y-5">
        
        {/* 1. 🔴 1-daraja (Hayotga xavf) */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 px-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <h3 className="text-[11px] font-bold text-red-500 uppercase tracking-wider">🔴 1-daraja: Hayotga xavf</h3>
          </div>
          
          <div className="bg-surface dark:bg-[#17212B] p-4 border border-red-500/20 rounded-2xl shadow-sm space-y-3.5">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Yong'in Xavfsizligi (101)</label>
              <input
                type="text"
                value={fire}
                onChange={(e) => setFire(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-on-surface dark:text-slate-100 focus:outline-none"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Tez Tibbiy Yordam (103)</label>
              <input
                type="text"
                value={ambulance}
                onChange={(e) => setAmbulance(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-on-surface dark:text-slate-100 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Ichki Ishlar (102)</label>
              <input
                type="text"
                value={police}
                onChange={(e) => setPolice(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-on-surface dark:text-slate-100 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Gaz Avariya Xizmati (104)</label>
              <input
                type="text"
                value={gasEmergency}
                onChange={(e) => setGasEmergency(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-on-surface dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* 2. 🟠 2-daraja (Shoshilinch) */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 px-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <h3 className="text-[11px] font-bold text-orange-500 uppercase tracking-wider">🟠 2-daraja: Shoshilinch xizmatlar</h3>
          </div>

          <div className="bg-surface dark:bg-[#17212B] p-4 border border-orange-500/20 rounded-2xl shadow-sm space-y-3.5">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Suv Ta'minoti (Suvsoz)</label>
              <input
                type="text"
                value={water}
                onChange={(e) => setWater(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-on-surface dark:text-slate-100 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Elektr Tarmoqlari (Eski Tarmoq)</label>
              <input
                type="text"
                value={electric}
                onChange={(e) => setElectric(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-on-surface dark:text-slate-100 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Shahar Gaz Idorasi</label>
              <input
                type="text"
                value={gasOffice}
                onChange={(e) => setGasOffice(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-on-surface dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* 3. 🟢 3-daraja (Oddiy) */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 px-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h3 className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">🟢 3-daraja: Ma'muriy va kommunal</h3>
          </div>

          <div className="bg-surface dark:bg-[#17212B] p-4 border border-emerald-500/20 rounded-2xl shadow-sm space-y-3.5">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Hokimiyat Navbatchisi</label>
              <input
                type="text"
                value={cityHall}
                onChange={(e) => setCityHall(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-on-surface dark:text-slate-100 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Issiqlik Manbai (Otopleniye)</label>
              <input
                type="text"
                value={heat}
                onChange={(e) => setHeat(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-on-surface dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>
        </section>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3.5 bg-gradient-to-r from-[#2AABEE] to-[#0088CC] text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all"
      >
        {saving ? 'Saqlanmoqda...' : 'Saqlash & Yangilash'}
      </button>
    </div>
  );
};
