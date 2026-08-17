import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BottomNav } from './components/BottomNav';

// Existing Screens (Overwritten with new Telegram x Apple design)
import { DashboardScreen } from './screens/DashboardScreen';
import { DatabaseScreen } from './screens/DatabaseScreen';
import { AddListingScreen } from './screens/AddListingScreen';
import { UsersChatScreen } from './screens/UsersChatScreen';
import { RequestsScreen } from './screens/RequestsScreen';
import { MoreMenuScreen } from './screens/MoreMenuScreen';
import { SuperAdminControlScreen } from './screens/SuperAdminControlScreen';
import { LoginScreen } from './screens/LoginScreen';
import { SubscriptionExpiredScreen } from './screens/SubscriptionExpiredScreen';

const MainShell: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('home');
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

  const handleSelectCategoryToAdd = (catName: string) => {
    setSelectedCategoryToAdd(catName);
    setActiveTab('add');
  };

  return (
    <div className="min-h-screen bg-ios-bg dark:bg-[#0E141B] text-[#1C1C1E] dark:text-[#E8EDF2]">
      <main className="max-w-container-max mx-auto min-h-screen">
        {/* Render View Based on Active Tab */}
        {isSuperAdmin && activeTab.startsWith('superadmin') ? (
          <SuperAdminControlScreen />
        ) : (
          <>
            {activeTab === 'home' && (
              <DashboardScreen
                onNavigateTab={(tab) => setActiveTab(tab)}
                onSelectCategoryToAdd={handleSelectCategoryToAdd}
              />
            )}
            {activeTab === 'database' && (
              <DatabaseScreen
                onNavigateTab={(tab) => setActiveTab(tab)}
                onSelectCategoryToAdd={handleSelectCategoryToAdd}
              />
            )}
            {activeTab === 'add' && (
              <AddListingScreen
                onNavigateTab={(tab) => setActiveTab(tab)}
                initialCategoryName={selectedCategoryToAdd}
              />
            )}
            {activeTab === 'users' && (
              <UsersChatScreen
                onNavigateTab={(tab: string) => setActiveTab(tab)}
                onSelectCategoryToAdd={handleSelectCategoryToAdd}
              />
            )}
            {activeTab === 'requests' && (
              <RequestsScreen
                onNavigateTab={(tab: string) => setActiveTab(tab)}
                onSelectCategoryToAdd={handleSelectCategoryToAdd}
              />
            )}
            {activeTab === 'more' && <MoreMenuScreen />}
          </>
        )}
      </main>

      {/* Floating Bottom Nav Bar (Bosh · Baza · [＋ gradient] · Userlar · Yana) */}
      <BottomNav
        activeTab={isSuperAdmin && !activeTab.startsWith('superadmin') ? 'home' : activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
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
