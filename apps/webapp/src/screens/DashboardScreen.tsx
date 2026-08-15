import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { TopQueriesWidget } from '../components/TopQueriesWidget';

export interface TaskItem {
  id: string;
  title: string;
  subtitle?: string;
  count: number;
  type: 'urgent' | 'later';
  actionType: 'corrections' | 'unresolved' | 'stale' | 'low_ratings' | 'unverified';
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
  const [greeting, setGreeting] = useState('');
  const [selectedCity, setSelectedCity] = useState(user?.cityName || 'Olmaliq');
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // Stats & Task Counts State
  const [urgentTasks, setUrgentTasks] = useState<TaskItem[]>([]);
  const [laterTasks, setLaterTasks] = useState<TaskItem[]>([]);
  const dailyCompletedCount = 6;
  const dailyTarget = 20;
  const [aiInsight, setAiInsight] = useState<{ message: string; suggestedCategory?: string } | null>({
    message: "Bugun 12 savolga javob berolmadim. Ko'pchiligi kafelchi haqida edi.",
    suggestedCategory: 'Kafelchi',
  });

  // Calculate Time-of-Day Greeting
  useEffect(() => {
    const hour = new Date().getHours();
    let timeGreeting = 'Xayrli kun';
    if (hour >= 5 && hour < 12) timeGreeting = 'Xayrli tong';
    else if (hour >= 12 && hour < 18) timeGreeting = 'Xayrli kun';
    else if (hour >= 18 && hour < 23) timeGreeting = 'Xayrli kech';
    else timeGreeting = 'Xayrli tun';

    const userName = user?.name ? user.name.split(' ')[0] : 'Bobur';
    setGreeting(`${timeGreeting}, ${userName} 👋`);
  }, [user]);

