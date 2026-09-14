import React, { useState, useEffect } from 'react';
import { avatarColorForName } from '../utils/avatarColor';

interface LandmarkDetailScreenProps {
  landmarkId: string;
  landmarkName: string;
  onBack: () => void;
}

const IOS_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, sans-serif';
const HAIRLINE = '0.5px solid rgba(60,60,67,0.29)';

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

  const canDelete = listingCount === 0;

  return (
    <div className="animate-fade-in -mx-4 -mt-2 pb-10" style={{ fontFamily: IOS_FONT }}>
      {/* Nav bar */}
      <div className="px-4 pt-1 pb-2 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-0.5 text-[#007AFF] dark:text-[#0A84FF] text-[15px] font-normal -ml-1.5 active:opacity-40"
        >
          <span className="material-symbols-outlined text-[22px]">chevron_left</span>
          Manzillar
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="text-[15px] font-semibold text-[#007AFF] dark:text-[#0A84FF] active:opacity-40 disabled:opacity-40"
        >
          {isSaving ? 'Saqlanmoqda...' : 'Tayyor'}
        </button>
      </div>

      {/* Avatar header — Contacts-app style */}
      <div className="flex flex-col items-center gap-2 pt-2 pb-6">
        <span
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-white text-[28px] font-semibold shadow-sm"
          style={{ backgroundColor: avatarColorForName(name || '?') }}
        >
          {name.trim()[0]?.toUpperCase() || '?'}
        </span>
        <h1 className="text-[20px] font-semibold text-on-surface dark:text-white text-center px-6">{name}</h1>
        <p className="text-[13px] text-[#8E8E93]">
          {listingCount !== null ? `${listingCount} ta yozuv bog'langan` : 'Yuklanmoqda...'}
        </p>
      </div>

      <div className="px-4 space-y-6">
        {/* Guruh: Nomi */}
        <div>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] shadow-sm overflow-hidden">
            <div className="flex items-center px-3.5 py-2.5 gap-3">
              <span className="text-[15px] text-on-surface dark:text-white w-20 shrink-0">Nomi</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 bg-transparent text-[15px] text-[#8E8E93] focus:outline-none text-right"
              />
            </div>
          </div>
        </div>

        {/* Guruh: Mahalliy nomlari */}
        <div>
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="text-[13px] font-normal text-[#8E8E93] uppercase tracking-wide">Mahalliy nomlari</span>
            <button
              onClick={handleSuggest}
              disabled={isSuggesting}
              className="flex items-center gap-1 text-[13px] font-medium text-[#007AFF] dark:text-[#0A84FF] disabled:opacity-50 active:opacity-50"
            >
              <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
              {isSuggesting ? 'So\'ralmoqda...' : 'AI taklif qilsin'}
            </button>
          </div>

          <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] shadow-sm overflow-hidden">
            <div className="px-3.5 py-3 flex flex-wrap gap-1.5">
              {synonyms.length === 0 && (
                <span className="text-[13px] text-[#8E8E93]">Hali mahalliy nom qo'shilmagan</span>
              )}
              {synonyms.map(syn => (
                <span
                  key={syn}
                  className="bg-[#007AFF]/10 dark:bg-[#0A84FF]/15 text-[#007AFF] dark:text-[#0A84FF] pl-3 pr-1.5 py-1 rounded-full text-[13px] font-medium flex items-center gap-1"
                >
                  {syn}
                  <button
                    onClick={() => setSynonyms(synonyms.filter(s => s !== syn))}
                    className="w-4 h-4 rounded-full bg-[#007AFF]/20 dark:bg-[#0A84FF]/25 flex items-center justify-center hover:bg-[#FF3B30] hover:text-white transition-colors"
                    aria-label={`${syn}ni o'chirish`}
                  >
                    <span className="material-symbols-outlined text-[11px] leading-none">close</span>
                  </button>
                </span>
              ))}
            </div>

            {suggestions.length > 0 && (
              <div className="px-3.5 py-3 flex flex-wrap gap-1.5" style={{ borderTop: HAIRLINE }}>
                {suggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => handleAddSynonym(s)}
                    className="flex items-center gap-1 pl-2 pr-2.5 py-1 rounded-full border border-dashed border-[#007AFF]/50 dark:border-[#0A84FF]/50 text-[#007AFF] dark:text-[#0A84FF] text-[13px] font-medium active:bg-[#007AFF]/5 dark:active:bg-[#0A84FF]/10"
                  >
                    <span className="material-symbols-outlined text-[13px]">add</span>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {suggestError && (
              <p className="px-3.5 pb-2.5 text-[12px] text-[#8E8E93]" style={{ borderTop: suggestions.length === 0 ? HAIRLINE : undefined, paddingTop: suggestions.length === 0 ? 10 : undefined }}>
                {suggestError}
              </p>
            )}

            <div className="flex items-center gap-2 px-3.5 py-2.5" style={{ borderTop: HAIRLINE }}>
              <span className="material-symbols-outlined text-[18px] text-[#8E8E93]">add_circle</span>
              <input
                type="text"
                value={newSynonym}
                onChange={(e) => setNewSynonym(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddSynonym(); }}
                placeholder="Yangi mahalliy nom qo'shish..."
                className="flex-1 bg-transparent text-[15px] text-on-surface dark:text-white placeholder:text-[#8E8E93] focus:outline-none"
              />
              <button
                onClick={() => handleAddSynonym()}
                disabled={!newSynonym.trim()}
                className="text-[#007AFF] dark:text-[#0A84FF] text-[13px] font-semibold disabled:opacity-30"
              >
                Qo'shish
              </button>
            </div>
          </div>
        </div>

        {/* Destructive action — iOS "Delete Contact" pattern */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] shadow-sm overflow-hidden">
          <button
            onClick={handleDelete}
            disabled={isDeleting || !canDelete}
            className="w-full text-center py-3 text-[15px] font-normal text-[#FF3B30] active:bg-[#F2F2F7] dark:active:bg-[#2C2C2E] disabled:opacity-40 disabled:text-[#8E8E93]"
          >
            {isDeleting
              ? "O'chirilmoqda..."
              : canDelete
              ? "Manzilni o'chirish"
              : `O'chirish uchun avval ${listingCount} ta yozuvni ko'chiring`}
          </button>
        </div>
      </div>
    </div>
  );
};
