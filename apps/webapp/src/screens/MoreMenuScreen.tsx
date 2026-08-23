import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { GroupedList } from '../components/common/GroupedList';
import { AiCopilotDrawer } from '../components/common/AiCopilotDrawer';
import { Switch } from '../components/common/Switch';

export interface MoreMenuScreenProps {
  onNavigateSubScreen?: (screenId: string) => void;
  onNavigateTab?: (tab: string) => void;
  isSuperAdmin?: boolean;
}

export const MoreMenuScreen: React.FC<MoreMenuScreenProps> = ({ onNavigateSubScreen, onNavigateTab, isSuperAdmin }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [copilotOpen, setCopilotOpen] = useState<boolean>(false);

  const adminName = user?.name || 'Bobur Admin';
  const cityName = user?.cityName || 'Olmaliq';

  const navigateTo = (screenId: string) => {
    if (onNavigateSubScreen) onNavigateSubScreen(screenId);
  };

  return (
    <div className="flex flex-col gap-3 p-4 pb-24 animate-fade-in max-w-container-max mx-auto">
      {/* 1. Admin Profile Header Card */}
      <section className="bg-white dark:bg-[#16212F] rounded-card p-4 border border-ios-sep/50 dark:border-ios-darkSeparator shadow-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-tg-grad text-white font-bold text-[18px] flex items-center justify-center shadow-sm">
            {adminName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-[16px] text-[#1C1C1E] dark:text-white">
              {adminName}
            </h2>
            <p className="text-[12px] text-ios-gray">{cityName} Shahar Admini</p>
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
            <p className="text-[11px] text-ios-gray">Savol so'rash va avto-boshqaruv</p>
          </div>
        </div>
        <span className="material-symbols-outlined text-[20px] text-ios-purple">chevron_right</span>
      </div>

      {/* Super-Admin Boshqaruv Markaziga kirish (faqat SUPER_ADMIN rolida ko'rinadi) */}
      {isSuperAdmin && (
        <GroupedList
          header="Super-Admin"
          items={[
            {
              id: 'superadmin',
              icon: 'workspace_premium',
              iconBgColor: '#C8860A',
              title: 'Super-Admin Boshqaruv Markazi',
              subtitle: 'Barcha shaharlar, arizalar va to\'lovlar',
              onClick: () => onNavigateTab?.('superadmin'),
            },
          ]}
        />
      )}

      {/* Ko'rinish (Dark / Light rejim) */}
      <GroupedList
        header="Ko'rinish"
        items={[
          {
            id: 'theme',
            icon: theme === 'dark' ? 'dark_mode' : 'light_mode',
            iconBgColor: '#1C1C1E',
            title: 'Tungi rejim',
            subtitle: theme === 'dark' ? 'Yoqilgan' : "O'chirilgan",
            onClick: toggleTheme,
            rightElement: <Switch checked={theme === 'dark'} onChange={toggleTheme} label="Tungi rejim" />,
          },
        ]}
      />

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
            onClick: () => navigateTo('categories'),
          },
          {
            id: 'landmarks',
            icon: 'location_on',
            iconBgColor: '#FF9500',
            title: 'Mo\'ljallar va Manzillar',
            subtitle: 'Xalqona joy nomlari',
            onClick: () => navigateTo('landmarks'),
          },
          {
            id: 'bot-messages',
            icon: 'chat',
            iconBgColor: '#34C759',
            title: 'Bot javob matnlari',
            subtitle: 'Shablonlar va 3 tildagi matnlar',
            onClick: () => navigateTo('bot-messages'),
          },
          {
            id: 'emergency',
            icon: 'emergency',
            iconBgColor: '#FF3B30',
            title: 'Favqulodda raqamlar',
            subtitle: '3 darajali shoshilinch aloqa',
            badge: '🔴 1-Daraja',
            badgeColor: 'bg-ios-red/15 text-ios-red',
            onClick: () => navigateTo('emergency'),
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
            onClick: () => navigateTo('moderators'),
          },
          {
            id: 'subscription',
            icon: 'card_membership',
            iconBgColor: '#FF9F0A',
            title: 'Obuna & To\'lov tarixi',
            subtitle: 'Joriy tarif va uzaytirish',
            badge: 'STANDART',
            badgeColor: 'bg-tg/15 text-tg',
            onClick: () => navigateTo('subscription'),
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
