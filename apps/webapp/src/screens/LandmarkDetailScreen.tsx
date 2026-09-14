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
  const [isDeleting, setIsDeleting] = useState(false);
  const [listingCount, setListingCount] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const fetchLandmarkDetails = async () => {
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const headers = { 'x-init-data': initData };
      const response = await fetch(`/api/admin/landmarks/${landmarkId}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setName(data.name || landmarkName);
        setSynonyms(data.synonyms || []);
        setListingCount(typeof data.listingCount === 'number' ? data.listingCount : null);
      } else {
        alert("Manzil ma'lumotlarini yuklab bo'lmadi.");
      }
    } catch {
      alert("Aloqa xatosi — manzil ma'lumotlari yuklanmadi.");
    }
  };

  useEffect(() => {
    fetchLandmarkDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landmarkId]);

  const handleAddSynonym = (raw?: string) => {
    const clean = (raw ?? newSynonym).trim().toLowerCase();
    if (clean && !synonyms.includes(clean)) {
      setSynonyms([...synonyms, clean]);
      if (!raw) setNewSynonym('');
    }
    setSuggestions((prev) => prev.filter((s) => s !== clean));
  };

  const handleSuggest = async () => {
    setIsSuggesting(true);
    setSuggestError(null);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const response = await fetch(`/api/admin/landmarks/${landmarkId}/suggest-synonyms`, {
        method: 'POST',
        headers: { 'x-init-data': initData },
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        const fresh = (data.suggestions || []).filter((s: string) => !synonyms.includes(s));
        setSuggestions(fresh);
        if (fresh.length === 0) setSuggestError("AI hozircha yangi variant taklif qilolmadi.");
      } else {
        setSuggestError(data.message || 'AI taklifi muvaffaqiyatsiz bo\'ldi.');
      }
    } catch {
      setSuggestError('Aloqa xatosi.');
    } finally {
      setIsSuggesting(false);
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

  const handleDelete = async () => {
    if (!window.confirm(`"${name}" manzilini butunlay o'chirmoqchimisiz?`)) return;
    setIsDeleting(true);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const response = await fetch(`/api/admin/landmarks/${landmarkId}`, {
        method: 'DELETE',
        headers: { 'x-init-data': initData },
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        onBack();
      } else {
        alert(data.message || "O'chirishda xatolik yuz berdi.");
      }
    } catch {
      alert('Aloqa xatosi.');
    } finally {
      setIsDeleting(false);
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
          <h1 className="text-xl font-bold text-on-surface dark:text-slate-100">Manzil tafsilotlari</h1>
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            {listingCount !== null ? `${listingCount} ta yozuv bog'langan` : 'Yuklanmoqda...'}
          </p>
        </div>
      </div>

      {/* Guruh 1: Nomi */}
      <div className="bg-surface dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center px-4 py-3 gap-3">
          <span className="text-[11px] font-bold text-slate-500 uppercase w-20 shrink-0">Nomi</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 bg-transparent text-sm font-semibold text-on-surface dark:text-slate-100 focus:outline-none text-right"
          />
        </div>
      </div>

      {/* Guruh 2: Mahalliy nomlar (sinonimlar) */}
      <div className="bg-surface dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Mahalliy nomlari (xalq shunday deydi)</span>
          <button
            onClick={handleSuggest}
            disabled={isSuggesting}
            className="flex items-center gap-1 text-[11px] font-bold text-primary dark:text-sky-400 disabled:opacity-50 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
            {isSuggesting ? 'Sorash...' : 'AI so\'z taklif qilsin'}
          </button>
        </div>

        {/* O'chirish bo'limi — mavjud so'zlar, har birida chiqarib tashlash tugmasi */}
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {synonyms.length === 0 && (
            <span className="text-[11px] text-slate-400">Hali mahalliy nom qo'shilmagan</span>
          )}
          {synonyms.map(syn => (
            <span key={syn} className="bg-primary/10 dark:bg-sky-500/10 text-primary dark:text-sky-400 pl-3 pr-1.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
              {syn}
              <button
                onClick={() => setSynonyms(synonyms.filter(s => s !== syn))}
                className="w-4 h-4 rounded-full bg-primary/20 dark:bg-sky-500/20 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                aria-label={`${syn}ni o'chirish`}
              >
                <span className="material-symbols-outlined text-[12px] leading-none">close</span>
              </button>
            </span>
          ))}
        </div>

        {/* AI taklif qilgan so'zlar — bittasiga bosish shu so'zni qo'shadi */}
        {suggestions.length > 0 && (
          <div className="px-4 pb-3 flex flex-wrap gap-1.5 border-t border-outline-variant/10 dark:border-slate-800/80 pt-3">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => handleAddSynonym(s)}
                className="flex items-center gap-1 pl-2.5 pr-3 py-1 rounded-full border border-dashed border-primary/40 dark:border-sky-500/40 text-primary dark:text-sky-400 text-xs font-bold hover:bg-primary/5 dark:hover:bg-sky-500/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[13px]">add</span>
                {s}
              </button>
            ))}
          </div>
        )}
        {suggestError && (
          <p className="px-4 pb-3 text-[10px] text-slate-500 -mt-1">{suggestError}</p>
        )}

        {/* Qo'shish bo'limi */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-outline-variant/10 dark:border-slate-800/80">
          <span className="material-symbols-outlined text-[16px] text-slate-400">add_circle</span>
          <input
            type="text"
            value={newSynonym}
            onChange={(e) => setNewSynonym(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddSynonym(); }}
            placeholder="Yangi mahalliy nom qo'shish..."
            className="flex-1 bg-transparent text-xs text-on-surface dark:text-slate-100 focus:outline-none"
          />
          <button
            onClick={() => handleAddSynonym()}
            disabled={!newSynonym.trim()}
            className="text-primary dark:text-sky-400 text-xs font-bold disabled:opacity-30"
          >
            Qo'shish
          </button>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full py-3.5 bg-gradient-to-r from-[#2AABEE] to-[#0088CC] text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all"
      >
        {isSaving ? 'Saqlanmoqda...' : 'Saqlash'}
      </button>

      <button
        onClick={handleDelete}
        disabled={isDeleting || (listingCount !== null && listingCount > 0)}
        className="w-full py-3 bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-xs rounded-xl active:scale-95 transition-all disabled:opacity-40"
      >
        {isDeleting
          ? "O'chirilmoqda..."
          : listingCount && listingCount > 0
          ? `O'chirish (avval ${listingCount} ta yozuvni ko'chiring)`
          : "Manzilni o'chirish"}
      </button>
    </div>
  );
};
