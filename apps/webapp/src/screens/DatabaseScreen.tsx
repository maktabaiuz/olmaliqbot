import React, { useEffect, useState } from 'react';
import { TopHeader } from '../components/common/TopHeader';
import { SegmentControl } from '../components/common/SegmentControl';
import { API_BASE_URL } from '../config';

export interface DatabaseScreenProps {
  onNavigateTab: (tab: string) => void;
  onSelectCategoryToAdd?: (categoryName: string) => void;
}

export interface ListingItem {
  id: string;
  name: string;
  phone: string;
  badges?: string[];
  workFrom?: string;
  workTo?: string;
  category?: { name: string };
  primaryLandmark?: { name: string };
}

const DEFAULT_DEMO_CATEGORIES = [
  { id: '1', name: 'Gazavik', count: 14, icon: 'fire_extinguisher', color: '#FF9500' },
  { id: '2', name: 'Kafelchi', count: 12, icon: 'grid_on', color: '#007AFF' },
  { id: '3', name: 'Santexnik', count: 18, icon: 'plumbing', color: '#30B0C7' },
  { id: '4', name: 'Elektrik', count: 15, icon: 'electric_bolt', color: '#FF9F0A' },
  { id: '5', name: 'Mebelchi', count: 8, icon: 'chair', color: '#AF52DE' },
  { id: '6', name: 'Muzlatgich ustasi', count: 6, icon: 'ac_unit', color: '#5856D6' },
];

const DEFAULT_DEMO_LISTINGS: ListingItem[] = [
  {
    id: 'l1',
    name: 'Usta Alisher (Gazavik)',
    phone: '+998 90 123 45 67',
    badges: ['uyga_boradi', 'kafolat', '24_7'],
    category: { name: 'Gazavik' },
    primaryLandmark: { name: 'Korzinka' },
  },
  {
    id: 'l2',
    name: 'Usta Sobir (Kafelchi)',
    phone: '+998 93 987 65 43',
    badges: ['kafolat', 'zudlik_bilan'],
    category: { name: 'Kafelchi' },
    primaryLandmark: { name: '3-Mavze' },
  },
];

