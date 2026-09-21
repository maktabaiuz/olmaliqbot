import React, { useState, useEffect } from 'react';
import { useFeedback } from '../context/FeedbackContext';
import { IosHeader } from '../components/ios/IosHeader';

interface CategoryDetailScreenProps {
  categoryId: string;
  categoryName: string;
  onBack: () => void;
}

const HAIRLINE = { borderTop: '0.5px solid rgb(var(--ios-separator) / 0.29)' };

export const CategoryDetailScreen: React.FC<CategoryDetailScreenProps> = ({
  categoryId,
  categoryName,
  onBack,
}) => {
  const { showToast } = useFeedback();
  const [name, setName] = useState(categoryName);
  const [synonyms, setSynonyms] = useState<string[]>([]);

  const [newSynonym, setNewSynonym] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchCategoryDetails = async () => {
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const headers = { 'x-init-data': initData };
      const response = await fetch(`/api/admin/categories/${categoryId}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setName(data.name || categoryName);
        setSynonyms(data.synonyms || []);
      } else {
        // Fallback default details
        setSynonyms([categoryName.toLowerCase(), categoryName.toLowerCase() + 'lar']);
      }
    } catch {
      setSynonyms([categoryName.toLowerCase(), categoryName.toLowerCase() + 'lar']);
    }
  };

  useEffect(() => {
    fetchCategoryDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

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
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
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
        showToast('Kategoriya muvaffaqiyatli saqlandi!', 'success');
        onBack();
      } else {
        showToast('Kategoriyani saqlashda xatolik yuz berdi.', 'error');
      }
    } catch {
      showToast('Aloqa xatosi.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in pb-16 -mx-4 -mt-2 px-4 pt-1">
      <IosHeader title="Kategoriya" subtitle={categoryName} onBack={onBack} />

      <div className="flex flex-col gap-5">
        {/* Nomi */}
        <div>
          <h3 className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide px-1 mb-1.5">
            Kategoriya nomi
          </h3>
          <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent px-4 py-3 text-[15px] text-ios-label focus:outline-none"
            />
          </div>
        </div>

        {/* Sinonimlar */}
        <div>
          <h3 className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide px-1 mb-1.5">
            Sinonimlar (qidiruv so'zlari)
          </h3>
          <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden">
            <div className="px-4 py-3 flex flex-wrap gap-1.5">
              {synonyms.length === 0 && (
                <span className="text-[13px] text-ios-label-secondary/70">Hali sinonim qo'shilmagan</span>
              )}
              {synonyms.map((syn) => (
                <span
                  key={syn}
                  className="bg-ios-blue/10 text-ios-blue pl-3 pr-1.5 py-1 rounded-full text-[13px] font-medium flex items-center gap-1"
                >
                  {syn}
                  <button
                    onClick={() => setSynonyms(synonyms.filter((s) => s !== syn))}
                    className="w-4 h-4 rounded-full bg-ios-blue/20 flex items-center justify-center active:bg-ios-red active:text-white transition-colors"
                    aria-label={`${syn}ni o'chirish`}
                  >
                    <span className="material-symbols-outlined text-[11px] leading-none">close</span>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5" style={HAIRLINE}>
              <span className="material-symbols-outlined text-[18px] text-ios-label-secondary/70">add_circle</span>
              <input
                type="text"
                value={newSynonym}
                onChange={(e) => setNewSynonym(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSynonym();
                }}
                placeholder="Yangi sinonim..."
                className="flex-1 bg-transparent text-[15px] text-ios-label placeholder:text-ios-label-secondary/70 focus:outline-none"
              />
              <button
                onClick={handleAddSynonym}
                disabled={!newSynonym.trim()}
                className="text-ios-blue text-[13px] font-semibold disabled:opacity-30"
              >
                Qo'shish
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-ios-blue active:opacity-70 text-white font-medium py-3.5 rounded-ios text-[16px] transition-opacity disabled:opacity-40"
      >
        {isSaving ? 'Saqlanmoqda...' : 'Saqlash & Yangilash'}
      </button>
    </div>
  );
};
