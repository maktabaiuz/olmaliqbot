import React from 'react';

export type NavTab = 'home' | 'database' | 'add' | 'users' | 'more' | 'requests';

export interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  hasUnreadRequests?: boolean;
  onAiClick?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onAiClick,
}) => {
  const leftTabs: { id: NavTab; label: string; icon: string }[] = [
    { id: 'home', label: 'Bosh sahifa', icon: 'home' },
    { id: 'database', label: 'Baza', icon: 'database' },
  ];

  const rightTabs: { id: NavTab; label: string; icon: string }[] = [
    { id: 'users', label: 'Userlar', icon: 'group' },
    { id: 'more', label: 'Yana', icon: 'more_horiz' },
  ];

  const renderTabButton = (tab: { id: NavTab; label: string; icon: string }) => {
    const isActive = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        className="relative flex flex-col items-center justify-center py-1 px-2.5 min-w-[64px] transition-all active:scale-95"
      >
        {isActive && (
          <span className="absolute inset-x-1 inset-y-0.5 bg-primary-container/10 dark:bg-sky-500/10 rounded-xl -z-10 animate-fade-in" />
        )}

        <div className="relative flex items-center justify-center">
          <span
            className={`material-symbols-outlined text-[22px] transition-colors ${
              isActive
                ? 'text-primary dark:text-sky-400 font-bold'
                : 'text-outline dark:text-slate-400'
            }`}
            style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
          >
            {tab.icon}
          </span>
        </div>

        <span
          className={`text-[9px] mt-0.5 font-semibold transition-colors ${
            isActive
              ? 'text-primary dark:text-sky-400'
              : 'text-on-surface-variant dark:text-slate-400'
          }`}
        >
          {tab.label}
        </span>
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 max-w-container-max mx-auto pointer-events-none px-4 pb-4">
      {/* Floating AI Assistant Button */}
      <div className="absolute -top-14 right-6 pointer-events-auto">
        <button
          onClick={onAiClick}
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-500 to-indigo-400 text-white shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center transition-all hover:scale-105 active:scale-95 border border-white/20"
          title="AI Copilot"
        >
          <span className="material-symbols-outlined text-[22px]">smart_toy</span>
        </button>
      </div>

      {/* Navigation Bar Container */}
      <nav className="pointer-events-auto bg-surface/90 dark:bg-[#17212B]/90 backdrop-blur-xl border border-outline-variant/30 dark:border-slate-800/80 px-2 py-1 rounded-[24px] flex items-center justify-between shadow-2xl relative">
        {/* Left Tabs */}
        <div className="flex flex-1 justify-around">
          {leftTabs.map(renderTabButton)}
        </div>

        {/* Center FAB */}
        <div className="relative -top-5 px-4">
          <button
            onClick={() => onTabChange('add')}
            className="w-14 h-14 rounded-full bg-gradient-to-r from-[#2AABEE] to-[#0088CC] text-white flex items-center justify-center shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 active:scale-90 transition-all border-4 border-surface dark:border-[#121417] z-50"
            title="Yangi yozuv qo'shish"
          >
            <span className="material-symbols-outlined text-[28px] font-bold">add</span>
          </button>
        </div>

        {/* Right Tabs */}
        <div className="flex flex-1 justify-around">
          {rightTabs.map(renderTabButton)}
        </div>
      </nav>
    </div>
  );
};

