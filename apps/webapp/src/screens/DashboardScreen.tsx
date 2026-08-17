import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { SegmentControl } from '../components/common/SegmentControl';
import { GroupedList } from '../components/common/GroupedList';

export interface DashboardScreenProps {
  onNavigateTab: (tab: string) => void;
  onSelectCategoryToAdd?: (categoryName: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [stats, setStats] = useState({
    totalQueries: 143,
    unresolvedCount: 12,
    accuracyRate: 88,
    correctionsCount: 4,
    complaintsCount: 2,
    listingsCount: 340,
    usersCount: 247,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const initData = window.Telegram?.WebApp?.initData || '';
        const res = await fetch(`${API_BASE_URL}/admin/stats?period=${period}`, {
          headers: { 'x-telegram-init-data': initData },
        });
        if (res.ok) {
          const data = await res.json();
          setStats((prev) => ({ ...prev, ...data }));
        }
      } catch (err) {}
    };
    fetchStats();
  }, [period]);

  const cityName = user?.cityName || 'Olmaliq';
  const adminName = user?.name ? user.name.trim().split(' ')[0] : 'Bobur';

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 animate-fade-in max-w-container-max mx-auto">
      {/* 1. Telegram Ko'k Gradient Salom Kartasi */}
      <section className="bg-tg-grad text-white rounded-card p-5 shadow-fab relative overflow-hidden flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[24px]">location_city</span>
            <span className="font-bold text-[14px] opacity-90">{cityName}</span>
          </div>
          <span className="text-[11px] font-bold bg-white/20 px-2.5 py-0.5 rounded-pill backdrop-blur-sm">
            Admin Panel
          </span>
        </div>

        <h1 className="text-[22px] font-extrabold tracking-tight mt-1">
          Salom, {adminName} 👋
        </h1>
        <p className="text-[13px] opacity-90">
          Bugun shaharda qidiruv faolligi yuqori. Barcha so'rovlar nazoratda!
        </p>
      </section>

      {/* 2. Segment Control (Bugun / Hafta / Oy) */}
      <SegmentControl
        options={[
          { id: 'today', label: 'Bugun' },
          { id: 'week', label: 'Hafta' },
          { id: 'month', label: 'Oy' },
        ]}
        selectedId={period}
        onChange={(val) => setPeriod(val)}
      />

      {/* 3. 3 Stat Karta (Savol · Javobsiz · Javob %) */}
      <section className="grid grid-cols-3 gap-2.5">
        <div className="bg-white dark:bg-[#16212F] p-3.5 rounded-card border border-ios-sep/60 dark:border-ios-darkSeparator flex flex-col gap-1 shadow-card">
          <span className="text-[11px] font-semibold text-ios-gray">Savol</span>
          <span className="text-[20px] font-extrabold text-[#1C1C1E] dark:text-white">
            {stats.totalQueries}
          </span>
          <span className="text-[10px] text-tg font-bold">tushgan</span>
        </div>

        <div className="bg-white dark:bg-[#16212F] p-3.5 rounded-card border border-ios-sep/60 dark:border-ios-darkSeparator flex flex-col gap-1 shadow-card">
          <span className="text-[11px] font-semibold text-ios-gray">Javobsiz</span>
          <span className="text-[20px] font-extrabold text-ios-red">
            {stats.unresolvedCount}
          </span>
          <span className="text-[10px] text-ios-red font-bold">kutilmoqda</span>
        </div>

        <div className="bg-white dark:bg-[#16212F] p-3.5 rounded-card border border-ios-sep/60 dark:border-ios-darkSeparator flex flex-col gap-1 shadow-card">
          <span className="text-[11px] font-semibold text-ios-gray">Javob %</span>
          <span className="text-[20px] font-extrabold text-ios-green">
            {stats.accuracyRate}%
          </span>
          <span className="text-[10px] text-ios-green font-bold">aniqlik</span>
        </div>
      </section>

      {/* 4. Vazifalar (iOS Grouped, Rangli Icon Kvadratlar) */}
      <GroupedList
        header="Vazifalar (Kutilmoqda)"
        items={[
          {
            id: 'requests',
            icon: 'help_outline',
            iconBgColor: '#FF3B30',
            title: 'Javobsiz savollar',
            subtitle: 'AI berolmagan so\'rovlar',
            badge: stats.unresolvedCount,
            badgeColor: 'bg-ios-red/15 text-ios-red',
            onClick: () => onNavigateTab('requests'),
          },
          {
            id: 'corrections',
            icon: 'edit_note',
            iconBgColor: '#FF9500',
            title: 'Tuzatishlar',
            subtitle: 'Jamoat yuborgan yangilanishlar',
            badge: stats.correctionsCount,
            badgeColor: 'bg-ios-orange/15 text-ios-orange',
            onClick: () => onNavigateTab('requests'),
          },
          {
            id: 'complaints',
            icon: 'warning',
            iconBgColor: '#AF52DE',
            title: 'Shikoyatlar',
            subtitle: 'Usta/do\'kondan bildirilgan',
            badge: stats.complaintsCount,
            badgeColor: 'bg-ios-purple/15 text-ios-purple',
            onClick: () => onNavigateTab('users'),
          },
        ]}
      />

      {/* 5. Bo'limlar (iOS Grouped) */}
      <GroupedList
        header="Bo'limlar"
        items={[
          {
            id: 'database',
            icon: 'inventory_2',
            iconBgColor: '#007AFF',
            title: 'Baza ma\'lumotlari',
            subtitle: 'Ustalar, do\'konlar, xizmatlar',
            badge: `${stats.listingsCount} ta`,
            onClick: () => onNavigateTab('database'),
          },
          {
            id: 'users',
            icon: 'group',
            iconBgColor: '#34C759',
            title: 'Bot userlari',
            subtitle: 'Chat tarixi va limitlar',
            badge: `${stats.usersCount} kishi`,
            onClick: () => onNavigateTab('users'),
          },
        ]}
      />
    </div>
  );
};
