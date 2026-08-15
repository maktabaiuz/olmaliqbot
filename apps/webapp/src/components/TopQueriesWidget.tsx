import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';

interface TopQueryItem {
  query: string;
  count: number;
  successRate: number;
}

export const TopQueriesWidget: React.FC = () => {
  const [topQueries, setTopQueries] = useState<TopQueryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchTopQueries = async () => {
      try {
        const initData = window.Telegram?.WebApp?.initData || '';
        const res = await fetch(`${API_BASE_URL}/admin/stats/top-queries`, {
          headers: { 'x-telegram-init-data': initData },
        });
        if (res.ok) {
          const data = await res.json();
          setTopQueries(data);
        }
      } catch (err) {
        console.error('Failed to fetch top queries', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopQueries();
  }, []);

  if (loading) {
    return <div className="p-4 text-center text-outline">Top so'rovlar yuklanmoqda...</div>;
  }

  return (
    <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-title-bold font-bold text-on-background flex items-center gap-2">
            🔥 Eng ko'p qidirilgan Top-10 so'rovlar
          </h2>
          <p className="text-body-secondary text-outline">Foydalanuvchilar botdan eng ko'p so'ragan xizmatlar</p>
        </div>
        <span className="text-caption bg-primary-container/40 text-primary font-bold px-2.5 py-1 rounded-full">
          Real-vaqt
        </span>
      </div>

      {topQueries.length === 0 ? (
        <p className="text-body-secondary text-outline text-center py-4">Hozircha statistika to'planmadi</p>
      ) : (
        <div className="space-y-2.5">
          {topQueries.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 bg-surface-low rounded-xl border border-outline-variant/60 hover:bg-surface-high transition"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-caption ${
                    idx === 0
                      ? 'bg-amber-500 text-white'
                      : idx === 1
                      ? 'bg-slate-400 text-white'
                      : idx === 2
                      ? 'bg-amber-700 text-white'
                      : 'bg-surface-high text-outline'
                  }`}
                >
                  {idx + 1}
                </span>
                <div>
                  <span className="font-semibold text-body-main text-on-background">{item.query}</span>
                  <div className="text-caption text-outline">Qidiruvlar soni: {item.count} marta</div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-caption font-bold text-primary">{item.successRate}% topildi</div>
                <div className="w-20 bg-surface-high rounded-full h-1.5 mt-1 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.successRate}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
