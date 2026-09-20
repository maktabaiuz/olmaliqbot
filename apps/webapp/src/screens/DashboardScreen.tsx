import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config';

export interface DashboardScreenProps {
  onNavigateTab: (tab: 'home' | 'database' | 'add' | 'users' | 'more' | 'requests') => void;
  onNavigateChat: (telegramUserId: string, fullName: string, username?: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigateTab,
  onNavigateChat,
}) => {
  const { user } = useAuth();

  // States
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [stats, setStats] = useState({
    totalQuestions: 0,
    unresolvedCount: 0,
    resolvedPercent: 100,
    totalListings: 0,
    totalUsers: 0,
    newUsersToday: 0,
  });

  const [topSearches, setTopSearches] = useState<Array<{ query: string; count: number }>>([]);
  const [topMissing, setTopMissing] = useState<Array<{ id: string; canonicalName: string; count: number }>>([]);
  const [complaints, setComplaints] = useState<Array<{
    id: string;
    telegramUserId: string;
    text: string;
    createdAt: string;
    user?: { firstName: string; lastName: string; username: string } | null;
  }>>([]);

  // Time Greeting
  const getGreetingText = () => {
    const hour = new Date().getHours();
    const name = user?.name ? user.name.split(' ')[0] : 'Bobur';
    let timeGreeting = 'Salom';
    if (hour >= 5 && hour < 12) timeGreeting = 'Xayrli tong';
    else if (hour >= 12 && hour < 18) timeGreeting = 'Xayrli kun';
    else if (hour >= 18 && hour < 23) timeGreeting = 'Xayrli kech';
    else timeGreeting = 'Xayrli tun';
    return `${timeGreeting}, ${name} 👋`;
  };

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch Stats based on selected period
      const statsRes = await apiFetch(`/api/admin/stats?period=${period}`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          totalQuestions: statsData.totalQuestions ?? 0,
          unresolvedCount: statsData.unresolvedRequests ?? 0,
          resolvedPercent: statsData.resolvedPercent ?? 100,
          totalListings: statsData.totalListings ?? 0,
          totalUsers: statsData.totalUsers ?? 0,
          newUsersToday: statsData.newUsersToday ?? 0,
        });
      }

      // 2. Fetch Top 10 Searches
      const topRes = await apiFetch(`/api/admin/queries/top-10?period=${period}`);
      if (topRes.ok) {
        const topData = await topRes.json();
        setTopSearches(topData || []);
      }

      // 3. Fetch Complaints
      const complaintsRes = await apiFetch('/api/admin/complaints');
      if (complaintsRes.ok) {
        const compData = await complaintsRes.json();
        setComplaints(compData || []);
      }

      // 4. Fetch Top Missing Categories (AI klasterlash — bazada yo'q, lekin
      // eng ko'p so'ralayotgan ehtiyojlar) — admin Requests ekraniga
      // kirmasdan ham darhol ko'rishi uchun
      const missingRes = await apiFetch('/api/admin/requests/top-missing?limit=5');
      if (missingRes.ok) {
        const missingData = await missingRes.json();
        setTopMissing(missingData || []);
      }

    } catch (e) {
      console.error('Failed to load dashboard statistics:', e);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // 5 soniya juda tez edi — doim fon rejimida so'rov yuborilib, ilovani
    // sekinlashtirar edi. 20 soniya ham "jonli" his qiladi, lekin yukni kamaytiradi.
    const interval = setInterval(fetchDashboardData, 20000);
    return () => clearInterval(interval);
  }, [period]);

  return (
    <div className="flex flex-col gap-5 animate-fade-in pb-16">

      {/* 1. HERO GRADIENT SALOM KARTASI (Telegram Ko'k Gradient) */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#2AABEE] to-[#0088CC] text-white p-5 rounded-ios-lg shadow-sm flex flex-col gap-1.5">
        {/* Glow effect */}
        <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-blue-100">Kimbor Admin Panel</span>
        <h1 className="text-xl font-extrabold tracking-tight">{getGreetingText()}</h1>
        <p className="text-xs text-blue-50/80 font-medium">Shahar: <span className="underline font-semibold">{user?.cityName || 'Olmaliq'}</span></p>
      </div>

      {/* 2. SEGMENT CONTROL (Bugun / Hafta / Oy) */}
      <div className="bg-ios-fill/[0.12] p-0.5 rounded-ios flex items-center justify-between">
        {[
          { id: 'today', label: 'Bugun' },
          { id: 'week', label: 'Hafta' },
          { id: 'month', label: 'Oy' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setPeriod(tab.id as any);
            }}
            className={`flex-1 text-center py-1.5 text-[13px] font-semibold rounded-[8px] transition-all ${
              period === tab.id
                ? 'bg-ios-card text-ios-label shadow-sm'
                : 'text-ios-label-secondary/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. KPI STAT KARTALARI (3 ustun) */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-ios-card p-3 rounded-ios shadow-sm flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-ios-label-secondary/70 uppercase">Savollar</span>
          <span className="text-lg font-black text-ios-label">{stats.totalQuestions}</span>
        </div>
        <div className="bg-ios-card p-3 rounded-ios shadow-sm flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-ios-label-secondary/70 uppercase">Javobsiz</span>
          <span className="text-lg font-black text-ios-red">{stats.unresolvedCount}</span>
        </div>
        <div className="bg-ios-card p-3 rounded-ios shadow-sm flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-ios-label-secondary/70 uppercase">Javob %</span>
          <span className="text-lg font-black text-ios-green">{stats.resolvedPercent}%</span>
        </div>
      </div>

      {/* 3b. FOYDALANUVCHILAR — jonli (real vaqtda yangilanadigan) hero kartasi */}
      <button
        onClick={() => onNavigateTab('users')}
        className="relative overflow-hidden w-full text-left bg-gradient-to-br from-teal-500 to-emerald-600 text-white p-4 rounded-ios-lg shadow-sm flex items-center justify-between active:scale-[0.98] transition-transform"
      >
        <div className="absolute right-0 top-0 w-28 h-28 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6" />
        <div className="relative flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-ios bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">group</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">Jonli · Botga /start bosganlar</span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black tracking-tight">{stats.totalUsers}</span>
              {stats.newUsersToday > 0 && (
                <span className="flex items-center gap-0.5 bg-white/20 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  <span className="material-symbols-outlined text-[12px]">trending_up</span>
                  +{stats.newUsersToday} bugun
                </span>
              )}
            </div>
          </div>
        </div>
        <span className="material-symbols-outlined text-[20px] text-white/70 relative">chevron_right</span>
      </button>

      {/* 4. VAZIFALAR (iOS Grouped Style) */}
      <section className="flex flex-col gap-1.5">
        <h3 className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide px-4">Tezkor amallar &amp; Vazifalar</h3>
        <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden">

          {/* Javobsiz Savollar */}
          <button
            onClick={() => onNavigateTab('requests')}
            className="w-full flex items-center justify-between px-4 py-3 active:bg-ios-fill/10"
            style={{ borderBottom: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-ios bg-ios-orange text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">forum</span>
              </div>
              <div className="text-left">
                <p className="text-[15px] font-normal text-ios-label">Javobsiz savollar</p>
                <p className="text-[12px] text-ios-label-secondary/70">Mijozlar kutayotgan so'rovlar</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {stats.unresolvedCount > 0 && (
                <span className="bg-ios-red text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {stats.unresolvedCount}
                </span>
              )}
              <span className="material-symbols-outlined text-[18px] text-ios-label-secondary/50">chevron_right</span>
            </div>
          </button>

          {/* Shikoyatlar */}
          <button
            onClick={() => onNavigateTab('users')}
            className="w-full flex items-center justify-between px-4 py-3 active:bg-ios-fill/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-ios bg-ios-red text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">warning</span>
              </div>
              <div className="text-left">
                <p className="text-[15px] font-normal text-ios-label">Faol shikoyatlar</p>
                <p className="text-[12px] text-ios-label-secondary/70">Botda bildirilgan shikoyatlar</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {complaints.length > 0 && (
                <span className="bg-ios-red text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {complaints.length}
                </span>
              )}
              <span className="material-symbols-outlined text-[18px] text-ios-label-secondary/50">chevron_right</span>
            </div>
          </button>
        </div>
      </section>

      {/* 5. BO'LIMLAR (Baza) — Userlar yuqoridagi jonli kartaga ko'chirildi */}
      <section className="flex flex-col gap-1.5">
        <h3 className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide px-4">Tizim bo'limlari</h3>
        <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden">

          {/* Baza */}
          <button
            onClick={() => onNavigateTab('database')}
            className="w-full flex items-center justify-between px-4 py-3 active:bg-ios-fill/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-ios bg-ios-blue text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">database</span>
              </div>
              <div className="text-left">
                <p className="text-[15px] font-normal text-ios-label">Baza</p>
                <p className="text-[12px] text-ios-label-secondary/70">Jami ro'yxatga olingan ustalar</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] text-ios-label-secondary/70">{stats.totalListings} ta</span>
              <span className="material-symbols-outlined text-[18px] text-ios-label-secondary/50">chevron_right</span>
            </div>
          </button>
        </div>
      </section>

      {/* 6. TOP 10 QIDIRUV CHIPSLARI */}
      {topSearches.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h3 className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide px-4">🔥 Top 10 qidiruvlar</h3>
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4">
            {topSearches.map((s, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 min-w-max px-3.5 py-1.5 rounded-full bg-ios-fill/[0.12] text-[13px] font-semibold text-ios-label flex items-center gap-1.5"
              >
                <span>{s.query}</span>
                <span className="bg-ios-blue/10 text-ios-blue text-[10px] px-1.5 py-0.5 rounded-full">
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6b. YANGI EHTIYOJLAR — AI klasterlash bazada yo'q, lekin tez-tez
          so'ralayotgan narsalarni topganda shu yerda darhol ko'rinadi */}
      {topMissing.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h3 className="text-[13px] font-normal text-ios-orange uppercase tracking-wide px-4">🆕 Yangi ehtiyojlar (bazada yo'q)</h3>
          <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden">
            {topMissing.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => onNavigateTab('requests')}
                className="w-full flex items-center justify-between px-4 py-3 active:bg-ios-fill/10 text-left"
                style={idx === topMissing.length - 1 ? undefined : { borderBottom: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}
              >
                <span className="text-[15px] font-normal text-ios-label capitalize truncate pr-2">
                  {m.canonicalName}
                </span>
                <span className="bg-ios-orange text-white text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0">
                  {m.count} ta so'ralgan
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 7. FAOL SHIKOYATLAR LISTI */}
      {complaints.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h3 className="text-[13px] font-normal text-ios-red uppercase tracking-wide px-4">🚨 Eng so'nggi shikoyatlar</h3>
          <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden">
            {complaints.slice(0, 3).map((comp, idx) => {
              const compUser = comp.user;
              const name = `${compUser?.firstName || ''} ${compUser?.lastName || ''}`.trim() || 'Mijoz';
              const isLast = idx === Math.min(complaints.length, 3) - 1;
              return (
                <div
                  key={comp.id}
                  onClick={() => onNavigateChat(comp.telegramUserId, name, compUser?.username || undefined)}
                  className="px-4 py-3 active:bg-ios-fill/10 cursor-pointer flex flex-col gap-1.5"
                  style={isLast ? undefined : { borderBottom: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-ios-label">{name}</span>
                    <span className="text-[11px] text-ios-label-secondary/50">
                      {new Date(comp.createdAt).toLocaleDateString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[13px] text-ios-red font-medium line-clamp-2">
                    ⚠️ {comp.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
};
