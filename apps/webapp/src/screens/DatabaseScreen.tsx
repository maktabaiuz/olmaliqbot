import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { RecordRow } from '../components/RecordRow';
import { NavTab } from '../components/BottomNav';
import { apiFetch } from '../config';

export interface CategorySummary {
  id: string;
  name: string;
  count: number;
  synonyms: string[];
  group: string;
}

export interface ListingItem {
  id: string;
  name: string;
  phone: string;
  categoryName: string;
  landmarkName?: string;
  bayesianRating?: number;
  verification: 'VERIFIED' | 'COMMUNITY_UNVERIFIED';
  status: 'ACTIVE' | 'PAUSED' | 'INCOMPLETE';
  updatedAt?: string;
  type: 'MASTERS' | 'SHOPS' | 'ORGANIZATIONS' | 'VEHICLES' | 'RENTALS';
}

export interface DatabaseScreenProps {
  onNavigateTab: (tab: NavTab) => void;
  onSelectListing?: (listingId: string) => void;
}

export const DatabaseScreen: React.FC<DatabaseScreenProps> = ({ onNavigateTab, onSelectListing }) => {
  useAuth();

  // Navigation & View States
  const [selectedCategory, setSelectedCategory] = useState<CategorySummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [listingType, setListingType] = useState<'MASTERS' | 'SHOPS' | 'ORGANIZATIONS' | 'VEHICLES' | 'RENTALS'>('MASTERS');
  const [activeFilter, setActiveFilter] = useState<'all' | 'verified' | 'unverified' | 'paused'>('all');

  // Data States
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [listings, setListings] = useState<ListingItem[]>([]);

  // Backend Prisma enum (USTA/DOKON_OBYEKT/MUASSASA/TRANSPORT) -> Frontend segment ids.
  // Avval TRANSPORT alohida bo'lim topilmasdi — MASTERS ("Ustalar") ichiga
  // yashirincha qo'shib yuborilar edi, shuning uchun Avtomobil yozuvlari
  // Ustalar orasida "yo'qolib" ketardi. Endi o'ziga xos VEHICLES bo'limi bor.
  const DB_TYPE_TO_SEGMENT: Record<string, 'MASTERS' | 'SHOPS' | 'ORGANIZATIONS' | 'VEHICLES' | 'RENTALS'> = {
    USTA: 'MASTERS',
    DOKON_OBYEKT: 'SHOPS',
    MUASSASA: 'ORGANIZATIONS',
    TRANSPORT: 'VEHICLES',
    ARENDA: 'RENTALS',
  };

  // Fetch categories & listings from API
  const fetchData = async () => {
    try {
      const [catRes, listRes] = await Promise.all([
        apiFetch('/api/admin/categories'),
        apiFetch('/api/admin/listings'),
      ]);

      let fetchedListings: ListingItem[] = [];
      if (listRes.ok) {
        const rawList = await listRes.json();
        fetchedListings = rawList.map((item: any) => ({
          id: item.id,
          name: item.name,
          phone: item.phone,
          categoryName: item.category?.name || 'Xizmat',
          landmarkName: item.primaryLandmark?.name || 'Markaz',
          bayesianRating: item.bayesianRating || 4.8,
          verification: item.verification || 'COMMUNITY_UNVERIFIED',
          status: item.status || 'ACTIVE',
          updatedAt: item.updatedAt,
          type: DB_TYPE_TO_SEGMENT[item.type] || 'MASTERS',
        }));
        setListings(fetchedListings);
      }

      if (catRes.ok) {
        const rawCats = await catRes.json();
        const catSummaries: CategorySummary[] = rawCats.map((cat: any) => {
          const count = fetchedListings.filter(
            (l) => l.categoryName.toLowerCase() === cat.name.toLowerCase() && l.type === listingType
          ).length;
          return {
            id: cat.id,
            name: cat.name,
            count: count,
            synonyms: cat.synonyms || [cat.name.toLowerCase()],
            group: cat.group || 'Boshqa',
          };
        });
        // Avval faqat kamida 1 ta yozuvi bor kategoriyalar ko'rsatilardi —
        // shu sabab yangi qo'shilgan bo'lim (masalan "Arenda") birinchi
        // yozuv qo'shilmaguncha Bazada UMUMAN ko'rinmas edi, xuddi mavjud
        // emasdek. Endi HAMMA kategoriya doim ko'rinadi (0 ta yozuv bo'lsa
        // ham) — bo'lim tuzilishi har doim aniq va to'liq bo'lishi uchun.
        setCategories(catSummaries);
      }
    } catch (err) {
      console.error('Failed to load database data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    // 5 soniya juda tez edi — doim fon rejimida so'rov yuborilib, ilovani
    // sekinlashtirar edi. 20 soniya ham "jonli" his qiladi, lekin yukni kamaytiradi.
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, [listingType]);

  // Filter listings based on type, search query, category, and filter chips
  const getFilteredListings = () => {
    return listings.filter((item) => {
      // 1. Type filter
      if (item.type !== listingType) return false;

      // 2. Category filter
      if (selectedCategory && item.categoryName.toLowerCase() !== selectedCategory.name.toLowerCase()) return false;

      // 3. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesCategory = item.categoryName.toLowerCase().includes(query);
        const matchesLandmark = item.landmarkName?.toLowerCase().includes(query) || false;
        const matchesPhone = item.phone.includes(query);
        if (!matchesName && !matchesCategory && !matchesLandmark && !matchesPhone) return false;
      }

      // 4. Status/Verification filter
      if (activeFilter === 'verified') return item.verification === 'VERIFIED';
      if (activeFilter === 'unverified') return item.verification === 'COMMUNITY_UNVERIFIED';
      if (activeFilter === 'paused') return item.status === 'PAUSED';

      return true;
    });
  };

  const filteredListings = getFilteredListings();

  // Kategoriyalarni guruh bo'yicha to'playmiz (masalan "Qurilish va ta'mirlash",
  // "Avtomobil va transport" ...) — 76+ kasbni bitta tekis to'rda ko'rsatish
  // o'rniga, mantiqiy bo'limlarga ajratib, topishni osonlashtiradi.
  const groupedCategories = categories.reduce<Record<string, CategorySummary[]>>((acc, cat) => {
    const key = cat.group || 'Boshqa';
    if (!acc[key]) acc[key] = [];
    acc[key].push(cat);
    return acc;
  }, {});
  const groupOrder = Object.keys(groupedCategories).sort((a, b) => {
    if (a === 'Boshqa') return 1;
    if (b === 'Boshqa') return -1;
    return groupedCategories[b].length - groupedCategories[a].length;
  });

  // Color mappings for Category Icons
  const categoryGradients = [
    'from-blue-500 to-indigo-600',
    'from-emerald-400 to-teal-600',
    'from-amber-400 to-orange-500',
    'from-rose-500 to-pink-600',
    'from-purple-500 to-indigo-700',
    'from-cyan-400 to-blue-600',
  ];

  return (
    <div className="flex flex-col gap-4 animate-fade-in pb-16">
      
      {/* 1. HEADER BAR */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="p-1.5 text-on-surface-variant hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px] font-bold">arrow_back</span>
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-on-surface dark:text-slate-100">
              {selectedCategory ? selectedCategory.name : 'Baza'}
            </h1>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
              {selectedCategory ? `${filteredListings.length} ta yozuv` : `${listings.filter(l => l.type === listingType).length} ta jami`}
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('add')}
          className="bg-gradient-to-r from-[#2AABEE] to-[#0088CC] text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px] font-bold">add</span>
          Qo'shish
        </button>
      </div>

      {/* 2. SEGMENT CONTROL (Ustalar / Do'konlar / Muassasalar / Avtomobillar) —
          AddListingScreen'dagi "Turi" tanlovi bilan bir xil 2x2 ikonkali karta
          uslubida, butun ilova bo'ylab izchil va tartibli ko'rinish uchun. */}
      {!selectedCategory && (
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'MASTERS', label: 'Ustalar', icon: 'engineering' },
            { id: 'SHOPS', label: "Do'konlar", icon: 'storefront' },
            { id: 'ORGANIZATIONS', label: 'Muassasalar', icon: 'account_balance' },
            { id: 'VEHICLES', label: 'Avtomobillar', icon: 'directions_car' },
            { id: 'RENTALS', label: 'Arenda', icon: 'key' },
          ].map((seg) => (
            <button
              key={seg.id}
              onClick={() => {
                setListingType(seg.id as any);
              }}
              className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-left transition-all ${
                listingType === seg.id
                  ? 'bg-primary/10 dark:bg-sky-500/15 border-primary dark:border-sky-500 text-primary dark:text-sky-400 shadow-sm'
                  : 'bg-slate-50 dark:bg-[#1C2733] border-outline-variant/30 dark:border-slate-800 text-slate-500'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] shrink-0">{seg.icon}</span>
              <span className="text-xs font-bold truncate">{seg.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* 3. SEARCH BAR */}
      <div className="relative flex items-center w-full">
        <span className="material-symbols-outlined absolute left-3.5 text-slate-500 pointer-events-none text-[20px]">
          search
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Ism, kasb, telefon yoki mo'ljal..."
          className="w-full bg-surface-container-low dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-on-surface dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary dark:focus:border-sky-500 transition-colors shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 text-slate-400 hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* 4. FILTER CHIPS (Horizontal Scroll) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 -mx-4 px-4">
        {[
          { id: 'all', label: 'Hammasi', colorClass: 'bg-primary dark:bg-sky-500 text-white' },
          { id: 'verified', label: '✅ Tasdiqlangan', colorClass: 'bg-emerald-600 text-white' },
          { id: 'unverified', label: '⚠️ Tasdiqlanmagan', colorClass: 'bg-amber-500 text-white' },
          { id: 'paused', label: '⏸ Pauzada', colorClass: 'bg-slate-600 text-white' },
        ].map((chip) => (
          <button
            key={chip.id}
            onClick={() => {
              setActiveFilter(chip.id as any);
            }}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
              activeFilter === chip.id
                ? chip.colorClass
                : 'bg-surface-container-high dark:bg-[#1C2733] text-on-surface-variant dark:text-slate-300 border border-outline-variant/20'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* 5. VIEW 1: CATEGORY GRID grouped by profession family (Visible when no category is selected and no search) */}
      {!selectedCategory && !searchQuery ? (
        <div className="flex flex-col gap-5 mt-1">
          {groupOrder.map((groupName) => (
            <div key={groupName} className="flex flex-col gap-2.5">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-0.5">
                {groupName} · {groupedCategories[groupName].length}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {groupedCategories[groupName].map((cat, idx) => {
                  const grad = categoryGradients[idx % categoryGradients.length];
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat)}
                      className="bg-surface dark:bg-[#17212B] p-3.5 rounded-2xl border border-outline-variant/30 dark:border-slate-800 shadow-sm flex flex-col items-start gap-2 text-left hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      {/* Colored Icon Square */}
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${grad} text-white flex items-center justify-center font-bold text-sm shadow-sm`}>
                        {cat.name[0].toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-on-surface dark:text-slate-100 truncate w-full">
                          {cat.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                          {cat.count} ta yozuv
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* VIEW 2: LISTINGS ROWS */
        <div className="flex flex-col gap-2.5 mt-1">
          {filteredListings.length === 0 ? (
            <div className="bg-surface dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500 shadow-sm">
              Hech qanday yozuv topilmadi.
            </div>
          ) : (
            filteredListings.map((item) => (
              <div key={item.id} className="cursor-pointer" onClick={() => onSelectListing && onSelectListing(item.id)}>
                <RecordRow
                  name={item.name}
                  category={item.categoryName}
                  landmark={item.landmarkName}
                  phone={item.phone}
                  rating={item.bayesianRating}
                  isVerified={item.verification === 'VERIFIED'}
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
