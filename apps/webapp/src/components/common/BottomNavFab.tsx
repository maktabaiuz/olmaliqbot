import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export interface BottomNavFabProps {
  isSuperAdmin?: boolean;
}

export const BottomNavFab: React.FC<BottomNavFabProps> = ({ isSuperAdmin = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  if (isSuperAdmin && path.startsWith('/superadmin')) {
    // Super-Admin Navigation Bar
    const superAdminTabs = [
      { id: '/superadmin', label: 'Nazorat', icon: 'dashboard' },
      { id: '/superadmin/cities', label: 'Shaharlar', icon: 'location_city' },
      { id: '/superadmin/payments', label: "To'lovlar", icon: 'payments' },
      { id: '/superadmin/stats', label: 'Statistika', icon: 'analytics' },
    ];

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#16212F]/90 backdrop-blur-md border-t border-ios-separator dark:border-ios-darkSeparator pb-safe">
        <div className="max-w-container-max mx-auto flex items-center justify-around h-14 px-2">
          {superAdminTabs.map((tab) => {
            const isActive = path === tab.id || (tab.id !== '/superadmin' && path.startsWith(tab.id));
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive ? 'text-gold-start font-bold' : 'text-ios-gray hover:text-tg-textLight dark:hover:text-tg-textDark'
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

  // City Admin Navigation Bar with Center FAB "＋"
  const tabs = [
    { id: '/dashboard', label: 'Bosh sahifa', icon: 'grid_view' },
    { id: '/database', label: 'Baza', icon: 'inventory_2' },
    { id: 'FAB', label: 'Qo\'shish', icon: 'add' },
    { id: '/users', label: 'Userlar', icon: 'group' },
    { id: '/more', label: 'Yana', icon: 'menu' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#16212F]/95 backdrop-blur-md border-t border-ios-separator dark:border-ios-darkSeparator pb-safe shadow-lg">
      <div className="max-w-container-max mx-auto flex items-center justify-between h-14 px-3 relative">
        {tabs.map((tab) => {
          if (tab.id === 'FAB') {
            return (
              <div key="FAB" className="flex-1 flex justify-center relative -top-3">
                <button
                  type="button"
                  onClick={() => navigate('/add')}
                  className="w-12 h-12 rounded-full bg-tg-gradient text-white flex items-center justify-center shadow-fab active:scale-95 transition-transform border-2 border-white dark:border-[#16212F]"
                  title="Yangi yozuv qo'shish"
                >
                  <span className="material-symbols-outlined text-[28px]">add</span>
                </button>
              </div>
            );
          }

          const isActive = path === tab.id || (tab.id !== '/dashboard' && path.startsWith(tab.id));
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-ios-blue font-bold' : 'text-ios-gray hover:text-tg-textLight dark:hover:text-tg-textDark'
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
