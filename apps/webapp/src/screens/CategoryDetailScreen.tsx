import React, { useState, useEffect } from 'react';

interface CategoryDetailScreenProps {
  categoryId: string;
  categoryName: string;
  onBack: () => void;
}

export const CategoryDetailScreen: React.FC<CategoryDetailScreenProps> = ({
  categoryId,
  categoryName,
  onBack,
}) => {
  const [name, setName] = useState(categoryName);
  const [synonyms, setSynonyms] = useState<string[]>([]);
  const [passThroughWords, setPassThroughWords] = useState<string[]>([]);
  
  const [newSynonym, setNewSynonym] = useState('');
  const [newPassWord, setNewPassWord] = useState('');
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
        setPassThroughWords(data.passThroughWords || ['usta', 'sozlash']);
      } else {
        // Fallback default details
        setSynonyms([categoryName.toLowerCase(), categoryName.toLowerCase() + 'lar']);
        setPassThroughWords(['usta', 'sozlash', 'xizmati']);
      }
    } catch {
      setSynonyms([categoryName.toLowerCase(), categoryName.toLowerCase() + 'lar']);
      setPassThroughWords(['usta', 'sozlash', 'xizmati']);
    }
  };

  useEffect(() => {
    fetchCategoryDetails();
  }, [categoryId]);

  const handleAddSynonym = () => {
    const clean = newSynonym.trim().toLowerCase();
    if (clean && !synonyms.includes(clean)) {
      setSynonyms([...synonyms, clean]);
      setNewSynonym('');
    }
  };

  const handleAddPassWord = () => {
    const clean = newPassWord.trim().toLowerCase();
    if (clean && !passThroughWords.includes(clean)) {
      setPassThroughWords([...passThroughWords, clean]);
      setNewPassWord('');
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
          passThroughWords,
        }),
      });
      if (response.ok) {
        alert("Kategoriya muvaffaqiyatli saqlandi! ✅");
        onBack();
      } else {
        alert("Kategoriyani saqlashda xatolik yuz berdi.");
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
          <h1 className="text-xl font-bold text-on-surface dark:text-slate-100">Kategoriya Detali</h1>
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Tahrirlash & Sinonimlar</p>
        </div>
      </div>

      <div className="bg-surface dark:bg-[#17212B] p-4 border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
        {/* Name input */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase">Kategoriya Nomi</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-on-surface dark:text-slate-100 focus:outline-none"
          />
        </div>

        {/* Synonyms list */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase">Sinonimlar (Qidiruv so'zlari)</label>
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

        {/* Pass through words list */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="text-[11px] font-bold text-slate-500 uppercase">O'tkazish so'zlar (Keywords)</label>
          <div className="flex flex-wrap gap-1.5">
            {passThroughWords.map(word => (
              <span key={word} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                {word}
                <button
                  onClick={() => setPassThroughWords(passThroughWords.filter(w => w !== word))}
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
              value={newPassWord}
              onChange={(e) => setNewPassWord(e.target.value)}
              placeholder="Yangi so'z..."
              className="flex-1 bg-slate-50 dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-on-surface dark:text-slate-100 focus:outline-none"
            />
            <button
              onClick={handleAddPassWord}
              className="bg-slate-200 dark:bg-slate-800 text-on-surface dark:text-slate-100 px-4 py-2 rounded-xl text-xs font-bold active:scale-95"
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
