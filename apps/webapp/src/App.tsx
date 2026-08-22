import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BottomNav } from './components/BottomNav';

// Screens
import { DashboardScreen } from './screens/DashboardScreen';
import { DatabaseScreen } from './screens/DatabaseScreen';
import { AddListingScreen } from './screens/AddListingScreen';
import { UsersChatScreen } from './screens/UsersChatScreen';
import { RequestsScreen } from './screens/RequestsScreen';
import { MoreMenuScreen } from './screens/MoreMenuScreen';
import { SuperAdminControlScreen } from './screens/SuperAdminControlScreen';
import { SuperAdminCityDetailScreen } from './screens/superadmin/SuperAdminCityDetailScreen';
import { SuperAdminOnboardingScreen } from './screens/superadmin/SuperAdminOnboardingScreen';
import { LoginScreen } from './screens/LoginScreen';
import { SubscriptionExpiredScreen } from './screens/SubscriptionExpiredScreen';

// Common Header
import { TopHeader } from './components/common/TopHeader';

type ViewMode = 'home' | 'database' | 'add' | 'users' | 'requests' | 'more' | 'superadmin' | string;

const MainShell: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [view, setView] = useState<ViewMode>('home');
  const [selectedCategoryToAdd, setSelectedCategoryToAdd] = useState<string>('');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ios-bg dark:bg-[#0E141B] text-ios-gray text-[14px]">
        Yuklanmoqda...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (user?.isSubscriptionExpired) {
    return <SubscriptionExpiredScreen />;
  }

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const handleTabSelect = (tab: string) => {
    setView(tab);
  };

  const handleSelectCategoryToAdd = (catName: string) => {
    setSelectedCategoryToAdd(catName);
    setView('add');
  };

  const handleNavigateSubScreen = (subScreenId: string) => {
    setView(`sub_${subScreenId}`);
  };

  return (
    <div className="min-h-screen bg-ios-bg dark:bg-[#0E141B] text-[#1C1C1E] dark:text-[#E8EDF2]">
      <main className="max-w-container-max mx-auto min-h-screen">
        {/* VIEW 1: HOME */}
        {view === 'home' && (
          <DashboardScreen
            onNavigateTab={handleTabSelect}
            onSelectCategoryToAdd={handleSelectCategoryToAdd}
          />
        )}

        {/* VIEW 2: DATABASE (BAZA) */}
        {view === 'database' && (
          <DatabaseScreen
            onNavigateTab={handleTabSelect}
            onSelectCategoryToAdd={handleSelectCategoryToAdd}
          />
        )}

        {/* VIEW 3: ADD (+ QO'SHISH) */}
        {view === 'add' && (
          <AddListingScreen
            onNavigateTab={handleTabSelect}
            initialCategoryName={selectedCategoryToAdd}
          />
        )}

        {/* VIEW 4: USERS */}
        {view === 'users' && <UsersChatScreen />}

        {/* VIEW 5: REQUESTS */}
        {view === 'requests' && (
          <RequestsScreen
            onNavigateTab={handleTabSelect}
            onSelectCategoryToAdd={handleSelectCategoryToAdd}
          />
        )}

        {/* VIEW 6: MORE (YANA) */}
        {view === 'more' && (
          <MoreMenuScreen onNavigateSubScreen={handleNavigateSubScreen} />
        )}

        {/* VIEW 7: SUPER-ADMIN CONTROL */}
        {view === 'superadmin' && (
          <SuperAdminControlScreen onNavigateSubScreen={handleNavigateSubScreen} />
        )}

        {/* VIEW 8: SUB-SCREENS */}
        {view.startsWith('sub_') && (
          <div className="p-4 pb-24 animate-fade-in">
            {view === 'sub_categories' && (
              <div className="space-y-3">
                <TopHeader title="Kategoriyalar va Sinonimlar" showBack onBack={() => setView('more')} />
                <div className="bg-white dark:bg-[#16212F] p-4 rounded-card border border-ios-sep space-y-2 text-[14px]">
                  <div className="flex justify-between font-bold border-b pb-2"><span>Kategoriya</span><span>Sinonimlar</span></div>
                  <div className="flex justify-between"><span>🔧 Gazavik</span><span className="text-ios-gray">газовик, gaz ustasi</span></div>
                  <div className="flex justify-between"><span>🧱 Kafelchi</span><span className="text-ios-gray">плитщик, kafel</span></div>
                  <div className="flex justify-between"><span>🚰 Santexnik</span><span className="text-ios-gray">сантехник, truba</span></div>
                  <div className="flex justify-between"><span>⚡ Elektrik</span><span className="text-ios-gray">электрик, svet</span></div>
                </div>
              </div>
            )}

            {view === 'sub_landmarks' && (
              <div className="space-y-3">
                <TopHeader title="Mo'ljallar va Manzillar" showBack onBack={() => setView('more')} />
                <div className="bg-white dark:bg-[#16212F] p-4 rounded-card border border-ios-sep space-y-2 text-[14px]">
                  <div className="flex justify-between font-bold border-b pb-2"><span>Mo'ljal</span><span>Xalqona nomlar</span></div>
                  <div className="flex justify-between"><span>📍 Korzinka</span><span className="text-ios-gray">карзинка, супермаркет</span></div>
                  <div className="flex justify-between"><span>📍 3-Mavze</span><span className="text-ios-gray">3 микрорайон</span></div>
                  <div className="flex justify-between"><span>📍 Bozor orqasi</span><span className="text-ios-gray">рынок, бозор</span></div>
                </div>
              </div>
            )}

            {view === 'sub_bot-messages' && (
              <div className="space-y-3">
                <TopHeader title="Bot Javob Matnlari" showBack onBack={() => setView('more')} />
                <div className="bg-white dark:bg-[#16212F] p-4 rounded-card border border-ios-sep space-y-3 text-[13px]">
                  <div className="p-3 bg-ios-bg dark:bg-[#0E141B] rounded-btn border">
                    <span className="font-bold text-tg">1. Guruhda Usta Topilganda:</span>
                    <p className="text-ios-gray mt-1">"🔧 {`{category}`}\n{`{name}`} ✅ ⭐4.4\n📍 {`{landmark}`}\n📞 {`{phone}`}"</p>
                  </div>
                </div>
              </div>
            )}

            {view === 'sub_emergency' && (
              <div className="space-y-3">
                <TopHeader title="Favqulodda Raqamlar" showBack onBack={() => setView('more')} />
                <div className="bg-white dark:bg-[#16212F] p-4 rounded-card border border-ios-sep space-y-2 text-[14px]">
                  <div className="flex justify-between font-bold text-ios-red"><span>🔥 Yong'in xavfsizligi</span><span>101</span></div>
                  <div className="flex justify-between font-bold text-ios-blue"><span>🚔 Militsiya</span><span>102</span></div>
                  <div className="flex justify-between font-bold text-ios-green"><span>🚑 Tez yordam</span><span>103</span></div>
                  <div className="flex justify-between font-bold text-ios-orange"><span>🔴 Gaz avariya xizmati</span><span>104</span></div>
                </div>
              </div>
            )}

            {view === 'sub_moderators' && (
              <div className="space-y-3">
                <TopHeader title="Moderatorlar" showBack onBack={() => setView('more')} />
                <div className="bg-white dark:bg-[#16212F] p-4 rounded-card border border-ios-sep space-y-2 text-[14px]">
                  <div className="flex justify-between items-center border-b pb-2">
                    <div><strong>Alisher Moderator</strong><div className="text-[11px] text-ios-gray">Tasdiqlovchi</div></div>
                    <span className="text-[11px] bg-ios-green/15 text-ios-green px-2 py-0.5 rounded-pill font-bold">Faol</span>
                  </div>
                </div>
              </div>
            )}

            {view === 'sub_subscription' && (
              <div className="space-y-3">
                <TopHeader title="Obuna & To'lovlar" showBack onBack={() => setView('more')} />
                <div className="bg-white dark:bg-[#16212F] p-4 rounded-card border border-ios-sep space-y-3 text-[13px]">
                  <div className="flex justify-between"><span>Joriy Tarif:</span> <strong className="text-tg">Standart (299 000 so'm/oy)</strong></div>
                  <div className="flex justify-between"><span>To'lov muddati:</span> <strong className="text-ios-green">14 Avgust 2026 y. (Faol)</strong></div>
                </div>
              </div>
            )}

            {view === 'sub_superadmin_city' && (
              <div className="space-y-3">
                <TopHeader title="Olmaliq shahri" showBack onBack={() => setView('superadmin')} />
                <SuperAdminCityDetailScreen />
              </div>
            )}

            {view === 'sub_superadmin_onboarding' && (
              <div className="space-y-3">
                <TopHeader title="Yangi shahar" showBack onBack={() => setView('superadmin')} />
                <SuperAdminOnboardingScreen />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Bottom Nav Bar */}
      <BottomNav
        activeTab={view.startsWith('sub_') ? 'more' : view}
        onTabChange={handleTabSelect}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainShell />
    </AuthProvider>
  );
};

export default App;
