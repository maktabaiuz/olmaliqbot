import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export type NavTab = 'home' | 'database' | 'add' | 'users' | 'more' | 'requests';

export interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  hasUnreadRequests?: boolean;
}

/** iOS UITabBar — flat, attached to bottom edge, translucent blur, top hairline. */
export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const { t } = useLanguage();

  const tabs: { id: NavTab; label: string; icon: string }[] = [
    { id: 'home', label: t('nav_home'), icon: 'home' },
    { id: 'database', label: t('nav_database'), icon: 'storage' },
    { id: 'add', label: '', icon: 'add_circle' },
    { id: 'users', label: t('nav_users'), icon: 'group' },
    { id: 'more', label: t('nav_more'), icon: 'more_horiz' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-ios-card/85 backdrop-blur-xl max-w-container-max mx-auto flex items-stretch"
      style={{ borderTop: '0.5px solid rgb(var(--ios-separator) / 0.29)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isAdd = tab.id === 'add';
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 active:opacity-50 transition-opacity"
          >
            <span
              className={`material-symbols-outlined ${isAdd ? 'text-[30px]' : 'text-[24px]'} ${isActive || isAdd ? 'text-ios-blue' : 'text-ios-label-secondary/60'}`}
              style={{ fontVariationSettings: isActive && !isAdd ? "'FILL' 1" : "'FILL' 0" }}
            >
              {tab.icon}
            </span>
            {tab.label && (
              <span className={`text-[10px] font-medium ${isActive ? 'text-ios-blue' : 'text-ios-label-secondary/60'}`}>
                {tab.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