  // Fetch live tasks & counts for the selected city
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes] = await Promise.all([
          fetch('http://localhost:4000/api/admin/stats'),
        ]);

        let unresolvedCount = 12;
        let pendingCorrections = 4;
        let staleCount = 7;
        let lowRatingsCount = 3;
        let unverifiedCount = 18;

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          unresolvedCount = statsData.unresolvedRequests || 0;
          unverifiedCount = statsData.pendingCandidates || 0;
        }

        // 1. SHOSHILINCH (Urgent) Tasks (Red edge)
        const urgentList: TaskItem[] = [];
        if (pendingCorrections > 0) {
          urgentList.push({
            id: 'corrections',
            title: 'Tuzatishlar',
            subtitle: 'botga javob qilib yozilgan',
            count: pendingCorrections,
            type: 'urgent',
            actionType: 'corrections',
          });
        }
        if (unresolvedCount > 0) {
          urgentList.push({
            id: 'unresolved',
            title: 'Javobsiz savollar',
            subtitle: 'bugun so\'ralgan',
            count: unresolvedCount,
            type: 'urgent',
            actionType: 'unresolved',
          });
        }

        // 2. KEYINROQ (Later) Tasks (Grey edge)
        const laterList: TaskItem[] = [];
        if (staleCount > 0) {
          laterList.push({
            id: 'stale',
            title: 'Eskirgan yozuvlar',
            subtitle: '6 oydan beri tegilmagan',
            count: staleCount,
            type: 'later',
            actionType: 'stale',
          });
        }
        if (lowRatingsCount > 0) {
          laterList.push({
            id: 'low_ratings',
            title: 'Past baholar',
            count: lowRatingsCount,
            type: 'later',
            actionType: 'low_ratings',
          });
        }
        if (unverifiedCount > 0) {
          laterList.push({
            id: 'unverified',
            title: 'Tasdiqlanmagan yozuvlar',
            count: unverifiedCount,
            type: 'later',
            actionType: 'unverified',
          });
        }

        setUrgentTasks(urgentList);
        setLaterTasks(laterList);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    };

    fetchDashboardData();
  }, [selectedCity]);

  const totalTasksCount = urgentTasks.length + laterTasks.length;
  const progressPercent = Math.min(100, Math.round((dailyCompletedCount / dailyTarget) * 100));

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* 1. TOP NAV / CITY SWITCHER */}
      <div className="flex items-center justify-between relative">
        <div className="relative">
          <button
            onClick={() => setShowCityDropdown(!showCityDropdown)}
            className="flex items-center gap-1.5 bg-surface-container-high dark:bg-slate-800 px-3.5 py-1.5 rounded-full hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <span className="font-semibold text-sm text-on-surface dark:text-slate-100">
              {selectedCity}
            </span>
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant dark:text-slate-400">
              expand_more
            </span>
          </button>

          {/* City Selection Dropdown */}
          {showCityDropdown && (
            <div className="absolute top-10 left-0 bg-surface dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-xl shadow-xl z-50 w-44 py-1 animate-fadeIn">
              {['Olmaliq', 'Chirchiq', 'Angren', 'Buka'].map((cityName) => (
                <button
                  key={cityName}
                  onClick={() => {
                    setSelectedCity(cityName);
                    setShowCityDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-surface-container-low dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${
                    selectedCity === cityName
                      ? 'text-primary dark:text-sky-400 bg-primary-container/10'
                      : 'text-on-surface dark:text-slate-200'
                  }`}
                >
                  {cityName}
                  {selectedCity === cityName && (
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => onNavigateTab('more')}
          className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant dark:text-slate-300 hover:bg-surface-container-high dark:hover:bg-slate-800 transition-colors"
          title="Sozlamalar"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
        </button>
      </div>

      {/* 2. GREETING & TOP QUICK ACCESS BUTTONS */}
      <section className="flex flex-col gap-3">
        <h1 className="font-bold text-xl text-on-surface dark:text-slate-100">{greeting}</h1>
        
        {/* TOP MAIN SECTIONS QUICK BUTTONS */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => onNavigateTab('users')}
            className="p-3.5 bg-gradient-to-br from-primary-container/40 to-primary/20 hover:from-primary-container/60 hover:to-primary/30 rounded-2xl border border-primary/30 flex items-center gap-3 transition shadow-sm active:scale-98 text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">forum</span>
            </div>
            <div>
              <div className="font-bold text-body-main text-on-background">👥 Userlar Chatlari</div>
              <div className="text-caption text-outline">Xabarlar & AI javoblari</div>
            </div>
          </button>

          <button
            onClick={() => onNavigateTab('users')}
            className="p-3.5 bg-gradient-to-br from-error-container/40 to-error/20 hover:from-error-container/60 hover:to-error/30 rounded-2xl border border-error/30 flex items-center gap-3 transition shadow-sm active:scale-98 text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-error text-on-error flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">warning</span>
            </div>
            <div>
              <div className="font-bold text-body-main text-error">⚠️ Shikoyatlar</div>
              <div className="text-caption text-outline">Tushgan shikoyatlar</div>
            </div>
          </button>
        </div>
      </section>

      {/* 3. AI BRIEFING CARD */}
      {aiInsight && (
        <section className="bg-surface-container-low dark:bg-[#17212B] rounded-[20px] p-4 flex flex-col gap-3 relative overflow-hidden border border-outline-variant/30 dark:border-slate-800/80 shadow-sm">
          <div className="flex gap-3 relative z-10">
            <div className="w-10 h-10 rounded-full bg-primary-container/20 text-primary dark:text-sky-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                smart_toy
              </span>
            </div>
            <div>
              <p className="text-sm text-on-surface dark:text-slate-200 leading-snug">
                {aiInsight.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1 relative z-10 ml-13">
            {aiInsight.suggestedCategory && (
              <button
                onClick={() => {
                  if (onSelectCategoryToAdd) onSelectCategoryToAdd(aiInsight.suggestedCategory!);
                  onNavigateTab('add');
                }}
                className="bg-primary dark:bg-sky-500 text-on-primary text-xs font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm active:scale-95"
              >
                {aiInsight.suggestedCategory} qo'shish
              </button>
            )}
            <button
              onClick={() => setAiInsight(null)}
              className="border border-outline-variant/60 dark:border-slate-700 text-on-surface-variant dark:text-slate-400 text-xs font-semibold px-4 py-2 rounded-lg hover:bg-surface-container-high dark:hover:bg-slate-800 transition-colors active:scale-95"
            >
              Keyinroq
            </button>
          </div>
        </section>
      )}

      {/* TOP 10 SEARCHED QUERIES WIDGET */}
      <section>
        <TopQueriesWidget />
      </section>

      {/* 4. TASK LIST (ISHLAR) */}
      <section className="flex flex-col gap-4">
        {totalTasksCount === 0 ? (
          /* EMPTY STATE WHEN ALL TASKS ARE 0 */
          <div className="bg-surface-container-lowest dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
            </div>
            <h3 className="font-bold text-base text-on-surface dark:text-slate-100 mb-1">
              Bugun hammasi joyida ✅
            </h3>
            <p className="text-xs text-on-surface-variant dark:text-slate-400">
              Hozircha kutilayotgan shoshilinch ishlar yo'q.
            </p>
          </div>
        ) : (
          <>
            {/* SHOSHILINCH (Urgent) Group - Hidden if 0 count */}
            {urgentTasks.length > 0 && (
              <div className="flex flex-col gap-2">
                <h2 className="text-xs font-semibold tracking-wider text-error dark:text-red-400 uppercase px-1">
                  SHOSHILINCH
                </h2>
                <div className="bg-surface-container-lowest dark:bg-[#17212B] rounded-xl flex flex-col overflow-hidden border border-outline-variant/30 dark:border-slate-800 shadow-sm divide-y divide-outline-variant/20 dark:divide-slate-800">
                  {urgentTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => {
                        if (task.actionType === 'unresolved') onNavigateTab('requests');
                        else onNavigateTab('database');
                      }}
                      className="flex items-center p-3 relative hover:bg-surface-container-low dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-error rounded-l-xl" />
                      <div className="pl-3.5 flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-on-surface dark:text-slate-100">
                          {task.title}
                        </h3>
                        {task.subtitle && (
                          <p className="text-xs text-on-surface-variant dark:text-slate-400">
                            {task.subtitle}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-error-container dark:bg-red-950 text-on-error-container dark:text-red-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
                          {task.count}
                        </span>
                        <span className="material-symbols-outlined text-[20px] text-on-surface-variant dark:text-slate-500">
                          chevron_right
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* KEYINROQ (Later) Group - Hidden if 0 count */}
            {laterTasks.length > 0 && (
              <div className="flex flex-col gap-2">
                <h2 className="text-xs font-semibold tracking-wider text-on-surface-variant dark:text-slate-400 uppercase px-1">
                  KEYINROQ
                </h2>
                <div className="bg-surface-container-lowest dark:bg-[#17212B] rounded-xl flex flex-col overflow-hidden border border-outline-variant/30 dark:border-slate-800 shadow-sm divide-y divide-outline-variant/20 dark:divide-slate-800">
                  {laterTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => onNavigateTab('database')}
                      className="flex items-center p-3 relative hover:bg-surface-container-low dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-outline-variant dark:bg-slate-600 rounded-l-xl" />
                      <div className="pl-3.5 flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-on-surface dark:text-slate-100">
                          {task.title}
                        </h3>
                        {task.subtitle && (
                          <p className="text-xs text-on-surface-variant dark:text-slate-400">
                            {task.subtitle}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-surface-container-high dark:bg-slate-800 text-on-surface-variant dark:text-slate-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
                          {task.count}
                        </span>
                        <span className="material-symbols-outlined text-[20px] text-on-surface-variant dark:text-slate-500">
                          chevron_right
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* 5. DAILY PROGRESS CARD (KUNLIK NATIJA DOIRASI) */}
      <section className="bg-surface-container-lowest dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm">
        <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-surface-container-high dark:text-slate-800"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
            />
            <path
              className="text-primary dark:text-sky-400"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeDasharray={`${progressPercent}, 100`}
              strokeLinecap="round"
              strokeWidth="3.5"
            />
          </svg>
          <span className="absolute material-symbols-outlined text-[18px] text-primary dark:text-sky-400">
            done_all
          </span>
        </div>
        <div>
          <h3 className="font-bold text-sm text-on-surface dark:text-slate-100">
            Bugun {dailyCompletedCount} ta bajarildi
          </h3>
          <p className="text-xs text-on-surface-variant dark:text-slate-400">
            kunlik maqsad: {dailyTarget} ta
          </p>
        </div>
      </section>
    </div>
  );
};
