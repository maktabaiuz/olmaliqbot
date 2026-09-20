import React, { useState, useEffect, useRef } from 'react';

interface CategoryOption {
  id: string;
  name: string;
  synonyms: string[];
}

export interface CategoryPickerProps {
  defaultQuery?: string;
  onSelect: (categoryId: string, categoryName: string) => void;
  onClose: () => void;
}

/**
 * "So'rovlar" bo'limida admin bir so'zni MAVJUD kategoriyaga qo'lda
 * bog'lashi uchun (2026-09) — tizim avtomatik taxmin qila olmagan yoki
 * noto'g'ri taxmin qilgan hollarda ham admin o'zi to'g'ri kategoriyani
 * qidirib topa oladi. Faqat MAVJUD kategoriyalar orasidan tanlanadi —
 * yangi kategoriya bu yerdan yaratilmaydi (buning uchun alohida "+
 * Qo'shish" oqimi bor).
 */
export const CategoryPicker: React.FC<CategoryPickerProps> = ({ defaultQuery, onSelect, onClose }) => {
  const [query, setQuery] = useState(defaultQuery || '');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData || '';
    fetch('/api/admin/categories', { headers: { 'x-init-data': initData } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCategories(data || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = categories.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.synonyms.some((s) => s.toLowerCase().includes(q));
  });

  return (
    <div ref={containerRef} className="mt-2 bg-ios-fill/[0.08] rounded-ios p-2">
      <input
        autoFocus
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Kategoriya qidiring..."
        className="w-full bg-ios-card rounded-[8px] px-3 py-2 text-[13px] text-ios-label outline-none focus:ring-1 focus:ring-ios-blue"
      />
      <div className="max-h-40 overflow-y-auto mt-1.5">
        {loading && <div className="px-2 py-2 text-[12px] text-ios-label-secondary/70">Yuklanmoqda...</div>}
        {!loading && filtered.length === 0 && (
          <div className="px-2 py-2 text-[12px] text-ios-label-secondary/70">Kategoriya topilmadi</div>
        )}
        {filtered.slice(0, 30).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id, c.name)}
            className="w-full text-left px-2.5 py-2 rounded-[6px] text-[13px] font-medium text-ios-label active:bg-ios-fill/10"
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
};
