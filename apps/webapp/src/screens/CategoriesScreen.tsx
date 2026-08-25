import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { ErrorBanner } from '../components/ErrorBanner';

interface CategoryRow {
  id: string;
  name: string;
  count: number;
  synonyms: string[];
  group: string | null;
  objectType: string | null;
}

const OBJECT_TYPE_LABEL: Record<string, string> = {
  USTA: 'Usta',
  DOKON_OBYEKT: "Do'kon",
  MUASSASA: 'Muassasa',
  TRANSPORT: 'Transport',
};

export const CategoriesScreen: React.FC = () => {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const fetchCategories = async () => {
    setLoading(true);
    setError(false);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch(`${API_BASE_URL}/admin/categories?search=${encodeURIComponent(search)}`, {
        headers: { 'x-telegram-init-data': initData },
      });
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setCategories(data || []);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchCategories, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Kategoriyalarni guruh bo'yicha to'playmiz — bitta tekis ro'yxat o'rniga
  // mantiqiy bo'limlarga ajratib ko'rsatamiz.
  const grouped = categories.reduce<Record<string, CategoryRow[]>>((acc, c) => {
    const key = c.group || 'Boshqa';
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});
  const groupOrder = Object.keys(grouped).sort((a, b) => {
    if (a === 'Boshqa') return 1;
    if (b === 'Boshqa') return -1;
    return grouped[b].length - grouped[a].length;
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex items-center">
        <span className="material-symbols-outlined absolute left-3.5 text-ios-gray text-[20px]">search</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Kategoriya yoki sinonim bo'yicha qidirish..."
          className="w-full pl-10 pr-4 py-2.5 rounded-btn bg-white dark:bg-[#16212F] border border-ios-sep dark:border-[#2C2C2E] text-[14px] focus:outline-none focus:border-tg"
        />
      </div>

      {error && <ErrorBanner message="Kategoriyalarni yuklashda xatolik yuz berdi" type="error" onRetry={fetchCategories} />}

      {loading ? (
        <div className="bg-white dark:bg-[#16212F] rounded-card border border-ios-sep dark:border-[#2C2C2E] shadow-card p-4 space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-4 bg-ios-bg dark:bg-[#0E141B] rounded animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white dark:bg-[#16212F] rounded-card border border-ios-sep dark:border-[#2C2C2E] shadow-card p-8 text-center text-ios-gray text-[13px]">
          Kategoriya topilmadi
        </div>
      ) : (
        groupOrder.map((groupName) => (
          <div key={groupName} className="flex flex-col gap-1.5">
            <h3 className="text-[11px] font-bold text-ios-gray uppercase tracking-wider px-1">
              {groupName} · {grouped[groupName].length}
            </h3>
            <div className="bg-white dark:bg-[#16212F] rounded-card border border-ios-sep dark:border-[#2C2C2E] shadow-card overflow-hidden">
              {grouped[groupName].map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-ios-sep/60 dark:border-[#2C2C2E]/60 last:border-b-0 text-[13px]"
                >
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold text-[#1C1C1E] dark:text-white">{c.name}</span>
                    {c.objectType && (
                      <span className="text-[9px] font-bold text-tg bg-tg/10 px-1.5 py-0.5 rounded-pill">
                        {OBJECT_TYPE_LABEL[c.objectType] || c.objectType}
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-ios-gray bg-ios-bg dark:bg-[#0E141B] px-1.5 py-0.5 rounded-pill">
                      {c.count} ta
                    </span>
                  </div>
                  <span className="text-ios-gray text-right truncate">
                    {c.synonyms && c.synonyms.length > 0 ? c.synonyms.join(', ') : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
