import React, { useState, useEffect } from 'react';

interface LandmarkDetailScreenProps {
  landmarkId: string;
  landmarkName: string;
  onBack: () => void;
}

export const LandmarkDetailScreen: React.FC<LandmarkDetailScreenProps> = ({
  landmarkId,
  landmarkName,
  onBack,
}) => {
  const [name, setName] = useState(landmarkName);
  const [synonyms, setSynonyms] = useState<string[]>([]);
  const [newSynonym, setNewSynonym] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchLandmarkDetails = async () => {
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const headers = { 'x-init-data': initData };
      const response = await fetch(`/api/admin/landmarks/${landmarkId}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setName(data.name || landmarkName);
        setSynonyms(data.synonyms || []);
      } else {
        // Fallback default details
        setSynonyms([landmarkName.toLowerCase(), landmarkName.toLowerCase() + ' yaqinida']);
      }
    } catch {
      setSynonyms([landmarkName.toLowerCase(), landmarkName.toLowerCase() + ' yaqinida']);
    }
  };

  useEffect(() => {
    fetchLandmarkDetails();
  }, [landmarkId]);

  const handleAddSynonym = () => {
    const clean = newSynonym.trim().toLowerCase();
    if (clean && !synonyms.includes(clean)) {
      setSynonyms([...synonyms, clean]);
      setNewSynonym('');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const response = await fetch(`/api/admin/landmarks/${landmarkId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-init-data': initData,
        },
        body: JSON.stringify({
          name,
          synonyms,
        }),
      });
      if (response.ok) {
        alert("Mo'ljal muvaffaqiyatli saqlandi! ✅");
        onBack();
      } else {
        alert("Saqlashda xatolik yuz berdi.");
      }
    } catch {
      alert("Aloqa xatosi.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in pb-16">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-on-surface dark:text-slate-100 font-bold active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px] font-bold">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-bold text-on-surface dark:text-slate-100">Mo'ljal Detali</h1>
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Tahrirlash & Sinonimlar</p>
        </div>
      </div>

      <div className="bg-surface dark:bg-[#17212B] p-4 border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
        {/* Name input */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase">Mo'ljal Nomi</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-on-surface dark:text-slate-100 focus:outline-none"
          />
        </div>

        {/* Synonyms list */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase">Xalq tilidagi sinonimlari (Variantlar)</label>
          <div className="flex flex-wrap gap-1.5">
            {synonyms.map(syn => (
              <span key={syn} className="bg-primary/10 dark:bg-sky-500/10 text-primary dark:text-sky-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                {syn}
                <button
                  onClick={() => setSynonyms(synonyms.filter(s => s !== syn))}
                  className="hover:text-red-500 text-[14px] leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSynonym}
              onChange={(e) => setNewSynonym(e.target.value)}
              placeholder="Yangi sinonim..."
              className="flex-1 bg-slate-50 dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-on-surface dark:text-slate-100 focus:outline-none"
            />
            <button
              onClick={handleAddSynonym}
              className="bg-primary dark:bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-bold active:scale-95"
            >
              Qo'shish
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full py-3.5 bg-gradient-to-r from-[#2AABEE] to-[#0088CC] text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all"
      >
        {isSaving ? 'Saqlanmoqda...' : 'Saqlash & Yangilash'}
      </button>
    </div>
  );
};