export const DatabaseScreen: React.FC<DatabaseScreenProps> = () => {
  const [type, setType] = useState<'USTA' | 'DOKON_OBYEKT' | 'MUASSASA'>('USTA');
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [categories, setCategories] = useState<Array<{ id: string; name: string; count: number; icon: string; color: string }>>(DEFAULT_DEMO_CATEGORIES);
  const [listings, setListings] = useState<ListingItem[]>(DEFAULT_DEMO_LISTINGS);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch Categories & Summary Count with fallback
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const initData = window.Telegram?.WebApp?.initData || '';
        const res = await fetch(`${API_BASE_URL}/admin/categories?type=${type}&search=${encodeURIComponent(search)}`, {
          headers: { 'x-telegram-init-data': initData },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setCategories(data);
          } else {
            setCategories(DEFAULT_DEMO_CATEGORIES);
          }
        } else {
          setCategories(DEFAULT_DEMO_CATEGORIES);
        }
      } catch (err) {
        setCategories(DEFAULT_DEMO_CATEGORIES);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, [type, search]);

  // Fetch Listings List with fallback
  useEffect(() => {
    const fetchListings = async () => {
      try {
        const initData = window.Telegram?.WebApp?.initData || '';
        const queryParams = new URLSearchParams();
        if (type) queryParams.set('type', type);
        if (selectedCategory) queryParams.set('categoryName', selectedCategory);
        if (search) queryParams.set('search', search);

        const res = await fetch(`${API_BASE_URL}/admin/listings?${queryParams.toString()}`, {
          headers: { 'x-telegram-init-data': initData },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setListings(data);
          } else {
            setListings(DEFAULT_DEMO_LISTINGS);
          }
        } else {
          setListings(DEFAULT_DEMO_LISTINGS);
        }
      } catch (err) {
        setListings(DEFAULT_DEMO_LISTINGS);
      }
    };
    fetchListings();
  }, [type, selectedCategory, search]);

  return (
    <div className="flex flex-col gap-3 pb-24 animate-fade-in max-w-container-max mx-auto">
      <TopHeader title="Baza" subtitle="Ustalar, do'konlar va xizmatlar ma'lumotnomasi" />

      <div className="px-4 flex flex-col gap-3">
        {/* Segment Control */}
        <SegmentControl
          options={[
            { id: 'USTA', label: 'Ustalar' },
            { id: 'DOKON_OBYEKT', label: 'Do\'konlar' },
            { id: 'MUASSASA', label: 'Muassasa' },
          ]}
          selectedId={type}
          onChange={(val) => {
            setType(val);
            setSelectedCategory(null);
          }}
        />

        {/* Search Bar */}
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3.5 text-ios-gray text-[20px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ism, telefon yoki kasb bo'yicha qidiruv..."
            className="w-full pl-10 pr-4 py-2.5 rounded-btn bg-white dark:bg-[#16212F] border border-ios-sep dark:border-ios-darkSeparator text-[14px] text-[#1C1C1E] dark:text-white placeholder:text-ios-gray focus:outline-none focus:border-tg shadow-card"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 text-ios-gray text-[12px]">
              ✕
            </button>
          )}
        </div>

        {/* Selected Category Header (if drill down active) */}
        {selectedCategory && (
          <div className="flex items-center justify-between bg-tg/10 border border-tg/30 p-3 rounded-btn text-[13px]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-tg">📍 {selectedCategory}</span>
              <span className="text-[11px] text-ios-gray">({listings.length} ta yozuv)</span>
            </div>
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-[12px] font-bold text-ios-red hover:underline"
            >
              Hammasi ✕
            </button>
          </div>
        )}

        {/* Category Grid or Detailed Listing Rows */}
        {!selectedCategory && !search ? (
          /* 2 Ustunli Kasb Kartalar Setkasi */
          loading ? (
            <div className="grid grid-cols-2 gap-3 pt-1">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-28 bg-white dark:bg-[#16212F] rounded-card animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pt-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className="bg-white dark:bg-[#16212F] p-4 rounded-card border border-ios-sep/60 dark:border-ios-darkSeparator shadow-card flex flex-col justify-between h-28 cursor-pointer active-scale"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-icon flex items-center justify-center text-white shadow-sm bg-tg">
                      <span className="material-symbols-outlined text-[22px]">work</span>
                    </div>
                    <span className="text-[11px] font-bold bg-ios-sep dark:bg-slate-800 text-ios-gray px-2 py-0.5 rounded-pill">
                      {cat.count} ta
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-[15px] text-[#1C1C1E] dark:text-white truncate">
                      {cat.name}
                    </h4>
                    <p className="text-[11px] text-ios-gray">Ko'rish uchun bosing →</p>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Detailed Listings List */
          <div className="space-y-2.5 pt-1">
            {listings.length === 0 ? (
              <div className="p-8 text-center text-ios-gray text-[14px]">
                Bu bo'limda hali ma'lumot yo'q. Markaziy ＋ FAB tugmasi orqali qo'shishingiz mumkin!
              </div>
            ) : (
              listings.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-[#16212F] p-3.5 rounded-card border border-ios-sep/60 dark:border-ios-darkSeparator shadow-card flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-[15px] text-[#1C1C1E] dark:text-white">
                      {item.name}
                    </h4>
                    <span className="text-[11px] font-bold bg-ios-green/15 text-ios-green px-2.5 py-0.5 rounded-pill">
                      ✅ Tasdiqlangan
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-ios-gray">
                      🔧 {item.category?.name || 'Usta'} · 📍 {item.primaryLandmark?.name || 'Markaz'}
                    </span>
                    <a
                      href={`tel:${item.phone}`}
                      className="font-bold text-tg font-mono hover:underline"
                    >
                      📞 {item.phone}
                    </a>
                  </div>

                  {item.badges && item.badges.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.badges.map((b, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-ios-bg dark:bg-[#0E141B] text-ios-gray px-2 py-0.5 rounded-pill"
                        >
                          🏷 {b}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
