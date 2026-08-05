import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export interface UnresolvedCluster {
  id: string;
  canonicalName: string;
  count: number;
  rawExamples: string[];
  isExistingCategory: boolean;
  matchedCategoryName?: string;
  matchedCategoryId?: string;
  isStale?: boolean;
  timeAgo?: string;
}

export interface RequestsScreenProps {
  onNavigateTab: (tab: 'home' | 'add' | 'requests' | 'database' | 'more') => void;
  onSelectCategoryToAdd: (categoryName: string) => void;
}

export const RequestsScreen: React.FC<RequestsScreenProps> = ({
  onNavigateTab,
  onSelectCategoryToAdd,
}) => {
  const { user } = useAuth();
  const [clusters, setClusters] = useState<UnresolvedCluster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'missing' | 'bindable'>('all');
  
  // Multi-select state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch Clusters from REST API
  const fetchClusters = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/admin/requests/clusters');
      if (res.ok) {
        const data = await res.json();

        // Add dummy mock fallbacks if DB is empty for demonstration
        if (data.length === 0) {
          setClusters([
            {
              id: 'c-1',
              canonicalName: 'kafelchi',
              count: 14,
              rawExamples: ['kechasi ishlaydigan kafelchi bormi?'],
              isExistingCategory: false,
              isStale: false,
              timeAgo: '10 min oldin',
            },
            {
              id: 'c-2',
              canonicalName: 'plitkachi',
              count: 3,
              rawExamples: ['plitkachi usta telefon noilmi?'],
              isExistingCategory: true,
              matchedCategoryName: 'kafelchi',
              matchedCategoryId: 'cat-kafelchi',
              isStale: false,
              timeAgo: '1 soat oldin',
            },
            {
              id: 'c-3',
              canonicalName: 'natyajnoy potolok',
              count: 5,
              rawExamples: ['potolok ustasi bormi?'],
              isExistingCategory: false,
              isStale: true,
              timeAgo: '2 oy oldin',
            },
          ]);
        } else {
          setClusters(data);
        }
      }
    } catch (err) {
      console.error("Failed to load requests clusters:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClusters();
  }, [user?.cityId]);

  // Bind Synonym Action (Sariq Bog'lash)
  const handleBindSynonym = async (cluster: UnresolvedCluster) => {
    if (!cluster.matchedCategoryId) {
      alert("Mos keladigan kategoriya ID topilmadi");
      return;
    }

    try {
      const res = await fetch('http://localhost:4000/api/admin/requests/bind-synonym', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: cluster.matchedCategoryId,
          synonym: cluster.canonicalName,
        }),
      });

      if (res.ok) {
        alert(`"${cluster.canonicalName}" so'zi "${cluster.matchedCategoryName}" kategoriyasiga sinonim bo'lib bog'landi! ✅`);
        setClusters(clusters.filter((c) => c.id !== cluster.id));
      }
    } catch (err) {
      console.error("Bind synonym error:", err);
    }
  };

  // Close Single Cluster Card (✕)
  const handleDismissCluster = (id: string) => {
    setClusters(clusters.filter((c) => c.id !== id));
  };

  // Toggle Selection for Multi-select
  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Batch Close Selected Items
  const handleBatchClose = () => {
    setClusters(clusters.filter((c) => !selectedIds.includes(c.id)));
    setSelectedIds([]);
    setIsMultiSelectMode(false);
  };

  const filteredClusters = clusters.filter((c) => {
    if (activeFilter === 'missing') return !c.isExistingCategory;
    if (activeFilter === 'bindable') return c.isExistingCategory;
    return true;
  });

  return (
    <div className="flex flex-col gap-4 animate-fade-in pb-16">
      {/* HEADER BAR */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg text-on-surface dark:text-slate-100">
            Topilmagan So'rovlar
          </h1>
          <p className="text-xs text-on-surface-variant dark:text-slate-400">
            Foydalanuvchilar qidirgan, lekin bazada topilmagan so'rovlar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-primary-container/20 text-primary dark:text-sky-400 px-2.5 py-1 rounded-full border border-primary/20">
            {clusters.length} ta
          </span>
          <button
            type="button"
            onClick={() => {
              setIsMultiSelectMode(!isMultiSelectMode);
              setSelectedIds([]);
            }}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              isMultiSelectMode
                ? 'bg-primary text-white'
                : 'bg-surface-container-high dark:bg-slate-800 text-on-surface-variant dark:text-slate-300'
            }`}
            title="Bir nechtasini tanlash"
          >
            <span className="material-symbols-outlined text-[20px]">checklist</span>
          </button>
        </div>
      </div>

      {/* FILTER CHIPS */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            activeFilter === 'all'
              ? 'bg-primary text-white shadow-md'
              : 'bg-surface-container-high dark:bg-slate-800 text-on-surface-variant dark:text-slate-300'
          }`}
        >
          Barchasi ({clusters.length})
        </button>
        <button
          onClick={() => setActiveFilter('missing')}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            activeFilter === 'missing'
              ? 'bg-error text-white shadow-md'
              : 'bg-surface-container-high dark:bg-slate-800 text-on-surface-variant dark:text-slate-300'
          }`}
        >
          Bazada yo'q (+ Qo'shish)
        </button>
        <button
          onClick={() => setActiveFilter('bindable')}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            activeFilter === 'bindable'
              ? 'bg-amber-500 text-white shadow-md'
              : 'bg-surface-container-high dark:bg-slate-800 text-on-surface-variant dark:text-slate-300'
          }`}
        >
          Bazada bor (Bog'lash)
        </button>
      </div>

      {/* QUERY CLUSTER LIST */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-24 bg-surface-container-high dark:bg-slate-800 animate-pulse rounded-2xl" />
          <div className="h-24 bg-surface-container-high dark:bg-slate-800 animate-pulse rounded-2xl" />
        </div>
      ) : filteredClusters.length === 0 ? (
        <div className="bg-surface-container-lowest dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[32px]">task_alt</span>
          </div>
          <h3 className="font-bold text-base text-on-surface dark:text-slate-100 mb-1">
            Barcha so'rovlar hal qilingan 🎉
          </h3>
          <p className="text-xs text-on-surface-variant dark:text-slate-400">
            Hozircha topilmagan so'rovlar klasteri mavjud emas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClusters.map((cluster) => {
            const isSelected = selectedIds.includes(cluster.id);

            return (
              <div
                key={cluster.id}
                className={`relative rounded-2xl p-4 shadow-sm border transition-all flex items-center ${
                  cluster.isStale
                    ? 'bg-surface-container-lowest dark:bg-[#17212B]/60 border-outline-variant/30 opacity-60 grayscale-[20%]'
                    : 'bg-surface dark:bg-[#17212B] border-outline-variant/30 dark:border-slate-800 hover:shadow-md'
                }`}
              >
                {/* Left Color Accent Bar */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${
                    cluster.isStale
                      ? 'bg-slate-400'
                      : cluster.isExistingCategory
                      ? 'bg-amber-500'
                      : 'bg-error dark:bg-red-500'
                  }`}
                />

                {/* Multi-select Checkbox */}
                {isMultiSelectMode && (
                  <div className="pr-3 pl-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(cluster.id)}
                      className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary"
                    />
                  </div>
                )}

                <div className="flex-1 pl-2.5 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="font-bold text-base text-on-surface dark:text-slate-100 capitalize">
                      {cluster.canonicalName}
                    </h2>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-base text-primary dark:text-sky-400">
                        {cluster.count}
                      </span>
                      {!isMultiSelectMode && (
                        <button
                          type="button"
                          onClick={() => handleDismissCluster(cluster.id)}
                          className="text-outline hover:text-error transition-colors p-1"
                          title="O'chirish"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Raw Example User Chat Text */}
                  <p className="text-xs text-on-surface-variant dark:text-slate-300 mb-3 italic">
                    "{cluster.rawExamples[0] || 'kafelchi kerak edida'}"
                  </p>

                  {/* Matched info if exists */}
                  {cluster.isExistingCategory && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-3 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">info</span>
                      bazada bor: {cluster.matchedCategoryName || 'kafelchi'}
                    </p>
                  )}

                  {/* Card Action & Timestamp */}
                  <div className="flex items-center justify-between">
                    {!isMultiSelectMode && (
                      cluster.isExistingCategory ? (
                        <button
                          type="button"
                          onClick={() => handleBindSynonym(cluster)}
                          className="bg-amber-500 text-white rounded-full px-4 py-1.5 text-xs font-bold shadow-sm hover:bg-amber-600 active:scale-95 transition-all"
                        >
                          Bog'lash
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectCategoryToAdd(cluster.canonicalName);
                            onNavigateTab('add');
                          }}
                          className="bg-error dark:bg-red-500 text-white rounded-full px-4 py-1.5 text-xs font-bold shadow-sm hover:bg-red-600 active:scale-95 transition-all"
                        >
                          + Qo'shish
                        </button>
                      )
                    )}

                    <span className="text-[11px] text-outline dark:text-slate-500 flex items-center gap-1 ml-auto">
                      <span className="material-symbols-outlined text-[13px]">schedule</span>
                      {cluster.timeAgo || '10 min oldin'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BATCH ACTION FLOATING BAR */}
      {isMultiSelectMode && selectedIds.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 max-w-container-max mx-auto bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl z-50 flex items-center justify-between animate-slide-up">
          <span className="text-xs font-bold">{selectedIds.length} ta so'rov tanlandi</span>
          <button
            type="button"
            onClick={handleBatchClose}
            className="bg-error text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-red-600 transition-colors shadow-sm"
          >
            Yopish (O'chirish)
          </button>
        </div>
      )}
    </div>
  );
};
