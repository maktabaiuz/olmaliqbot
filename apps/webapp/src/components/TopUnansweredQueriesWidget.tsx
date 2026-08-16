import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';

export interface UnansweredQueryItem {
  id: string;
  query: string;
  count: number;
  suggestedCategory?: string;
}

export interface TopUnansweredQueriesWidgetProps {
  onSelectCategoryToAdd: (categoryName: string) => void;
}

export const TopUnansweredQueriesWidget: React.FC<TopUnansweredQueriesWidgetProps> = ({
  onSelectCategoryToAdd,
}) => {
  const [queries, setQueries] = useState<UnansweredQueryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchTopUnanswered = async () => {
      setLoading(true);
      try {
        const initData = window.Telegram?.WebApp?.initData || '';
        const res = await fetch(`${API_BASE_URL}/admin/top-queries?period=today&status=unanswered`, {
          headers: { 'x-telegram-init-data': initData },
        });

        if (res.ok) {
          const data = await res.json();
          setQueries(data);
        }
      } catch (err) {
        console.error('Failed to fetch top unanswered queries', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopUnanswered();
  }, []);

  if (loading) {
    return (
      <div className="bg-surface-container dark:bg-[#1C2733] rounded-[14px] p-4 border border-outline-variant/30 dark:border-slate-800 animate-pulse text-caption text-outline text-center">
        Bugungi top so'rovlar yuklanmoqda...
      </div>
    );
  }

  return (
    <section className="bg-surface-container dark:bg-[#1C2733] rounded-[14px] p-4 border border-outline-variant/30 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-title-bold font-bold text-on-surface dark:text-slate-100 flex items-center gap-2">
          🔥 Bugun eng ko'p so'ralgan (javobsiz)
        </h2>
        {queries.length > 0 && (
          <span className="text-caption font-bold bg-error/15 text-error px-2.5 py-0.5 rounded-full">
            {queries.length} ta
          </span>
        )}
      </div>

      {queries.length === 0 ? (
        <div className="py-4 text-center text-body-secondary text-outline flex items-center justify-center gap-2">
          Bugun javobsiz savol yo'q 👍
        </div>
      ) : (
        <div className="space-y-2">
          {queries.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectCategoryToAdd(item.suggestedCategory || item.query)}
              className="flex items-center justify-between p-3 bg-surface-low dark:bg-[#17212B] rounded-[14px] border border-outline-variant/40 dark:border-slate-800/60 hover:bg-surface-high dark:hover:bg-slate-800/80 transition-all cursor-pointer active:scale-98"
            >
              <div className="flex-1 pr-3">
                <span className="text-body-main font-semibold text-on-surface dark:text-slate-100 line-clamp-1">
                  {item.query}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-caption font-bold bg-error/15 text-error px-2 py-0.5 rounded-full">
                  {item.count} marta
                </span>
                <span className="material-symbols-outlined text-[18px] text-outline">
                  chevron_right
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
