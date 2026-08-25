import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { ErrorBanner } from '../components/ErrorBanner';

interface LandmarkRow {
  id: string;
  name: string;
  synonyms: string[];
}

export const LandmarksScreen: React.FC = () => {
  const [landmarks, setLandmarks] = useState<LandmarkRow[]>([]);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const fetchLandmarks = async () => {
    setLoading(true);
    setError(false);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch(`${API_BASE_URL}/admin/landmarks`, {
        headers: { 'x-telegram-init-data': initData },
      });
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setLandmarks(data || []);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLandmarks();
  }, []);

  const filtered = landmarks.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return l.name.toLowerCase().includes(q) || (l.synonyms || []).some((s) => s.toLowerCase().includes(q));
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex items-center">
        <span className="material-symbols-outlined absolute left-3.5 text-ios-gray text-[20px]">search</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mo'ljal yoki xalqona nom bo'yicha qidirish..."
          className="w-full pl-10 pr-4 py-2.5 rounded-btn bg-white dark:bg-[#16212F] border border-ios-sep dark:border-[#2C2C2E] text-[14px] focus:outline-none focus:border-tg"
        />
      </div>

      {error && <ErrorBanner message="Mo'ljallarni yuklashda xatolik yuz berdi" type="error" onRetry={fetchLandmarks} />}

      <div className="bg-white dark:bg-[#16212F] rounded-card border border-ios-sep dark:border-[#2C2C2E] shadow-card overflow-hidden">
        <div className="flex justify-between px-4 py-2.5 border-b border-ios-sep dark:border-[#2C2C2E] text-[11px] font-bold text-ios-gray uppercase tracking-wider">
          <span>Mo'ljal</span>
          <span>Xalqona nomlar</span>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-4 bg-ios-bg dark:bg-[#0E141B] rounded animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-ios-gray text-[13px]">Mo'ljal topilmadi</div>
        ) : (
          filtered.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-ios-sep/60 dark:border-[#2C2C2E]/60 last:border-b-0 text-[13px]"
            >
              <span className="font-semibold text-[#1C1C1E] dark:text-white shrink-0">📍 {l.name}</span>
              <span className="text-ios-gray text-right truncate">
                {l.synonyms && l.synonyms.length > 0 ? l.synonyms.join(', ') : '—'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
