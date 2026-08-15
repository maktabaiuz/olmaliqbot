import React from 'react';

export type NavTab = 'home' | 'add' | 'requests' | 'users' | 'database' | 'more';

export interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  hasUnreadRequests?: boolean;
  onAiClick?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  hasUnreadRequests = true,
  onAiClick,
}) => {
  const tabs: { id: NavTab; label: string; icon: string }[] = [
    { id: 'home', label: 'Bosh sahifa', icon: 'home' },
    { id: 'add', label: "Qo'shish", icon: 'add_circle' },
    { id: 'requests', label: "So'rovlar", icon: 'forum' },
    { id: 'users', label: 'Chatlar', icon: 'mark_chat_unread' },
    { id: 'database', label: 'Baza', icon: 'database' },
    { id: 'more', label: 'Yana', icon: 'more_horiz' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 max-w-container-max mx-auto pointer-events-none">
      {/* Floating AI Assistant Button */}
      <div className="absolute -top-14 right-4 pointer-events-auto">
        <button
          onClick={onAiClick}
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary via-[#2AABEE] to-[#54c0fd] text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 border border-white/20"
          title="AI Yordamchi"
        >
          <span className="material-symbols-outlined text-[24px]">auto_awesome</span>
        </button>
      </div>

      {/* Navigation Bar */}
      <nav className="pointer-events-auto bg-surface-container-lowest/95 dark:bg-[#17212B]/95 backdrop-blur-lg border-t border-outline-variant/30 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center py-1 px-3 min-w-[56px] transition-all"
            >
              {/* Active Tab Glow Pill */}
              {isActive && (
                <span className="absolute inset-0 bg-primary-container/15 dark:bg-sky-500/20 rounded-full -z-10 animate-fade-in" />
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

                {/* Red Notification Dot for Requests tab */}
                {tab.id === 'requests' && hasUnreadRequests && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-error border border-surface dark:border-[#17212B]" />
                )}
              </div>

              <span
                className={`text-[10px] mt-0.5 font-semibold transition-colors ${
                  isActive
                    ? 'text-primary dark:text-sky-400'
                    : 'text-on-surface-variant dark:text-slate-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
