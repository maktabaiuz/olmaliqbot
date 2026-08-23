import React, { useEffect, useState } from 'react';
import { TopHeader } from '../components/common/TopHeader';
import { FilterChips } from '../components/common/FilterChips';
import { API_BASE_URL } from '../config';

export interface UnresolvedCluster {
  id: string;
  canonicalName: string;
  count: number;
  rawExamples: string[];
  isExistingCategory: boolean;
  matchedCategoryName?: string;
  matchedCategoryId?: string;
  timeAgo?: string;
}

export interface RequestsScreenProps {
  onNavigateTab?: (tab: string) => void;
  onSelectCategoryToAdd?: (categoryName: string) => void;
}

function formatTimeAgo(iso?: string): string {
  if (!iso) return 'Yangi';
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Hozirgina';
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return `${Math.floor(hours / 24)} kun oldin`;
}

export const RequestsScreen: React.FC<RequestsScreenProps> = ({ onNavigateTab, onSelectCategoryToAdd }) => {
  const [filter, setFilter] = useState<'all' | 'demand' | 'new'>('all');
  const [clusters, setClusters] = useState<UnresolvedCluster[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchClusters = async () => {
      setLoading(true);
      try {
        const initData = window.Telegram?.WebApp?.initData || '';
        const res = await fetch(`${API_BASE_URL}/admin/requests/clusters?filter=${filter}`, {
          headers: { 'x-telegram-init-data': initData },
        });
        if (res.ok) {
          const data = await res.json();
          setClusters(
            (data || []).map((c: any) => ({
              id: c.clusterKey,
              canonicalName: c.canonicalName,
              count: c.count,
              rawExamples: c.rawExamples || [],
              isExistingCategory: c.isExistingCategory,
              matchedCategoryName: c.matchedCategoryName,
              matchedCategoryId: c.matchedCategoryId,
              timeAgo: formatTimeAgo(c.latestAt),
            }))
          );
        }
      } catch (err) {
        console.error('Failed to fetch clusters:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchClusters();
  }, [filter]);

  const handleAddCategory = (categoryName: string) => {
    onSelectCategoryToAdd?.(categoryName);
  };

  const handleDismissCluster = (id: string) => {
    setClusters(clusters.filter((c) => c.id !== id));
  };

  return (
    <div className="flex flex-col gap-3 pb-20 animate-fade-in max-w-container-max mx-auto">
      <TopHeader
        title="Topilmagan so'rovlar"
        subtitle="AI tomonidan klasterlangan va javob kutilayotgan savollar"
        showBack
        onBack={() => onNavigateTab?.('home')}
      />

      <div className="px-4 flex flex-col gap-3">
        {/* Filter Chips */}
        <FilterChips
          chips={[
            { id: 'all', label: 'Hammasi' },
            { id: 'demand', label: 'Talab yuqori' },
            { id: 'new', label: "Yangi so'rovlar" },
          ]}
          selectedId={filter}
          onChange={(val) => setFilter(val)}
        />

        {/* Clusters Cards List */}
        {loading ? (
          <div className="space-y-3 pt-2">
            {[1, 2].map((n) => (
              <div key={n} className="h-32 bg-white dark:bg-[#16212F] rounded-card animate-pulse" />
            ))}
          </div>
        ) : clusters.length === 0 ? (
          <div className="p-8 text-center text-tg-textMuted text-[14px]">
            Hozircha topilmagan so'rovlar yo'q 👍
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {clusters.map((c) => (
              <div
                key={c.id}
                className="bg-white dark:bg-[#16212F] p-4 rounded-card border border-ios-separator/50 dark:border-ios-darkSeparator/50 shadow-card flex flex-col gap-2.5 relative"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold bg-ios-red/15 text-ios-red px-2.5 py-0.5 rounded-pill">
                      {c.count}× so'ralgan
                    </span>
                    <h4 className="font-bold text-[16px] text-tg-textLight dark:text-tg-textDark">
                      {c.canonicalName}
                    </h4>
                  </div>
                  <span className="text-[11px] text-tg-textMuted">{c.timeAgo || 'Yangi'}</span>
                </div>

                {/* Example query text */}
                <div className="bg-tg-bgLight dark:bg-tg-bgDark p-2.5 rounded-btn text-[12px] text-tg-textMuted italic border border-ios-separator/30">
                  "{c.rawExamples[0] || c.canonicalName}"
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between pt-1 border-t border-ios-separator/40">
                  <button
                    type="button"
                    onClick={() => handleAddCategory(c.canonicalName)}
                    className="px-3.5 py-1.5 bg-tg-blue text-white rounded-pill text-[12px] font-bold shadow-sm active-scale flex items-center gap-1"
                  >
                    <span>＋ Yozuv qo'shish</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDismissCluster(c.id)}
                    className="px-3 py-1.5 text-tg-textMuted hover:text-ios-red text-[12px] font-semibold"
                  >
                    Yopish ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
