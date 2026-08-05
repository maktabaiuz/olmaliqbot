import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { RecordRow } from '../components/RecordRow';

export interface CategorySummary {
  id: string;
  name: string;
  count: number;
  synonyms: string[];
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
}

export interface DatabaseScreenProps {
  onNavigateTab: (tab: 'home' | 'add' | 'requests' | 'database' | 'more') => void;
}

export const DatabaseScreen: React.FC<DatabaseScreenProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();

  // Navigation & View States
  const [selectedCategory, setSelectedCategory] = useState<CategorySummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'verified' | 'unverified' | 'incomplete' | 'stale' | 'paused'
  >('all');

  // Data States
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [listings, setListings] = useState<ListingItem[]>([]);

  // UI Modal States
  const [showBotReplyModal, setShowBotReplyModal] = useState(false);
  const [newSynonymInput, setNewSynonymInput] = useState('');
  const [showNewSynonymInput, setShowNewSynonymInput] = useState(false);

  // Fetch categories & listings from API
  const fetchData = async () => {
    try {
      const [catRes, listRes] = await Promise.all([
        fetch('http://localhost:4000/api/admin/categories'),
        fetch('http://localhost:4000/api/admin/listings'),
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
        }));
        setListings(fetchedListings);
      }

      if (catRes.ok) {
        const rawCats = await catRes.json();
        const catSummaries: CategorySummary[] = rawCats.map((cat: any) => {
          const count = fetchedListings.filter(
            (l) => l.categoryName.toLowerCase() === cat.name.toLowerCase()
          ).length;
          return {
            id: cat.id,
            name: cat.name,
            count: count > 0 ? count : 1, // Ensure category has count
            synonyms: cat.synonyms || [cat.name.toLowerCase()],
          };
        });
        setCategories(catSummaries);
      }
    } catch (err) {
      console.error('Failed to load database data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.cityId]);

  // Filter listings based on activeFilter
  const filterListings = (items: ListingItem[]) => {
    return items.filter((item) => {
      if (activeFilter === 'verified') return item.verification === 'VERIFIED';
      if (activeFilter === 'unverified') return item.verification === 'COMMUNITY_UNVERIFIED';
      if (activeFilter === 'incomplete') return item.status === 'INCOMPLETE';
      if (activeFilter === 'paused') return item.status === 'PAUSED';
      return true;
    });
  };

  // Add synonym to category
  const handleAddSynonym = async () => {
    if (!selectedCategory || !newSynonymInput.trim()) return;

    try {
      const res = await fetch('http://localhost:4000/api/admin/requests/bind-synonym', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedCategory.id,
          synonym: newSynonymInput.trim(),
        }),
      });

      if (res.ok) {
        const normSyn = newSynonymInput.trim().toLowerCase();
        setSelectedCategory({
          ...selectedCategory,
          synonyms: [...selectedCategory.synonyms, normSyn],
        });
        setNewSynonymInput('');
        setShowNewSynonymInput(false);
      }
    } catch (err) {
      console.error('Add synonym error:', err);
    }
  };

  // Global Search results across both categories and providers
  const isGlobalSearch = searchQuery.trim().length > 0;
  const searchedListings = listings.filter(
    (l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.landmarkName && l.landmarkName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-4 animate-fade-in pb-16">
      {/* HEADER BAR */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedCategory && !isGlobalSearch && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="p-1 text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
          )}
          <div>
            <h1 className="font-bold text-lg text-on-surface dark:text-slate-100 capitalize">
              {selectedCategory && !isGlobalSearch ? selectedCategory.name : "Baza"}
            </h1>
            <p className="text-xs text-on-surface-variant dark:text-slate-400">
              {selectedCategory && !isGlobalSearch
                ? `${selectedCategory.count} ta usta`
                : `${listings.length} ta yozuv`}
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('add')}
          className="bg-primary dark:bg-sky-500 text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm hover:bg-primary/90 transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Qo'shish
        </button>
      </div>

      {/* SEARCH SECTION */}
      <div className="relative flex items-center w-full">
        <span className="material-symbols-outlined absolute left-3.5 text-outline dark:text-slate-400 pointer-events-none text-[20px]">
          search
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Ism, kasb yoki mo'ljal"
          className="w-full h-11 bg-surface-container-lowest dark:bg-[#17212B] border border-outline-variant/40 dark:border-slate-800 rounded-xl pl-10 pr-4 text-sm text-on-surface dark:text-slate-100 placeholder:text-outline focus:outline-none focus:border-primary transition-all shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 text-outline hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* FILTER CHIPS (Horizontal Scroll) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            activeFilter === 'all'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface-container-lowest dark:bg-[#17212B] border border-outline-variant/30 text-on-surface-variant dark:text-slate-300'
          }`}
        >
          Hammasi
        </button>
        <button
          onClick={() => setActiveFilter('verified')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            activeFilter === 'verified'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-surface-container-lowest dark:bg-[#17212B] border border-outline-variant/30 text-on-surface-variant dark:text-slate-300'
          }`}
        >
          ✅ Tasdiqlangan
        </button>
        <button
          onClick={() => setActiveFilter('unverified')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            activeFilter === 'unverified'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-surface-container-lowest dark:bg-[#17212B] border border-outline-variant/30 text-on-surface-variant dark:text-slate-300'
          }`}
        >
          ⚠️ Tekshirilmagan
        </button>
        <button
          onClick={() => setActiveFilter('paused')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            activeFilter === 'paused'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'bg-surface-container-lowest dark:bg-[#17212B] border border-outline-variant/30 text-on-surface-variant dark:text-slate-300'
          }`}
        >
          Pauzadagi
        </button>
      </div>

      {/* VIEW 1: GLOBAL SEARCH MODE */}
      {isGlobalSearch ? (
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-outline dark:text-slate-400">
            Qidiruv natijalari ({searchedListings.length})
          </h3>
          {searchedListings.length === 0 ? (
            <div className="bg-surface-container-lowest dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-800 rounded-2xl p-8 text-center text-xs text-on-surface-variant">
              "{searchQuery}" bo'yicha hech narsa topilmadi.
            </div>
          ) : (
            searchedListings.map((item) => (
              <RecordRow
                key={item.id}
                name={item.name}
                category={item.categoryName}
                landmark={item.landmarkName}
                phone={item.phone}
                rating={item.bayesianRating}
                isVerified={item.verification === 'VERIFIED'}
              />
            ))
          )}
        </div>
      ) : selectedCategory ? (
        /* VIEW 2: CATEGORY DETAIL VIEW (STAGE 2) */
        <div className="space-y-4">
          {/* BOT REPLY PREVIEW BUTTON */}
          <button
            onClick={() => setShowBotReplyModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full border border-primary/40 text-primary dark:text-sky-400 font-semibold text-xs bg-primary-container/10 hover:bg-primary-container/20 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">visibility</span>
            Bot guruhda beradigan javobini ko'rish
          </button>

          {/* SYNONYMS SECTION */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-outline dark:text-slate-400">
              Kasb Sinonimlari
            </h3>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {selectedCategory.synonyms.map((syn) => (
                <div
                  key={syn}
                  className="px-3.5 py-1.5 rounded-full border border-outline-variant/40 bg-surface-container-lowest dark:bg-[#17212B] text-xs font-medium text-on-surface dark:text-slate-200 whitespace-nowrap shadow-sm"
                >
                  {syn}
                </div>
              ))}

              {showNewSynonymInput ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newSynonymInput}
                    onChange={(e) => setNewSynonymInput(e.target.value)}
                    placeholder="so'z..."
                    className="h-8 px-3 text-xs bg-surface dark:bg-slate-800 border border-primary rounded-full focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddSynonym}
                    className="h-8 px-3 bg-primary text-white text-xs rounded-full font-semibold"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewSynonymInput(true)}
                  className="px-3.5 py-1.5 rounded-full border border-dashed border-primary text-primary dark:text-sky-400 text-xs font-semibold whitespace-nowrap hover:bg-primary-container/10 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  so'z qo'shish
                </button>
              )}
            </div>
          </section>

          {/* CATEGORY PROVIDER LISTINGS */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-outline dark:text-slate-400">
              Ustalar Ro'yxati ({selectedCategory.name})
            </h3>
            {filterListings(
              listings.filter(
                (l) => l.categoryName.toLowerCase() === selectedCategory.name.toLowerCase()
              )
            ).map((item) => (
              <RecordRow
                key={item.id}
                name={item.name}
                category={item.categoryName}
                landmark={item.landmarkName}
                phone={item.phone}
                rating={item.bayesianRating}
                isVerified={item.verification === 'VERIFIED'}
              />
            ))}
          </section>
        </div>
      ) : (
        /* VIEW 3: CATEGORIES LIST VIEW (STAGE 1) */
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-outline dark:text-slate-400">
            Kasblar va Xizmatlar ({categories.length})
          </h3>

          {categories.map((cat) => {
            const isLowSupply = cat.count === 1;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat)}
                className={`w-full relative flex items-center justify-between rounded-xl p-4 shadow-sm border transition-all text-left ${
                  isLowSupply
                    ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/40 hover:bg-amber-500/20'
                    : 'bg-surface-container-lowest dark:bg-[#17212B] border-outline-variant/30 dark:border-slate-800 hover:bg-surface-container-low dark:hover:bg-slate-800/60'
                }`}
              >
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${
                    isLowSupply ? 'bg-amber-500' : 'bg-slate-400 dark:bg-slate-600'
                  }`}
                />
                <div className="pl-3.5 flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-on-surface dark:text-slate-100 capitalize">
                    {cat.name}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      isLowSupply
                        ? 'text-amber-600 dark:text-amber-400 font-bold'
                        : 'text-outline dark:text-slate-400'
                    }`}
                  >
                    {cat.count} ta {isLowSupply && '— kam'}
                  </span>
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      isLowSupply ? 'text-amber-500' : 'text-outline dark:text-slate-500'
                    }`}
                  >
                    chevron_right
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* BOT REPLY PREVIEW MODAL */}
      {showBotReplyModal && selectedCategory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary dark:text-sky-400">
                  smart_toy
                </span>
                <h3 className="font-bold text-sm">Bot Javobi Namunasi</h3>
              </div>
              <button
                onClick={() => setShowBotReplyModal(false)}
                className="text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Telegram Card Reply Mock */}
            <div className="bg-[#17212B] text-slate-100 p-4 rounded-xl text-xs space-y-2 font-sans border border-slate-700 shadow-md">
              <div className="font-bold text-sky-400">
                🛠️ {selectedCategory.name.toUpperCase()} (Eng ma'qul usta)
              </div>
              <p>
                👤 <b>Bahrom</b> ⭐ 4.8 (24 baho)
                <br />
                📍 Korzinka orqasi
                <br />
                📞 +998 90 123 45 67
              </p>
              <div className="pt-2 flex flex-col gap-1.5">
                <button className="bg-[#2AABEE] text-white py-1.5 px-3 rounded font-semibold text-[11px]">
                  📋 Telefon raqamini nusxalash
                </button>
                <button className="bg-slate-700 text-slate-300 py-1.5 px-3 rounded text-[11px]">
                  Yana 2 tasini ko'rish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
