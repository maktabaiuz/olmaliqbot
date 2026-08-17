import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BottomNavFab } from './components/common/BottomNavFab';

// Admin Screens
import { DashboardScreen } from './screens/DashboardScreen';
import { DatabaseScreen } from './screens/DatabaseScreen';
import { AddListingWizardScreen } from './screens/AddListingWizardScreen';
import { UsersChatScreen } from './screens/UsersChatScreen';
import { RequestsScreen } from './screens/RequestsScreen';
import { MoreMenuScreen } from './screens/MoreMenuScreen';
import { LoginScreen } from './screens/LoginScreen';
import { SubscriptionExpiredScreen } from './screens/SubscriptionExpiredScreen';

// Super Admin Screens
import { SuperAdminDashboardScreen } from './screens/superadmin/SuperAdminDashboardScreen';
import { SuperAdminCityDetailScreen } from './screens/superadmin/SuperAdminCityDetailScreen';
import { SuperAdminOnboardingScreen } from './screens/superadmin/SuperAdminOnboardingScreen';

const AppRoutes: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-tg-bgLight dark:bg-tg-bgDark text-tg-textMuted text-[14px]">
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

  return (
    <div className="min-h-screen bg-tg-bgLight dark:bg-tg-bgDark text-tg-textLight dark:text-tg-textDark">
      <main className="max-w-container-max mx-auto min-h-screen">
        <Routes>
          {/* Super Admin Routes */}
          {isSuperAdmin && (
            <>
              <Route path="/superadmin" element={<SuperAdminDashboardScreen />} />
              <Route path="/superadmin/city/:id" element={<SuperAdminCityDetailScreen />} />
              <Route path="/superadmin/onboarding" element={<SuperAdminOnboardingScreen />} />
              <Route path="/superadmin/cities" element={<SuperAdminDashboardScreen />} />
              <Route path="/superadmin/payments" element={<SuperAdminDashboardScreen />} />
              <Route path="/superadmin/stats" element={<SuperAdminDashboardScreen />} />
            </>
          )}

          {/* Admin Routes */}
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/database" element={<DatabaseScreen />} />
          <Route path="/add" element={<AddListingWizardScreen />} />
          <Route path="/users" element={<UsersChatScreen />} />
          <Route path="/requests" element={<RequestsScreen />} />
          <Route path="/more" element={<MoreMenuScreen />} />
          <Route path="/more/*" element={<MoreMenuScreen />} />

          {/* Fallback Redirection */}
          <Route
            path="*"
            element={<Navigate to={isSuperAdmin ? '/superadmin' : '/dashboard'} replace />}
          />
        </Routes>
      </main>

      {/* Floating Bottom Nav Bar */}
      <BottomNavFab isSuperAdmin={isSuperAdmin} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
