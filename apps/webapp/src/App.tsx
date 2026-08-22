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

const MainShell: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedCategoryToAdd, setSelectedCategoryToAdd] = useState<string>('');
  const [drillDownScreen, setDrillDownScreen] = useState<string | null>(null);

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

  const handleTabChange = (tab: string) => {
    setDrillDownScreen(null); // Clear any open sub-screen
    setActiveTab(tab);
  };

  const handleSelectCategoryToAdd = (catName: string) => {
    setSelectedCategoryToAdd(catName);
    setDrillDownScreen(null);
    setActiveTab('add');
  };

  const handleNavigateSubScreen = (screenId: string) => {
    setDrillDownScreen(screenId);
  };

  return (
    <div className="min-h-screen bg-ios-bg dark:bg-[#0E141B] text-[#1C1C1E] dark:text-[#E8EDF2]">
      <main className="max-w-container-max mx-auto min-h-screen">
        {/* If a specific sub-screen (like category details or emergency) is open */}
        {drillDownScreen ? (
          <div className="p-4 pb-24 animate-fade-in">
            {drillDownScreen === 'categories' && (
              <div className="space-y-3">
                <TopHeader title="Kategoriyalar va Sinonimlar" showBack onBack={() => setDrillDownScreen(null)} />
                <div className="bg-white dark:bg-[#16212F] p-4 rounded-card border border-ios-sep space-y-2 text-[14px]">
                  <div className="flex justify-between font-bold border-b pb-2"><span>Kategoriya</span><span>Sinonimlar</span></div>
                  <div className="flex justify-between"><span>🔧 Gazavik</span><span className="text-ios-gray">газовик, gaz ustasi</span></div>
                  <div className="flex justify-between"><span>🧱 Kafelchi</span><span className="text-ios-gray">плитщик, kafel</span></div>
                  <div className="flex justify-between"><span>🚰 Santexnik</span><span className="text-ios-gray">сантехник, truba</span></div>
                </div>
              </div>
            )}

            {drillDownScreen === 'landmarks' && (
              <div className="space-y-3">
                <TopHeader title="Mo'ljallar va Manzillar" showBack onBack={() => setDrillDownScreen(null)} />
                <div className="bg-white dark:bg-[#16212F] p-4 rounded-card border border-ios-sep space-y-2 text-[14px]">
                  <div className="flex justify-between font-bold border-b pb-2"><span>Mo'ljal</span><span>Xalqona nomlar</span></div>
                  <div className="flex justify-between"><span>📍 Korzinka</span><span className="text-ios-gray">карзинка, супермаркет</span></div>
                  <div className="flex justify-between"><span>📍 3-Mavze</span><span className="text-ios-gray">3 микрорайон</span></div>
                  <div className="flex justify-between"><span>📍 Bozor orqasi</span><span className="text-ios-gray">рынок, бозор</span></div>
                </div>
              </div>
            )}

            {drillDownScreen === 'bot-messages' && (
              <div className="space-y-3">
                <TopHeader title="Bot Javob Matnlari" showBack onBack={() => setDrillDownScreen(null)} />
                <div className="bg-white dark:bg-[#16212F] p-4 rounded-card border border-ios-sep space-y-3 text-[13px]">
                  <div className="p-3 bg-ios-bg dark:bg-[#0E141B] rounded-btn border">
                    <span className="font-bold text-tg">1. Guruhda Usta Topilganda:</span>
                    <p className="text-ios-gray mt-1">"🔧 {`{category}`}\n{`{name}`} ✅ ⭐4.4\n📍 {`{landmark}`}\n📞 {`{phone}`}"</p>
                  </div>
                </div>
              </div>
            )}

            {drillDownScreen === 'emergency' && (
              <div className="space-y-3">
                <TopHeader title="Favqulodda Raqamlar" showBack onBack={() => setDrillDownScreen(null)} />
                <div className="bg-white dark:bg-[#16212F] p-4 rounded-card border border-ios-sep space-y-2 text-[14px]">
                  <div className="flex justify-between font-bold text-ios-red"><span>🔥 Yong'in xavfsizligi</span><span>101</span></div>
                  <div className="flex justify-between font-bold text-ios-blue"><span>🚔 Militsiya</span><span>102</span></div>
                  <div className="flex justify-between font-bold text-ios-green"><span>🚑 Tez yordam</span><span>103</span></div>
                  <div className="flex justify-between font-bold text-ios-orange"><span>🔴 Gaz avariya xizmati</span><span>104</span></div>
                </div>
              </div>
            )}

            {drillDownScreen === 'moderators' && (
              <div className="space-y-3">
                <TopHeader title="Moderatorlar" showBack onBack={() => setDrillDownScreen(null)} />
                <div className="bg-white dark:bg-[#16212F] p-4 rounded-card border border-ios-sep space-y-2 text-[14px]">
                  <div className="flex justify-between items-center border-b pb-2">
                    <div><strong>Alisher Moderator</strong><div className="text-[11px] text-ios-gray">Tasdiqlovchi</div></div>
                    <span className="text-[11px] bg-ios-green/15 text-ios-green px-2 py-0.5 rounded-pill font-bold">Faol</span>
                  </div>
                </div>
              </div>
            )}

            {drillDownScreen === 'subscription' && (
              <div className="space-y-3">
                <TopHeader title="Obuna & To'lovlar" showBack onBack={() => setDrillDownScreen(null)} />
                <div className="bg-white dark:bg-[#16212F] p-4 rounded-card border border-ios-sep space-y-3 text-[13px]">
                  <div className="flex justify-between"><span>Joriy Tarif:</span> <strong className="text-tg">Standart (299 000 so'm/oy)</strong></div>
                  <div className="flex justify-between"><span>To'lov muddati:</span> <strong className="text-ios-green">14 Avgust 2026 y. (Faol)</strong></div>
                </div>
              </div>
            )}

            {drillDownScreen === 'superadmin_city' && <SuperAdminCityDetailScreen />}
            {drillDownScreen === 'superadmin_onboarding' && <SuperAdminOnboardingScreen />}
          </div>
        ) : (
          /* Render Main Navigation Tabs */
          <>
            {isSuperAdmin && activeTab.startsWith('superadmin') ? (
              <SuperAdminControlScreen onNavigateSubScreen={handleNavigateSubScreen} />
            ) : (
              <>
                {activeTab === 'home' && (
                  <DashboardScreen
                    onNavigateTab={handleTabChange}
                    onSelectCategoryToAdd={handleSelectCategoryToAdd}
                  />
                )}

                {activeTab === 'database' && (
                  <DatabaseScreen
                    onNavigateTab={handleTabChange}
                    onSelectCategoryToAdd={handleSelectCategoryToAdd}
                  />
                )}

                {activeTab === 'add' && (
                  <AddListingScreen
                    onNavigateTab={handleTabChange}
                    initialCategoryName={selectedCategoryToAdd}
                  />
                )}

                {activeTab === 'users' && <UsersChatScreen />}

                {activeTab === 'requests' && (
                  <RequestsScreen
                    onNavigateTab={handleTabChange}
                    onSelectCategoryToAdd={handleSelectCategoryToAdd}
                  />
                )}

                {activeTab === 'more' && (
                  <MoreMenuScreen onNavigateSubScreen={handleNavigateSubScreen} />
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Floating Bottom Nav Bar */}
      <BottomNav
        activeTab={isSuperAdmin && !activeTab.startsWith('superadmin') ? 'home' : activeTab}
        onTabChange={handleTabChange}
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
