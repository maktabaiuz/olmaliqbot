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
  });

  const [topSearches, setTopSearches] = useState<Array<{ query: string; count: number }>>([]);
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
      <div className="relative overflow-hidden bg-gradient-to-r from-[#2AABEE] to-[#0088CC] text-white p-5 rounded-2xl shadow-md flex flex-col gap-1.5">
        {/* Glow effect */}
        <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-blue-100">Kimbor Admin Panel</span>
        <h1 className="text-xl font-extrabold tracking-tight">{getGreetingText()}</h1>
        <p className="text-xs text-blue-50/80 font-medium">Shahar: <span className="underline font-semibold">{user?.cityName || 'Olmaliq'}</span></p>
      </div>

      {/* 2. SEGMENT CONTROL (Bugun / Hafta / Oy) */}
      <div className="bg-slate-200/80 dark:bg-slate-800/80 p-0.5 rounded-xl flex items-center justify-between shadow-inner">
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
            className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all ${
              period === tab.id
                ? 'bg-white dark:bg-[#1C2733] text-on-surface dark:text-slate-100 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. KPI STAT KARTALARI (3 ustun) */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface dark:bg-[#17212B] p-3 rounded-2xl border border-outline-variant/30 dark:border-slate-800 shadow-sm flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">Savollar</span>
          <span className="text-lg font-black text-on-surface dark:text-slate-100">{stats.totalQuestions}</span>
        </div>
        <div className="bg-surface dark:bg-[#17212B] p-3 rounded-2xl border border-outline-variant/30 dark:border-slate-800 shadow-sm flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">Javobsiz</span>
          <span className="text-lg font-black text-rose-500">{stats.unresolvedCount}</span>
        </div>
        <div className="bg-surface dark:bg-[#17212B] p-3 rounded-2xl border border-outline-variant/30 dark:border-slate-800 shadow-sm flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">Javob %</span>
          <span className="text-lg font-black text-emerald-500">{stats.resolvedPercent}%</span>
        </div>
      </div>

      {/* 4. VAZIFALAR (iOS Grouped Style) */}
      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">Tezkor amallar & Vazifalar</h3>
        <div className="bg-surface dark:bg-[#17212B] rounded-2xl border border-outline-variant/30 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-outline-variant/10 dark:divide-slate-800/80">
          
          {/* Javobsiz Savollar */}
          <button
            onClick={() => onNavigateTab('requests')}
            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">forum</span>
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-on-surface dark:text-slate-100">Javobsiz savollar</p>
                <p className="text-[10px] text-slate-500">Mijozlar kutayotgan so'rovlar</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {stats.unresolvedCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {stats.unresolvedCount}
                </span>
              )}
              <span className="material-symbols-outlined text-[16px] text-slate-400">chevron_right</span>
            </div>
          </button>

          {/* Shikoyatlar */}
          <button
            onClick={() => onNavigateTab('users')}
            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">warning</span>
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-on-surface dark:text-slate-100">Faol shikoyatlar</p>
                <p className="text-[10px] text-slate-500">Botda bildirilgan shikoyatlar</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {complaints.length > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {complaints.length}
                </span>
              )}
              <span className="material-symbols-outlined text-[16px] text-slate-400">chevron_right</span>
            </div>
          </button>
        </div>
      </section>

      {/* 5. BO'LIMLAR (Baza, Userlar) */}
      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">Tizim bo'limlari</h3>
        <div className="bg-surface dark:bg-[#17212B] rounded-2xl border border-outline-variant/30 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-outline-variant/10 dark:divide-slate-800/80">
          
          {/* Baza */}
          <button
            onClick={() => onNavigateTab('database')}
            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#007AFF] text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">database</span>
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-on-surface dark:text-slate-100">Baza</p>
                <p className="text-[10px] text-slate-500">Jami ro'yxatga olingan ustalar</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">{stats.totalListings} ta</span>
              <span className="material-symbols-outlined text-[16px] text-slate-400">chevron_right</span>
            </div>
          </button>

          {/* Userlar */}
          <button
            onClick={() => onNavigateTab('users')}
            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-500 text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">group</span>
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-on-surface dark:text-slate-100">Userlar</p>
                <p className="text-[10px] text-slate-500">Botga ulangan mijozlar</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">{stats.totalUsers} ta</span>
              <span className="material-symbols-outlined text-[16px] text-slate-400">chevron_right</span>
            </div>
          </button>
        </div>
      </section>

      {/* 6. TOP 10 QIDIRUV CHIPSLARI */}
      {topSearches.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">🔥 Top 10 qidiruvlar</h3>
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4">
            {topSearches.map((s, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 min-w-max px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 text-xs font-bold text-on-surface dark:text-slate-200 flex items-center gap-1.5 shadow-sm"
              >
                <span>{s.query}</span>
                <span className="bg-primary/10 text-primary dark:text-sky-400 dark:bg-sky-500/10 text-[9px] px-1.5 py-0.5 rounded-full">
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. FAOL SHIKOYATLAR LISTI */}
      {complaints.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[11px] font-bold text-rose-500 uppercase tracking-wider px-1">🚨 Eng so'nggi shikoyatlar</h3>
          <div className="bg-surface dark:bg-[#17212B] rounded-2xl border border-rose-500/20 dark:border-rose-500/15 overflow-hidden shadow-sm divide-y divide-rose-500/10">
            {complaints.slice(0, 3).map((comp) => {
              const compUser = comp.user;
              const name = `${compUser?.firstName || ''} ${compUser?.lastName || ''}`.trim() || 'Mijoz';
              return (
                <div
                  key={comp.id}
                  onClick={() => onNavigateChat(comp.telegramUserId, name, compUser?.username || undefined)}
                  className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface dark:text-slate-200">{name}</span>
                    <span className="text-[9px] text-slate-400">
                      {new Date(comp.createdAt).toLocaleDateString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-rose-500 font-medium line-clamp-2">
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
