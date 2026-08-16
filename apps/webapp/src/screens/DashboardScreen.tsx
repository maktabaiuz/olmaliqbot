import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { AiInsightCard, AiInsightData } from '../components/AiInsightCard';
import { TopUnansweredQueriesWidget } from '../components/TopUnansweredQueriesWidget';
import { DashboardTaskRow } from '../components/DashboardTaskRow';

export interface DashboardStats {
  unresolvedRequests: number;
  pendingCorrections: number;
  complaintsCount: number;
  staleListings: number;
  lowRatingListings: number;
  pendingCandidates: number;
}

export interface DashboardScreenProps {
  onNavigateTab: (tab: 'home' | 'add' | 'requests' | 'users' | 'database' | 'more') => void;
  onSelectCategoryToAdd?: (categoryName: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigateTab,
  onSelectCategoryToAdd,
}) => {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState<string>('');
  const [aiInsight, setAiInsight] = useState<AiInsightData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // 1. Time-of-Day Greeting Calculation
  useEffect(() => {
    const hour = new Date().getHours();
    let timeGreeting = 'Xayrli kun';
    if (hour >= 5 && hour < 12) timeGreeting = 'Xayrli tong';
    else if (hour >= 12 && hour < 18) timeGreeting = 'Xayrli kun';
    else if (hour >= 18 && hour < 23) timeGreeting = 'Xayrli kech';
    else timeGreeting = 'Xayrli tun';

    const rawName = user?.name ? user.name.trim().split(' ')[0] : 'Admin';
    const adminName = rawName || 'Admin';
    setGreeting(`${timeGreeting}, ${adminName} 👋`);
  }, [user]);

  // 2. Fetch AI Insight & Real Task Stats from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const initData = window.Telegram?.WebApp?.initData || '';
        const headers = { 'x-telegram-init-data': initData };

        const [statsRes, aiRes] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/stats`, { headers }),
          fetch(`${API_BASE_URL}/admin/ai-insight`, { headers }),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats({
            unresolvedRequests: statsData.unresolvedRequests || 0,
            pendingCorrections: statsData.pendingCorrections || 0,
            complaintsCount: statsData.complaintsCount || 0,
            staleListings: statsData.staleListings || 0,
            lowRatingListings: statsData.lowRatingListings || 0,
            pendingCandidates: statsData.pendingCandidates || 0,
          });
        }

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          setAiInsight(aiData);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleCategoryAddSelect = (category: string) => {
    if (onSelectCategoryToAdd) {
      onSelectCategoryToAdd(category);
    }
    onNavigateTab('add');
  };

  const cityName = user?.cityName || 'Olmaliq';

  // Task Counts
  const unresolvedCount = stats?.unresolvedRequests || 0;
  const correctionsCount = stats?.pendingCorrections || 0;
  const complaintsCount = stats?.complaintsCount || 0;
  const staleCount = stats?.staleListings || 0;
  const lowRatingsCount = stats?.lowRatingListings || 0;
  const unverifiedCount = stats?.pendingCandidates || 0;

  const urgentTotal = unresolvedCount + correctionsCount + complaintsCount;
  const laterTotal = staleCount + lowRatingsCount + unverifiedCount;
  const grandTotal = urgentTotal + laterTotal;

  return (
    <div className="flex flex-col gap-4 animate-fade-in pb-16">
      {/* ① HEADER: Static City Name & Settings Icon */}
      <header className="flex items-center justify-between py-1 border-b border-outline-variant/20 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary dark:text-sky-400 text-[22px]">
            location_city
          </span>
          <span className="font-bold text-title-bold text-on-surface dark:text-slate-100">
            {cityName}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('more')}
          className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant dark:text-slate-300 hover:bg-surface-container-high dark:hover:bg-slate-800 transition-colors"
          title="Sozlamalar"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
        </button>
      </header>

      {/* ② SALOMLASHISH */}
      <section>
        <h1 className="font-bold text-title-bold text-on-surface dark:text-slate-100">
          {greeting}
        </h1>
      </section>

      {/* ③ AI MASLAHAT KARTASI */}
      <AiInsightCard
        insight={aiInsight}
        onDismiss={() => setAiInsight(null)}
        onAddCategory={handleCategoryAddSelect}
      />

      {/* ④ KUNLIK TOP-10 JAVOBSIZ SAVOLLAR */}
      <TopUnansweredQueriesWidget onSelectCategoryToAdd={handleCategoryAddSelect} />

      {/* ⑤ ISHLAR RO'YXATI (SHOSHILINCH / KEYINROQ) */}
      <section className="flex flex-col gap-4">
        {loading ? (
          <div className="p-6 text-center text-caption text-outline">
            Ishlar ro'yxati yuklanmoqda...
          </div>
        ) : grandTotal === 0 ? (
          /* EMPTY STATE WHEN ALL TASKS ARE 0 */
          <div className="bg-surface-container-lowest dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-[14px] p-8 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mb-3">
              <span
                className="material-symbols-outlined text-[36px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </div>
            <h3 className="font-bold text-body-main text-on-surface dark:text-slate-100 mb-1">
              Bugun hammasi joyida ✅
            </h3>
            <p className="text-body-secondary text-outline">
              Hozircha kutilayotgan shoshilinch va keyinroq bajariladigan ishlar yo'q.
            </p>
          </div>
        ) : (
          <>
            {/* SHOSHILINCH SEKSIYASI */}
            {urgentTotal > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-caption font-bold text-error uppercase tracking-wider pl-1">
                  SHOSHILINCH
                </h3>
                <DashboardTaskRow
                  title="Javobsiz savollar"
                  subtitle="bugun so'ralgan"
                  count={unresolvedCount}
                  type="urgent"
                  onClick={() => onNavigateTab('requests')}
                />
                <DashboardTaskRow
                  title="Tuzatishlar"
                  subtitle="botga javob qilib yozilgan"
                  count={correctionsCount}
                  type="urgent"
                  onClick={() => onNavigateTab('requests')}
                />
                <DashboardTaskRow
                  title="Shikoyatlar"
                  subtitle="foydalanuvchilar bildirishgan"
                  count={complaintsCount}
                  type="urgent"
                  onClick={() => onNavigateTab('users')}
                />
              </div>
            )}

            {/* KEYINROQ SEKSIYASI */}
            {laterTotal > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-caption font-bold text-outline uppercase tracking-wider pl-1">
                  KEYINROQ
                </h3>
                <DashboardTaskRow
                  title="Eskirgan yozuvlar"
                  subtitle="6 oydan beri tegilmagan"
                  count={staleCount}
                  type="later"
                  onClick={() => onNavigateTab('database')}
                />
                <DashboardTaskRow
                  title="Past baholar"
                  subtitle="reytingi past yozuvlar"
                  count={lowRatingsCount}
                  type="later"
                  onClick={() => onNavigateTab('database')}
                />
                <DashboardTaskRow
                  title="Tasdiqlanmagan yozuvlar"
                  subtitle="admin ko'rib chiqishi kerak"
                  count={unverifiedCount}
                  type="later"
                  onClick={() => onNavigateTab('database')}
                />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};
