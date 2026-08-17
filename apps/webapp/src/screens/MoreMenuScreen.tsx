import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GroupedList } from '../components/common/GroupedList';
import { AiCopilotDrawer } from '../components/common/AiCopilotDrawer';

export const MoreMenuScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [copilotOpen, setCopilotOpen] = useState<boolean>(false);

  const adminName = user?.name || 'Bobur Admin';
  const cityName = user?.cityName || 'Olmaliq';

  return (
    <div className="flex flex-col gap-3 p-4 pb-24 animate-fade-in max-w-container-max mx-auto">
      {/* 1. Admin Profile Header Card */}
      <section className="bg-white dark:bg-[#16212F] rounded-card p-4 border border-ios-separator/50 dark:border-ios-darkSeparator/50 shadow-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-tg-gradient text-white font-bold text-[18px] flex items-center justify-center shadow-sm">
            {adminName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-[16px] text-tg-textLight dark:text-tg-textDark">
              {adminName}
            </h2>
            <p className="text-[12px] text-tg-textMuted">{cityName} Shahar Admini</p>
          </div>
        </div>

        <span className="text-[11px] font-bold bg-ios-green/15 text-ios-green px-3 py-1 rounded-pill">
          ● Obuna faol
        </span>
      </section>

      {/* AI Copilot Agent Trigger Banner */}
      <div
        onClick={() => setCopilotOpen(true)}
        className="bg-ios-purple/10 border border-ios-purple/30 p-3.5 rounded-card flex items-center justify-between cursor-pointer active-scale"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-icon bg-ios-purple text-white flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[22px]">smart_toy</span>
          </div>
          <div>
            <h4 className="font-bold text-[14px] text-ios-purple">AI Copilot Agent</h4>
            <p className="text-[11px] text-tg-textMuted">Savol so'rash va avto-boshqaruv</p>
          </div>
        </div>
        <span className="material-symbols-outlined text-[20px] text-ios-purple">chevron_right</span>
      </div>

      {/* 2. Sozlamalar & Boshqaruv (iOS Grouped Lists) */}
      <GroupedList
        header="Boshqaruv Sozlamalari"
        items={[
          {
            id: 'categories',
            icon: 'category',
            iconBgColor: '#007AFF',
            title: 'Kategoriyalar va Sinonimlar',
            subtitle: 'Kasblar hamda o\'tkazish so\'zlari',
            badge: '42 ta',
            onClick: () => navigate('/more/categories'),
          },
          {
            id: 'landmarks',
            icon: 'location_on',
            iconBgColor: '#FF9500',
            title: 'Mo\'ljallar va Manzillar',
            subtitle: 'Xalqona joy nomlari',
            badge: '28 ta',
            onClick: () => navigate('/more/landmarks'),
          },
          {
            id: 'bot-messages',
            icon: 'chat',
            iconBgColor: '#34C759',
            title: 'Bot javob matnlari',
            subtitle: 'Shablonlar va 3 tildagi matnlar',
            onClick: () => navigate('/more/bot-messages'),
          },
          {
            id: 'emergency',
            icon: 'emergency',
            iconBgColor: '#FF3B30',
            title: 'Favqulodda raqamlar',
            subtitle: '3 darajali shoshilinch aloqa',
            badge: '🔴 1-Daraja',
            badgeColor: 'bg-ios-red/15 text-ios-red',
            onClick: () => navigate('/more/emergency'),
          },
        ]}
      />

      <GroupedList
        header="Xavfsizlik va Jamoa"
        items={[
          {
            id: 'moderators',
            icon: 'admin_panel_settings',
            iconBgColor: '#AF52DE',
            title: 'Moderatorlar',
            subtitle: 'Yordamchilar va ruxsatnomalar',
            onClick: () => navigate('/more/moderators'),
          },
          {
            id: 'subscription',
            icon: 'card_membership',
            iconBgColor: '#FF9F0A',
            title: 'Obuna & To\'lov tarixi',
            subtitle: 'Joriy tarif va uzaytirish',
            badge: 'STANDART',
            badgeColor: 'bg-tg-blue/15 text-tg-blue',
            onClick: () => navigate('/more/subscription'),
          },
        ]}
      />

      <GroupedList
        header="Hisob"
        items={[
          {
            id: 'logout',
            icon: 'logout',
            iconBgColor: '#FF3B30',
            title: 'Chiqish',
            danger: true,
            onClick: () => {
              if (confirm('Rostdan ham chiqlmoqchimisiz?')) logout();
            },
          },
        ]}
      />

      {/* AI Copilot Drawer Component */}
      <AiCopilotDrawer isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </div>
  );
};
