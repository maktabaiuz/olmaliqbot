import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CategoryPicker } from '../components/CategoryPicker';
import { IosHeader } from '../components/ios/IosHeader';

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
    <div className="animate-fade-in -mx-4 -mt-2 pb-20">
      {/* iOS Large Title header */}
      <div className="px-4 pt-1 pb-3">
        <IosHeader
          title="So'rovlar"
          subtitle="Foydalanuvchilar qidirgan, lekin bazada topilmagan so'rovlar — o'xshashlari birlashtirilgan."
          trailing={
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-ios-label-secondary/70 font-normal">{clusters.length} ta</span>
              <button
                type="button"
                onClick={() => {
                  setIsMultiSelectMode(!isMultiSelectMode);
                  setSelectedIds([]);
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isMultiSelectMode ? 'bg-ios-blue text-white' : 'bg-ios-fill/[0.12] text-ios-blue'
                }`}
                title="Bir nechtasini tanlash"
              >
                <span className="material-symbols-outlined text-[18px]">checklist</span>
              </button>
            </div>
          }
        />
      </div>

      <div className="px-4 space-y-3">
        {/* iOS segmented control */}
        <div className="flex bg-ios-fill/[0.12] rounded-ios p-[2px]">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`flex-1 py-1.5 rounded-[8px] text-[13px] font-medium transition-colors ${
                activeFilter === f.key
                  ? 'bg-ios-card text-ios-label shadow-sm'
                  : 'text-ios-label-secondary/70'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* QUERY CLUSTER LIST */}
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-24 bg-ios-fill/20 animate-pulse rounded-ios-lg" />
            <div className="h-24 bg-ios-fill/20 animate-pulse rounded-ios-lg" />
          </div>
        ) : filteredClusters.length === 0 ? (
          <div className="bg-ios-card rounded-ios-lg p-8 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-14 h-14 rounded-full bg-ios-green/15 text-ios-green flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[32px]">task_alt</span>
            </div>
            <h3 className="font-semibold text-[16px] text-ios-label mb-1">
              Barcha so'rovlar hal qilingan
            </h3>
            <p className="text-[13px] text-ios-label-secondary/70">
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
                  className="rounded-ios-lg shadow-sm overflow-hidden"
                  style={{ opacity: cluster.isStale ? 0.55 : 1 }}
                >
                  <div className="bg-ios-card p-3.5 flex items-start gap-3">
                    {isMultiSelectMode && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(clusterId)}
                        className="w-5 h-5 mt-0.5 rounded accent-ios-blue shrink-0"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h2 className="font-semibold text-[15px] text-ios-label capitalize truncate">
                            {cluster.canonicalName}
                          </h2>
                          <span
                            className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              cluster.isExistingCategory ? 'bg-ios-orange/15 text-ios-orange' : 'bg-ios-red/[0.12] text-ios-red'
                            }`}
                          >
                            {cluster.isExistingCategory ? 'bazada bor' : "bazada yo'q"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[15px] font-semibold text-ios-blue">
                            {cluster.count}
                          </span>
                          {!isMultiSelectMode && (
                            <button
                              type="button"
                              onClick={() => handleDismissCluster(clusterId)}
                              className="text-ios-label-secondary/70 active:opacity-50"
                              title="O'chirish"
                            >
                              <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-[13px] text-ios-label-secondary/70 italic mb-2 truncate">
                        "{exampleText}"
                      </p>

                      {cluster.isExistingCategory && (
                        <p className="text-[12px] text-ios-orange font-medium mb-2 flex items-center gap-1">
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
                              className="bg-ios-blue text-white rounded-full px-3.5 py-1.5 text-[12px] font-semibold active:opacity-70"
                            >
                              Bog'lash
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onSelectCategoryToAdd(cluster.canonicalName);
                                onNavigateTab('add');
                              }}
                              className="bg-ios-fill/[0.12] text-ios-label rounded-full px-3.5 py-1.5 text-[12px] font-semibold active:opacity-70"
                            >
                              + Qo'shish
                            </button>
                          </div>
                          <span className="text-[11px] text-ios-label-secondary/70 flex items-center gap-1">
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
        <div className="fixed bottom-20 left-4 right-4 max-w-container-max mx-auto bg-[#1C1C1E] text-white p-3.5 rounded-ios-lg shadow-2xl z-50 flex items-center justify-between animate-slide-up">
          <span className="text-[13px] font-medium">{selectedIds.length} ta so'rov tanlandi</span>
          <button
            type="button"
            onClick={handleBatchClose}
            className="bg-ios-red text-white text-[13px] font-semibold px-4 py-2 rounded-ios active:opacity-70"
          >
            Yopish (O'chirish)
          </button>
        </div>
      )}
    </div>
  );
};
