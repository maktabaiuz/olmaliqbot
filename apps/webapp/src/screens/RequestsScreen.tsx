import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CategoryPicker } from '../components/CategoryPicker';

export interface UnresolvedCluster {
  id: string;
  clusterKey?: string;
  canonicalName: string;
  count: number;
  rawExamples: string[];
  isExistingCategory: boolean;
  matchedCategoryName?: string;
  matchedCategoryId?: string;
  isStale?: boolean;
  timeAgo?: string;
  queryLogIds?: string[];
}

export interface RequestsScreenProps {
  onNavigateTab: (tab: 'home' | 'add' | 'requests' | 'database' | 'more') => void;
  onSelectCategoryToAdd: (categoryName: string) => void;
}

const IOS_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, sans-serif';

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

  // Qo'lda kategoriya tanlash (bog'lash) — qaysi klaster uchun tanlagich ochiq
  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null);

  // Fetch Clusters from REST API
  const fetchClusters = async () => {
    setIsLoading(true);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch('/api/admin/requests/clusters', {
        headers: { 'x-init-data': initData },
      });
      if (res.ok) {
        const data = await res.json();
        setClusters(data);
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

  // Bog'lash — endi HAR QANDAY klaster uchun ishlaydi: agar tizim avtomatik
  // taxmin qilgan bo'lsa (matchedCategoryId) bitta bosish bilan tez, aks
  // holda admin o'zi qidiruv orqali kerakli kategoriyani tanlaydi (2026-09).
  const handleBindSynonym = async (cluster: UnresolvedCluster, categoryId: string) => {
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch('/api/admin/requests/bind-synonym', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-init-data': initData },
        body: JSON.stringify({
          categoryId,
          synonym: cluster.canonicalName,
        }),
      });

      if (res.ok) {
        setPickerOpenFor(null);
        setClusters(clusters.filter((c) => c.id !== cluster.id));
        if (cluster.queryLogIds) dismissQueryLogIds(cluster.queryLogIds);
      }
    } catch (err) {
      console.error("Bind synonym error:", err);
    }
  };

  // Klasterdagi QueryLog yozuvlarini haqiqatan isResolved=true qilib
  // belgilaydi — avval bu faqat brauzerda yashirilardi, sahifa
  // yangilansa qaytib chiqardi.
  const dismissQueryLogIds = async (queryLogIds: string[]) => {
    if (queryLogIds.length === 0) return;
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      await fetch('/api/admin/requests/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-init-data': initData },
        body: JSON.stringify({ queryLogIds }),
      });
    } catch (err) {
      console.error('Failed to dismiss cluster:', err);
    }
  };

  // Close Single Cluster Card (✕)
  const handleDismissCluster = (id: string) => {
    const cluster = clusters.find((c) => c.id === id);
    setClusters(clusters.filter((c) => c.id !== id));
    if (cluster?.queryLogIds) dismissQueryLogIds(cluster.queryLogIds);
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
    const idsToDismiss = clusters
      .filter((c) => selectedIds.includes(c.id))
      .flatMap((c) => c.queryLogIds || []);
    setClusters(clusters.filter((c) => !selectedIds.includes(c.id)));
    setSelectedIds([]);
    setIsMultiSelectMode(false);
    dismissQueryLogIds(idsToDismiss);
  };

  const filteredClusters = clusters.filter((c) => {
    if (activeFilter === 'missing') return !c.isExistingCategory;
    if (activeFilter === 'bindable') return c.isExistingCategory;
    return true;
  });

  const FILTERS: { key: 'all' | 'missing' | 'bindable'; label: string }[] = [
    { key: 'all', label: 'Barchasi' },
    { key: 'missing', label: "Bazada yo'q" },
    { key: 'bindable', label: 'Bazada bor' },
  ];

  return (
    <div className="animate-fade-in -mx-4 -mt-2 pb-20" style={{ fontFamily: IOS_FONT }}>
      {/* iOS Large Title header */}
      <div className="px-4 pt-1 pb-3">
        <div className="flex items-end justify-between">
          <h1 className="text-[28px] font-bold tracking-[-0.02em] text-on-surface dark:text-white leading-tight">
            So'rovlar
          </h1>
          <div className="flex items-center gap-3 mb-1.5">
            <span className="text-[13px] text-[#8E8E93] font-normal">{clusters.length} ta</span>
            <button
              type="button"
              onClick={() => {
                setIsMultiSelectMode(!isMultiSelectMode);
                setSelectedIds([]);
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                isMultiSelectMode ? 'bg-[#007AFF] dark:bg-[#0A84FF] text-white' : 'bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] text-[#007AFF] dark:text-[#0A84FF]'
              }`}
              title="Bir nechtasini tanlash"
            >
              <span className="material-symbols-outlined text-[18px]">checklist</span>
            </button>
          </div>
        </div>
        <p className="text-[13px] text-[#8E8E93] leading-snug mt-0.5">
          Foydalanuvchilar qidirgan, lekin bazada topilmagan so'rovlar — o'xshashlari birlashtirilgan.
        </p>
      </div>

      <div className="px-4 space-y-3">
        {/* iOS segmented control */}
        <div className="flex bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] rounded-[10px] p-[2px]">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`flex-1 py-1.5 rounded-[8px] text-[13px] font-medium transition-colors ${
                activeFilter === f.key
                  ? 'bg-white dark:bg-[#3A3A3C] text-on-surface dark:text-white shadow-sm'
                  : 'text-[#8E8E93]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* QUERY CLUSTER LIST */}
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-24 bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] animate-pulse rounded-[14px]" />
            <div className="h-24 bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] animate-pulse rounded-[14px]" />
          </div>
        ) : filteredClusters.length === 0 ? (
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[14px] p-8 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-14 h-14 rounded-full bg-[#34C759]/15 text-[#34C759] flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[32px]">task_alt</span>
            </div>
            <h3 className="font-semibold text-[16px] text-on-surface dark:text-white mb-1">
              Barcha so'rovlar hal qilingan
            </h3>
            <p className="text-[13px] text-[#8E8E93]">
              Hozircha topilmagan so'rovlar klasteri mavjud emas.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClusters.map((cluster, idx) => {
              const clusterId = cluster.id || cluster.clusterKey || `cluster_${idx}`;
              const isSelected = selectedIds.includes(clusterId);
              const exampleText = (Array.isArray(cluster.rawExamples) && cluster.rawExamples.length > 0)
                ? cluster.rawExamples[0]
                : cluster.canonicalName || 'so\'rov';
              const isPickerOpen = pickerOpenFor === clusterId;

              return (
                <div
                  key={clusterId}
                  className="rounded-[14px] shadow-sm overflow-hidden"
                  style={{ opacity: cluster.isStale ? 0.55 : 1 }}
                >
                  <div className="bg-white dark:bg-[#1C1C1E] p-3.5 flex items-start gap-3">
                    {isMultiSelectMode && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(clusterId)}
                        className="w-5 h-5 mt-0.5 rounded border-[#8E8E93] accent-[#007AFF] shrink-0"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h2 className="font-semibold text-[15px] text-on-surface dark:text-white capitalize truncate">
                            {cluster.canonicalName}
                          </h2>
                          <span
                            className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor: cluster.isExistingCategory ? 'rgba(255,149,0,0.15)' : 'rgba(255,59,48,0.12)',
                              color: cluster.isExistingCategory ? '#FF9500' : '#FF3B30',
                            }}
                          >
                            {cluster.isExistingCategory ? 'bazada bor' : "bazada yo'q"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[15px] font-semibold text-[#007AFF] dark:text-[#0A84FF]">
                            {cluster.count}
                          </span>
                          {!isMultiSelectMode && (
                            <button
                              type="button"
                              onClick={() => handleDismissCluster(clusterId)}
                              className="text-[#8E8E93] active:opacity-50"
                              title="O'chirish"
                            >
                              <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-[13px] text-on-surface-variant dark:text-slate-300 italic mb-2 truncate">
                        "{exampleText}"
                      </p>

                      {cluster.isExistingCategory && (
                        <p className="text-[12px] text-[#FF9500] font-medium mb-2 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">info</span>
                          taxminiy mos: {cluster.matchedCategoryName}
                        </p>
                      )}

                      {!isMultiSelectMode && (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPickerOpenFor(isPickerOpen ? null : clusterId)}
                              className="bg-[#007AFF] dark:bg-[#0A84FF] text-white rounded-full px-3.5 py-1.5 text-[12px] font-semibold active:opacity-70"
                            >
                              Bog'lash
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onSelectCategoryToAdd(cluster.canonicalName);
                                onNavigateTab('add');
                              }}
                              className="bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] text-on-surface dark:text-white rounded-full px-3.5 py-1.5 text-[12px] font-semibold active:opacity-70"
                            >
                              + Qo'shish
                            </button>
                          </div>
                          <span className="text-[11px] text-[#8E8E93] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">schedule</span>
                            {cluster.timeAgo || '10 min oldin'}
                          </span>
                        </div>
                      )}

                      {isPickerOpen && (
                        <CategoryPicker
                          defaultQuery={cluster.matchedCategoryName || ''}
                          onSelect={(categoryId) => handleBindSynonym(cluster, categoryId)}
                          onClose={() => setPickerOpenFor(null)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BATCH ACTION FLOATING BAR */}
      {isMultiSelectMode && selectedIds.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 max-w-container-max mx-auto bg-[#1C1C1E] text-white p-3.5 rounded-[14px] shadow-2xl z-50 flex items-center justify-between animate-slide-up">
          <span className="text-[13px] font-medium">{selectedIds.length} ta so'rov tanlandi</span>
          <button
            type="button"
            onClick={handleBatchClose}
            className="bg-[#FF3B30] text-white text-[13px] font-semibold px-4 py-2 rounded-[10px] active:opacity-70"
          >
            Yopish (O'chirish)
          </button>
        </div>
      )}
    </div>
  );
};
