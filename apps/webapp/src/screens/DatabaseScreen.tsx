import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopHeader } from '../components/common/TopHeader';
import { SegmentControl } from '../components/common/SegmentControl';
import { API_BASE_URL } from '../config';

export interface CategoryCardItem {
  id: string;
  name: string;
  count: number;
  icon: string;
  color: string;
}

export const DatabaseScreen: React.FC = () => {
  const navigate = useNavigate();
  const [type, setType] = useState<'USTA' | 'DOKON_OBYEKT' | 'MUASSASA'>('USTA');
  const [search, setSearch] = useState<string>('');
  const [categories, setCategories] = useState<CategoryCardItem[]>([
    { id: '1', name: 'Gazavik', count: 14, icon: 'fire_extinguisher', color: '#FF9500' },
    { id: '2', name: 'Kafelchi', count: 12, icon: 'grid_on', color: '#007AFF' },
    { id: '3', name: 'Santexnik', count: 18, icon: 'plumbing', color: '#30B0C7' },
    { id: '4', name: 'Elektrik', count: 15, icon: 'electric_bolt', color: '#FF9F0A' },
    { id: '5', name: 'Mebelchi', count: 8, icon: 'chair', color: '#AF52DE' },
    { id: '6', name: 'Muzlatgich ustasi', count: 6, icon: 'ac_unit', color: '#5856D6' },
  ]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const initData = window.Telegram?.WebApp?.initData || '';
        const res = await fetch(`${API_BASE_URL}/admin/categories?type=${type}&search=${search}`, {
          headers: { 'x-telegram-init-data': initData },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) setCategories(data);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, [type, search]);

  return (
    <div className="flex flex-col gap-3 pb-20 animate-fade-in max-w-container-max mx-auto">
      {/* 1. Large Title Header */}
      <TopHeader
        title="Baza"
        subtitle="Ustalar, do'konlar va xizmatlar ma'lumotnomasi"
      />

      <div className="px-4 flex flex-col gap-3">
        {/* 2. Segment Control */}
        <SegmentControl
          options={[
            { id: 'USTA', label: 'Ustalar' },
            { id: 'DOKON_OBYEKT', label: 'Do\'konlar' },
            { id: 'MUASSASA', label: 'Muassasa' },
          ]}
          selectedId={type}
          onChange={(val) => setType(val)}
        />

        {/* 3. Search Bar */}
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3.5 text-tg-textMuted text-[20px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ism, telefon yoki kasb bo'yicha qidiruv..."
            className="w-full pl-10 pr-4 py-2.5 rounded-btn bg-white dark:bg-[#16212F] border border-ios-separator dark:border-ios-darkSeparator text-[14px] text-tg-textLight dark:text-tg-textDark placeholder:text-tg-textMuted focus:outline-none focus:border-ios-blue shadow-card"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 text-tg-textMuted text-[12px]"
            >
              ✕
            </button>
          )}
        </div>

        {/* 4. 2 Ustunli Kasb Kartalar Setkasi (Grid) */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-24 bg-white dark:bg-[#16212F] rounded-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-1">
            {categories.map((cat) => (
              <div
                key={cat.id}
                onClick={() => navigate(`/database/category/${encodeURIComponent(cat.name)}`)}
                className="bg-white dark:bg-[#16212F] p-4 rounded-card border border-ios-separator/50 dark:border-ios-darkSeparator/50 shadow-card flex flex-col justify-between h-28 cursor-pointer active-scale"
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-9 h-9 rounded-icon flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: cat.color || '#007AFF' }}
                  >
                    <span className="material-symbols-outlined text-[22px]">{cat.icon || 'work'}</span>
                  </div>
                  <span className="text-[11px] font-bold bg-ios-separator dark:bg-slate-800 text-tg-textMuted px-2 py-0.5 rounded-pill">
                    {cat.count} ta
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-[15px] text-tg-textLight dark:text-tg-textDark truncate">
                    {cat.name}
                  </h4>
                  <p className="text-[11px] text-tg-textMuted">Ko'rish uchun bosing →</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
