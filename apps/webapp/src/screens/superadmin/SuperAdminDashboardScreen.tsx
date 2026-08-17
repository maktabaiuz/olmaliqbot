import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GroupedList } from '../../components/common/GroupedList';
import { API_BASE_URL } from '../../config';

export const SuperAdminDashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCities: 3,
    totalRevenue: '1.2M',
    pendingApplications: 2,
  });

  const [cities] = useState([
    { id: '1', name: 'Olmaliq', listingsCount: 340, status: 'To\'langan' },
    { id: '2', name: 'Chirchiq', listingsCount: 210, status: 'To\'langan' },
    { id: '3', name: 'Angren', listingsCount: 180, status: 'Muddati oz' },
  ]);

  useEffect(() => {
    const fetchSuperStats = async () => {
      try {
        const initData = window.Telegram?.WebApp?.initData || '';
        const res = await fetch(`${API_BASE_URL}/admin/superadmin/stats`, {
          headers: { 'x-telegram-init-data': initData },
        });
        if (res.ok) {
          const data = await res.json();
          setStats((prev) => ({ ...prev, ...data }));
        }
      } catch (err) {}
    };
    fetchSuperStats();
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 animate-fade-in max-w-container-max mx-auto">
      {/* Super-Admin Gold Header */}
      <section className="bg-gold-gradient text-white rounded-card p-5 shadow-gold flex flex-col gap-2 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[24px]">workspace_premium</span>
            <span className="font-bold text-[14px]">SUPER-ADMIN</span>
          </div>
          <button
            onClick={() => navigate('/superadmin/onboarding')}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-pill text-[11px] font-bold backdrop-blur-sm"
          >
            ＋ Yangi shahar
          </button>
        </div>

        <h1 className="text-[22px] font-extrabold tracking-tight mt-1">
          Boshqaruv Markazi 👑
        </h1>
        <p className="text-[13px] opacity-90">
          O'zbekiston shaharlari va barcha Telegram botlarining umumiy statistikasi
        </p>
      </section>

      {/* 2. 3 KPI Kartalari (Shahar · Daromad · Ariza) */}
      <section className="grid grid-cols-3 gap-2.5">
        <div className="bg-white dark:bg-[#16212F] p-3.5 rounded-card border border-ios-separator/50 dark:border-ios-darkSeparator/50 flex flex-col gap-1 shadow-card">
          <span className="text-[11px] font-semibold text-tg-textMuted">Shaharlar</span>
          <span className="text-[20px] font-extrabold text-tg-textLight dark:text-tg-textDark">
            {stats.totalCities}
          </span>
          <span className="text-[10px] text-ios-blue font-bold">faol tizimda</span>
        </div>

        <div className="bg-white dark:bg-[#16212F] p-3.5 rounded-card border border-ios-separator/50 dark:border-ios-darkSeparator/50 flex flex-col gap-1 shadow-card">
          <span className="text-[11px] font-semibold text-tg-textMuted">Daromad</span>
          <span className="text-[20px] font-extrabold text-ios-green">
            {stats.totalRevenue}
          </span>
          <span className="text-[10px] text-ios-green font-bold">oylik tushum</span>
        </div>

        <div className="bg-white dark:bg-[#16212F] p-3.5 rounded-card border border-ios-separator/50 dark:border-ios-darkSeparator/50 flex flex-col gap-1 shadow-card">
          <span className="text-[11px] font-semibold text-tg-textMuted">Arizalar</span>
          <span className="text-[20px] font-extrabold text-gold-start">
            {stats.pendingApplications}
          </span>
          <span className="text-[10px] text-gold-start font-bold">kutilmoqda</span>
        </div>
      </section>

      {/* 3. Shaharlar Ro'yxati (Grouped) */}
      <GroupedList
        header="Shaharlar Nazorati"
        items={cities.map((c) => ({
          id: c.id,
          icon: 'location_city',
          iconBgColor: '#E0A010',
          title: `${c.name} shahri`,
          subtitle: `${c.listingsCount} ta usta va do'kon`,
          badge: c.status,
          badgeColor: c.status === "To'langan" ? 'bg-ios-green/15 text-ios-green' : 'bg-ios-orange/15 text-ios-orange',
          onClick: () => navigate(`/superadmin/city/${c.id}`),
        }))}
      />

      {/* 4. Kutilayotgan Arizalar */}
      <GroupedList
        header="Kutilayotgan Arizalar"
        items={[
          {
            id: 'apps',
            icon: 'mark_email_unread',
            iconBgColor: '#FF9500',
            title: 'Yangi shahar arizalari',
            subtitle: 'Franchayz va guruh adminlari so\'rovi',
            badge: `${stats.pendingApplications} ta`,
            badgeColor: 'bg-ios-orange/15 text-ios-orange',
            onClick: () => navigate('/superadmin/applications'),
          },
        ]}
      />
    </div>
  );
};
