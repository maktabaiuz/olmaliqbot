import React from 'react';

export interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isSuperAdmin?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  isSuperAdmin = false,
}) => {
  if (isSuperAdmin && activeTab.startsWith('superadmin')) {
    const superAdminTabs = [
      { id: 'superadmin', label: 'Nazorat', icon: 'dashboard' },
      { id: 'superadmin_cities', label: 'Shaharlar', icon: 'location_city' },
      { id: 'superadmin_payments', label: "To'lovlar", icon: 'payments' },
      { id: 'superadmin_stats', label: 'Statistika', icon: 'analytics' },
    ];

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#16212F]/95 backdrop-blur-md border-t border-ios-sep dark:border-[#2C2C2E]">
        <div className="max-w-container-max mx-auto flex items-center justify-around h-14 px-2">
          {superAdminTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive ? 'text-gold font-bold' : 'text-ios-gray hover:text-tg'
                }`}
              >
                <span className="material-symbols-outlined text-[24px] mb-0.5">{tab.icon}</span>
                <span className="text-[10px] tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // City Admin Navigation: Bosh · Baza · [＋ Qo'shish] · Userlar · Yana
  const tabs = [
    { id: 'home', label: 'Bosh sahifa', icon: 'grid_view' },
    { id: 'database', label: 'Baza', icon: 'inventory_2' },
    { id: 'add', label: 'Qo\'shish', icon: 'add' },
    { id: 'users', label: 'Userlar', icon: 'group' },
    { id: 'more', label: 'Yana', icon: 'menu' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#16212F]/95 backdrop-blur-md border-t border-ios-sep dark:border-[#2C2C2E] shadow-lg">
      <div className="max-w-container-max mx-auto flex items-center justify-between h-14 px-3 relative">
        {tabs.map((tab) => {
          if (tab.id === 'add') {
            return (
              <div key="add" className="flex-1 flex justify-center relative -top-3">
                <button
                  type="button"
                  onClick={() => onTabChange('add')}
                  className="w-12 h-12 rounded-full bg-tg-grad text-white flex items-center justify-center shadow-fab active:scale-95 transition-transform border-2 border-white dark:border-[#16212F]"
                  title="Yangi yozuv qo'shish"
                >
                  <span className="material-symbols-outlined text-[28px]">add</span>
                </button>
              </div>
            );
          }

          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-tg font-bold' : 'text-ios-gray hover:text-tg'
              }`}
            >
              <span className="material-symbols-outlined text-[22px] mb-0.5">{tab.icon}</span>
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
