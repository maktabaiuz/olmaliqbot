import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { RecordRow } from '../components/RecordRow';
import { NavTab } from '../components/BottomNav';
import { apiFetch } from '../config';
import { IosHeader } from '../components/ios/IosHeader';
import { IosSearchBar } from '../components/ios/IosSearchBar';
import { useFeedback } from '../context/FeedbackContext';

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
  categoryId: string;
  categoryName: string;
  landmarkName?: string;
  priorityRank?: number | null;
  verification: 'VERIFIED' | 'COMMUNITY_UNVERIFIED';
  status: 'ACTIVE' | 'PAUSED' | 'INCOMPLETE';
  updatedAt?: string;
  type: 'MASTERS' | 'SHOPS' | 'ORGANIZATIONS' | 'VEHICLES' | 'RENTALS' | 'FUEL_STATIONS';
}

export interface DatabaseScreenProps {
  onNavigateTab: (tab: NavTab) => void;
  onSelectListing?: (listingId: string) => void;
}

export const DatabaseScreen: React.FC<DatabaseScreenProps> = ({ onNavigateTab, onSelectListing }) => {
  const { user } = useAuth();
  const { showToast } = useFeedback();
  // MUHIM (2026-09): "1/2/3-o'rin" belgilash backendda FAQAT SUPER_ADMIN'ga
  // ruxsat etilgan (requireSuperAdmin). Avval bu yerda hech qanday rol
  // tekshiruvi yo'q edi — CITY_ADMIN/moderator tugmani bossa, server 403
  // qaytarardi, UI esa sukut ravishda eski holatga qaytib, HECH QANDAY
  // xato ko'rsatmasdi — tugma "shunchaki ishlamayapti"dek ko'rinardi.
  const canSetPriority = user?.role === 'SUPER_ADMIN';

  // Navigation & View States
  const [selectedCategory, setSelectedCategory] = useState<CategorySummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [listingType, setListingType] = useState<'MASTERS' | 'SHOPS' | 'ORGANIZATIONS' | 'VEHICLES' | 'RENTALS' | 'FUEL_STATIONS'>('MASTERS');
  const [activeFilter, setActiveFilter] = useState<'all' | 'verified' | 'unverified' | 'paused'>('all');

  // Data States
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [listings, setListings] = useState<ListingItem[]>([]);

  // Backend Prisma enum (USTA/DOKON_OBYEKT/MUASSASA/TRANSPORT) -> Frontend segment ids.
  // Avval TRANSPORT alohida bo'lim topilmasdi — MASTERS ("Ustalar") ichiga
  // yashirincha qo'shib yuborilar edi, shuning uchun Avtomobil yozuvlari
  // Ustalar orasida "yo'qolib" ketardi. Endi o'ziga xos VEHICLES bo'limi bor.
  const DB_TYPE_TO_SEGMENT: Record<string, 'MASTERS' | 'SHOPS' | 'ORGANIZATIONS' | 'VEHICLES' | 'RENTALS' | 'FUEL_STATIONS'> = {
    USTA: 'MASTERS',
    DOKON_OBYEKT: 'SHOPS',
    MUASSASA: 'ORGANIZATIONS',
    TRANSPORT: 'VEHICLES',
    ARENDA: 'RENTALS',
    ZAPRAVKA: 'FUEL_STATIONS',
  };
  // Teskari moslik (frontend segment -> backend objectType) — kategoriya
  // grid'ini joriy tabga mos kategoriyalar bilan cheklash uchun.
  const SEGMENT_TO_DB_TYPE: Record<string, string> = {
    MASTERS: 'USTA',
    SHOPS: 'DOKON_OBYEKT',
    ORGANIZATIONS: 'MUASSASA',
    VEHICLES: 'TRANSPORT',
    RENTALS: 'ARENDA',
    FUEL_STATIONS: 'ZAPRAVKA',
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
          categoryId: item.category?.id || item.categoryId,
          categoryName: item.category?.name || 'Xizmat',
          landmarkName: item.primaryLandmark?.name || 'Markaz',
          priorityRank: item.priorityRank ?? null,
          verification: item.verification || 'COMMUNITY_UNVERIFIED',
          status: item.status || 'ACTIVE',
          updatedAt: item.updatedAt,
          type: DB_TYPE_TO_SEGMENT[item.type] || 'MASTERS',
        }));
        setListings(fetchedListings);
      }

      if (catRes.ok) {
        const rawCats = await catRes.json();
        // Faqat joriy tabga (Ustalar/Do'konlar/Muassasalar/Avtomobillar/
        // Arenda) mos kategoriyalarni ko'rsatamiz. Avval bu filtr yo'q edi —
        // buni "count > 0" filtri tasodifan yashirib turardi (boshqa turdagi
        // kategoriyalarning shu tabda hisobi doim 0 bo'lgani uchun), lekin
        // 0-hisobli kategoriyalar ham ko'rinadigan qilingandan keyin bu
        // yashirin xato ochilib qoldi — barcha turlar bir-biriga aralashib
        // ko'rinib qoldi.
        const currentDbType = SEGMENT_TO_DB_TYPE[listingType];
        const rawCatsForType = rawCats.filter((cat: any) => !cat.objectType || cat.objectType === currentDbType);
        const catSummaries: CategorySummary[] = rawCatsForType.map((cat: any) => {
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

  // "1/2/3-o'rin" belgisini o'rnatish/o'chirish — bosilgan zahoti ekranda
  // (optimistic) yangilanadi, so'ng serverga yuboriladi; xato bo'lsa eski
  // holatga qaytariladi, shunda admin har doim aniq nima saqlanganini ko'radi.
  const handleSetPriority = async (listing: ListingItem, rank: number | null) => {
    const prevListings = listings;
    setListings((prev) =>
      prev.map((l) => {
        if (l.id === listing.id) return { ...l, priorityRank: rank };
        // Bir xil kategoriyada bir vaqtda faqat bitta yozuv shu raqamni
        // ushlab turishi mumkin — server ham shunday qiladi, UI ham darhol
        // shu holatni aks ettirishi kerak.
        if (rank !== null && l.categoryId === listing.categoryId && l.priorityRank === rank) {
          return { ...l, priorityRank: null };
        }
        return l;
      })
    );
    try {
      const res = await apiFetch(`/api/admin/listings/${listing.id}/priority`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priorityRank: rank }),
      });
      if (!res.ok) throw new Error('Saqlashda xato');
      await fetchData();
    } catch (err) {
      console.error('Failed to set priority:', err);
      setListings(prevListings);
      showToast("O'rinni belgilashda xato yuz berdi", 'error');
    }
  };

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
      <IosHeader
        title={selectedCategory ? selectedCategory.name : 'Baza'}
        subtitle={selectedCategory ? `${filteredListings.length} ta yozuv` : `${listings.filter(l => l.type === listingType).length} ta jami`}
        onBack={selectedCategory ? () => setSelectedCategory(null) : undefined}
        trailing={
          <button
            onClick={() => onNavigateTab('add')}
            className="bg-ios-blue text-white px-4 py-1.5 rounded-full text-[13px] font-bold active:opacity-70 transition-opacity flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px] font-bold">add</span>
            Qo'shish
          </button>
        }
      />

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
            { id: 'FUEL_STATIONS', label: 'Zapravkalar', icon: 'local_gas_station' },
          ].map((seg) => (
            <button
              key={seg.id}
              onClick={() => {
                setListingType(seg.id as any);
              }}
              className={`flex items-center gap-2 px-3 py-3 rounded-ios border text-left transition-all ${
                listingType === seg.id
                  ? 'bg-ios-blue/10 border-ios-blue text-ios-blue shadow-sm'
                  : 'bg-ios-card border-transparent text-ios-label-secondary/70'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] shrink-0">{seg.icon}</span>
              <span className="text-[13px] font-bold truncate">{seg.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* 3. SEARCH BAR */}
      <IosSearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Ism, kasb, telefon yoki mo'ljal..." />

      {/* 4. FILTER CHIPS (Horizontal Scroll) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 -mx-4 px-4">
        {[
          { id: 'all', label: 'Hammasi', colorClass: 'bg-ios-blue text-white' },
          { id: 'verified', label: '✅ Tasdiqlangan', colorClass: 'bg-ios-green text-white' },
          { id: 'unverified', label: '⚠️ Tasdiqlanmagan', colorClass: 'bg-ios-orange text-white' },
          { id: 'paused', label: '⏸ Pauzada', colorClass: 'bg-ios-label-secondary text-white' },
        ].map((chip) => (
          <button
            key={chip.id}
            onClick={() => {
              setActiveFilter(chip.id as any);
            }}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
              activeFilter === chip.id
                ? chip.colorClass
                : 'bg-ios-fill/[0.12] text-ios-label-secondary/70'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* 5. VIEW 1: CATEGORY LIST grouped by profession family — bitta
          ustunli, yuqoridan pastga tartibli qator ro'yxati (avval 2 ustunli
          kartalar edi, webapp'da qulay/tartibli emasligi sababli soddalashtirildi). */}
      {!selectedCategory && !searchQuery ? (
        <div className="flex flex-col gap-5 mt-1">
          {groupOrder.map((groupName) => (
            <div key={groupName} className="flex flex-col gap-1.5">
              <h3 className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide px-4">
                {groupName} · {groupedCategories[groupName].length}
              </h3>
              <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden">
                {groupedCategories[groupName].map((cat, idx) => {
                  const grad = categoryGradients[idx % categoryGradients.length];
                  const isLast = idx === groupedCategories[groupName].length - 1;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-ios-fill/10 transition-colors text-left"
                      style={isLast ? undefined : { borderBottom: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}
                    >
                      {/* Colored Icon Square */}
                      <div className={`w-8 h-8 rounded-ios bg-gradient-to-tr ${grad} text-white flex items-center justify-center font-bold text-[13px] shrink-0`}>
                        {cat.name[0].toUpperCase()}
                      </div>
                      <h4 className="flex-1 font-normal text-[15px] text-ios-label truncate">
                        {cat.name}
                      </h4>
                      <span className="text-[12px] text-ios-label-secondary/70 font-normal shrink-0">
                        {cat.count} ta yozuv
                      </span>
                      <span className="material-symbols-outlined text-[18px] text-ios-label-secondary/50 shrink-0">
                        chevron_right
                      </span>
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
            <div className="bg-ios-card rounded-ios p-8 text-center text-[13px] text-ios-label-secondary/70 shadow-sm">
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
                  priorityRank={item.priorityRank}
                  isVerified={item.verification === 'VERIFIED'}
                  onSetPriority={canSetPriority ? (rank) => handleSetPriority(item, rank) : undefined}
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
