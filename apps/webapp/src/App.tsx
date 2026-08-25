import React, { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BottomNav, NavTab } from './components/BottomNav';
import { AuthModal } from './components/AuthModal';
import { DashboardScreen } from './screens/DashboardScreen';
import { UserChatScreen } from './screens/UserChatScreen';
import { UsersScreen } from './screens/UsersScreen';
import { AddListingScreen } from './screens/AddListingScreen';
import { RequestsScreen } from './screens/RequestsScreen';
import { DatabaseScreen } from './screens/DatabaseScreen';
import { SubscriptionLockScreen } from './screens/SubscriptionLockScreen';

import { AccessDeniedScreen } from './screens/AccessDeniedScreen';
import { LoginScreen } from './screens/LoginScreen';
import { PasswordSetupScreen } from './screens/PasswordSetupScreen';

import { ModeratorManagementScreen } from './screens/ModeratorManagementScreen';
import { ListingDetailScreen } from './screens/ListingDetailScreen';
import { CitySettingsScreen } from './screens/CitySettingsScreen';
import { CityStatisticsScreen } from './screens/CityStatisticsScreen';
import { BotMessagesEditorScreen } from './screens/BotMessagesEditorScreen';
import { EmergencyNumbersScreen } from './screens/EmergencyNumbersScreen';
import { GlobalDictionaryScreen } from './screens/GlobalDictionaryScreen';
import { CategoryDetailScreen } from './screens/CategoryDetailScreen';
import { LandmarkDetailScreen } from './screens/LandmarkDetailScreen';
import { SubscriptionBillingScreen } from './screens/SubscriptionBillingScreen';
import { SettingsLanguageThemeScreen } from './screens/SettingsLanguageThemeScreen';
import { ErrorBoundary, OfflineStatusBanner } from './components/OfflineAndErrorNotice';

export interface AppProps {
  previewConfig?: {
    theme: 'dark' | 'light';
    role: 'SUPER_ADMIN' | 'MODERATOR_EDITOR' | 'MODERATOR_VIEWER';
    initialTab: 'home' | 'add' | 'requests' | 'database' | 'moderators' | 'detail' | 'settings' | 'statistics' | 'bot_messages' | 'emergency' | 'dictionary';
  };
}

const MainShell: React.FC<AppProps> = ({ previewConfig }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, authState, isLoading, loginWithPassword, setupPassword } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  
  // Navigation & Control States
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<
    'normal' | 'expired' | 'moderators' | 'settings' | 'statistics' | 'bot_messages' | 'emergency' | 'dictionary' | 'chat' | 'category_detail' | 'landmark_detail' | 'subscription_billing' | 'settings_lang_theme'
  >('normal');
  const [moreSubView, setMoreSubView] = useState<'menu' | 'categories' | 'landmarks'>('menu');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeCategoryName, setActiveCategoryName] = useState<string>('');
  const [activeLandmarkId, setActiveLandmarkId] = useState<string | null>(null);
  const [activeLandmarkName, setActiveLandmarkName] = useState<string>('');

  // Direct Chat states
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [activeChatUserFullName, setActiveChatUserFullName] = useState<string>('');
  const [activeChatUserUsername, setActiveChatUserUsername] = useState<string | undefined>();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [prefilledCategory, setPrefilledCategory] = useState<string | undefined>();

  // React to previewConfig changes
  useEffect(() => {
    if (previewConfig) {
      const { initialTab } = previewConfig;
      if (initialTab === 'moderators') setViewMode('moderators');
      else if (initialTab === 'settings') setViewMode('settings');
      else if (initialTab === 'statistics') setViewMode('statistics');
      else if (initialTab === 'bot_messages') setViewMode('bot_messages');
      else if (initialTab === 'emergency') setViewMode('emergency');
      else if (initialTab === 'dictionary') setViewMode('dictionary');
      else {
        setViewMode('normal');
        setActiveTab(initialTab as NavTab);
      }
    }
  }, [previewConfig]);

  // RBAC Security Guard: moderatorlar admin-only bo'limlarga kira olmaydi
  useEffect(() => {
    const superAdminOnlyModes = ['moderators', 'bot_messages', 'dictionary'];
    if (superAdminOnlyModes.includes(viewMode) && !isSuperAdmin) {
      setViewMode('normal');
    }
  }, [viewMode, isSuperAdmin]);

  // ----------------------------------------------------
  // STRICT SECURITY CHECK
  // Unauthenticated users CANNOT access the panel UI!
  // ----------------------------------------------------
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 font-sans">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800"></div>
          <div className="h-4 w-32 bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (authState === 'REQUIRES_PASSWORD') {
    return (
      <LoginScreen
        adminName={user?.name || 'Admin'}
        onLogin={async (pass) => {
          return await loginWithPassword(pass);
        }}
      />
    );
  }

  if (authState === 'REQUIRES_SETUP') {
    return (
      <PasswordSetupScreen
        adminName={user?.name || 'Admin'}
        onSetupPassword={async (oneTime, newP) => {
          return await setupPassword(oneTime, newP);
        }}
      />
    );
  }

  if (authState === 'ACCESS_DENIED') {
    return <AccessDeniedScreen />;
  }

  // Hide Bottom Navigation in Super-Admin Control, Onboarding, or Expired mode
  const isBottomNavVisible = viewMode === 'normal';

  return (
    <div className="min-h-screen bg-background dark:bg-[#121417] text-on-surface dark:text-slate-100 flex flex-col max-w-container-max mx-auto shadow-2xl relative pb-20 font-sans">
      {/* Offline Status Banner */}
      <OfflineStatusBanner />

      {/* Top Header Bar */}
      {viewMode === 'normal' && (
        <header className="sticky top-0 z-30 bg-surface/95 dark:bg-[#17212B]/95 backdrop-blur-md border-b border-outline-variant/30 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2AABEE] to-[#229ED9] text-white flex items-center justify-center font-bold text-base shadow-sm">
              K
            </div>

            <div>
              <h1 className="font-bold text-base text-on-surface dark:text-slate-100">Olmaliq</h1>
              <p className="text-[11px] text-on-surface-variant dark:text-slate-400">
                {user?.name || 'Bobur (Admin)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-on-surface-variant dark:text-slate-300 hover:bg-surface-container-high dark:hover:bg-slate-800 transition-colors"
              title="Mavzuni almashtirish"
            >
              <span className="material-symbols-outlined text-[20px]">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            {/* Admin Login Button */}
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="p-2 rounded-full text-on-surface-variant dark:text-slate-300 hover:bg-surface-container-high dark:hover:bg-slate-800 transition-colors"
              title="Admin hisobi"
            >
              <span className="material-symbols-outlined text-[20px]">account_circle</span>
            </button>
          </div>
        </header>
      )}

      {/* MAIN VIEW SWITCHER */}
      <main className="flex-1 p-4 space-y-4">
        {viewMode === 'moderators' && isSuperAdmin && (
          <ModeratorManagementScreen
            initData={window.Telegram?.WebApp?.initData || ''}
            onBack={() => setViewMode('normal')}
          />
        )}

        {viewMode === 'settings' && (
          <CitySettingsScreen
            cityName="Olmaliq"
            onNavigateScreen={(scr) => setViewMode(scr as any)}
            onBack={() => setViewMode('normal')}
          />
        )}

        {viewMode === 'statistics' && (
          <CityStatisticsScreen
            cityName="Olmaliq"
            onNavigateToAddListingWithCategory={(cat) => {
              setPrefilledCategory(cat);
              setViewMode('normal');
              setActiveTab('add');
            }}
            onBack={() => setViewMode('normal')}
          />
        )}

        {viewMode === 'bot_messages' && isSuperAdmin && (
          <BotMessagesEditorScreen onBack={() => setViewMode('normal')} />
        )}

        {viewMode === 'emergency' && (
          <EmergencyNumbersScreen
            cityName="Olmaliq"
            onBack={() => setViewMode('normal')}
          />
        )}

        {viewMode === 'dictionary' && isSuperAdmin && (
          <GlobalDictionaryScreen onBack={() => setViewMode('normal')} />
        )}

        {viewMode === 'expired' && (
          <SubscriptionLockScreen
            cityName="Olmaliq"
            onRenewPayment={() => setViewMode('normal')}
          />
        )}

        {viewMode === 'chat' && activeChatUserId && (
          <UserChatScreen
            telegramUserId={activeChatUserId}
            userFullName={activeChatUserFullName}
            userUsername={activeChatUserUsername}
            onBack={() => setViewMode('normal')}
          />
        )}

        {viewMode === 'category_detail' && activeCategoryId && (
          <CategoryDetailScreen
            categoryId={activeCategoryId}
            categoryName={activeCategoryName}
            onBack={() => setViewMode('normal')}
          />
        )}

        {viewMode === 'landmark_detail' && activeLandmarkId && (
          <LandmarkDetailScreen
            landmarkId={activeLandmarkId}
            landmarkName={activeLandmarkName}
            onBack={() => setViewMode('normal')}
          />
        )}

        {viewMode === 'subscription_billing' && (
          <SubscriptionBillingScreen onBack={() => setViewMode('normal')} />
        )}

        {viewMode === 'settings_lang_theme' && (
          <SettingsLanguageThemeScreen onBack={() => setViewMode('normal')} />
        )}

        {viewMode === 'normal' && (
          <React.Fragment>
            {selectedListingId ? (
              <ListingDetailScreen
                listingId={selectedListingId}
                onBack={() => setSelectedListingId(null)}
              />
            ) : (
              <>
                {activeTab === 'home' && (
                  <DashboardScreen
                    onNavigateTab={(tab) => {
                      setSelectedListingId(null);
                      setActiveTab(tab);
                    }}
                    onNavigateChat={(tgUserId, fullName, username) => {
                      setActiveChatUserId(tgUserId);
                      setActiveChatUserFullName(fullName);
                      setActiveChatUserUsername(username);
                      setViewMode('chat');
                    }}
                  />
                )}

                {activeTab === 'add' && (
                  <AddListingScreen
                    initialCategory={prefilledCategory}
                    onNavigateTab={(tab) => {
                      setSelectedListingId(null);
                      setActiveTab(tab);
                    }}
                  />
                )}

                {activeTab === 'requests' && (
                  <RequestsScreen
                    onNavigateTab={(tab) => {
                      setSelectedListingId(null);
                      setActiveTab(tab);
                    }}
                    onSelectCategoryToAdd={(cat) => setPrefilledCategory(cat)}
                  />
                )}

                {activeTab === 'database' && (
                  <DatabaseScreen
                    onNavigateTab={(tab) => {
                      setSelectedListingId(null);
                      setActiveTab(tab);
                    }}
                    onSelectListing={(id) => setSelectedListingId(id)}
                  />
                )}

                {activeTab === 'users' && (
                  <UsersScreen
                    onSelectUser={(tgUserId, fullName, username) => {
                      setActiveChatUserId(tgUserId);
                      setActiveChatUserFullName(fullName);
                      setActiveChatUserUsername(username);
                      setViewMode('chat');
                    }}
                  />
                )}

                {activeTab === 'more' && (
                  <div className="flex flex-col gap-4 pb-12">
                    {moreSubView === 'menu' && (
                      <div className="space-y-4">
                        {/* Profile Info Card */}
                        <div className="bg-surface dark:bg-[#17212B] p-4 border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-sm flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                            {user?.name ? user.name[0].toUpperCase() : 'A'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-extrabold text-xs text-on-surface dark:text-slate-100 truncate">
                              {user?.name || 'Bobur'}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">
                              {user?.cityName || 'Olmaliq'} admini
                            </p>
                          </div>
                          <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/25">
                            Obuna faol
                          </span>
                        </div>

                        {/* Bo'limlar group */}
                        <div className="bg-surface dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-outline-variant/10 dark:divide-slate-800/80">
                          {/* Kategoriyalar */}
                          <button
                            onClick={() => setMoreSubView('categories')}
                            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center"><span className="material-symbols-outlined text-[16px]">category</span></span>
                              <span className="text-xs font-bold text-on-surface dark:text-slate-100">Kategoriyalar</span>
                            </span>
                            <span className="material-symbols-outlined text-[16px] text-slate-500">chevron_right</span>
                          </button>

                          {/* Mo'ljallar */}
                          <button
                            onClick={() => setMoreSubView('landmarks')}
                            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-lg bg-teal-500 text-white flex items-center justify-center"><span className="material-symbols-outlined text-[16px]">location_on</span></span>
                              <span className="text-xs font-bold text-on-surface dark:text-slate-100">Mo'ljallar</span>
                            </span>
                            <span className="material-symbols-outlined text-[16px] text-slate-500">chevron_right</span>
                          </button>

                          {/* Bot Matnlari */}
                          <button
                            onClick={() => setViewMode('bot_messages')}
                            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center"><span className="material-symbols-outlined text-[16px]">smart_toy</span></span>
                              <span className="text-xs font-bold text-on-surface dark:text-slate-100">Bot matnlari</span>
                            </span>
                            <span className="material-symbols-outlined text-[16px] text-slate-500">chevron_right</span>
                          </button>

                          {/* Favqulodda Raqamlar */}
                          <button
                            onClick={() => setViewMode('emergency')}
                            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-lg bg-red-500 text-white flex items-center justify-center"><span className="material-symbols-outlined text-[16px]">emergency</span></span>
                              <span className="text-xs font-bold text-on-surface dark:text-slate-100">Favqulodda raqamlar</span>
                            </span>
                            <span className="material-symbols-outlined text-[16px] text-slate-500">chevron_right</span>
                          </button>

                          {/* Moderatorlar Boshqaruvi */}
                          {isSuperAdmin && (
                            <button
                              onClick={() => setViewMode('moderators')}
                              className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                              <span className="flex items-center gap-2.5">
                                <span className="w-7 h-7 rounded-lg bg-purple-500 text-white flex items-center justify-center"><span className="material-symbols-outlined text-[16px]">badge</span></span>
                                <span className="text-xs font-bold text-on-surface dark:text-slate-100">Moderatorlar boshqaruvi</span>
                              </span>
                              <span className="material-symbols-outlined text-[16px] text-slate-500">chevron_right</span>
                            </button>
                          )}
                        </div>

                        {/* Hisob group */}
                        <div className="bg-surface dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-outline-variant/10 dark:divide-slate-800/80">
                          {/* Obuna & To'lov */}
                          <button
                            onClick={() => setViewMode('subscription_billing')}
                            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-lg bg-[#007AFF] text-white flex items-center justify-center"><span className="material-symbols-outlined text-[16px]">credit_card</span></span>
                              <span className="text-xs font-bold text-on-surface dark:text-slate-100">Obuna & to'lov</span>
                            </span>
                            <span className="material-symbols-outlined text-[16px] text-slate-500">chevron_right</span>
                          </button>

                          {/* Til & Tema */}
                          <button
                            onClick={() => setViewMode('settings_lang_theme')}
                            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-lg bg-slate-500 text-white flex items-center justify-center"><span className="material-symbols-outlined text-[16px]">language</span></span>
                              <span className="text-xs font-bold text-on-surface dark:text-slate-100">Til / Tema</span>
                            </span>
                            <span className="material-symbols-outlined text-[16px] text-slate-500">chevron_right</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* SUBVIEW: Categories List */}
                    {moreSubView === 'categories' && (
                      <MoreCategoriesSubView
                        onBack={() => setMoreSubView('menu')}
                        onSelectCategory={(id, name) => {
                          setActiveCategoryId(id);
                          setActiveCategoryName(name);
                          setViewMode('category_detail');
                        }}
                      />
                    )}

                    {/* SUBVIEW: Landmarks List */}
                    {moreSubView === 'landmarks' && (
                      <MoreLandmarksSubView
                        onBack={() => setMoreSubView('menu')}
                        onSelectLandmark={(id, name) => {
                          setActiveLandmarkId(id);
                          setActiveLandmarkName(name);
                          setViewMode('landmark_detail');
                        }}
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </React.Fragment>
        )}
      </main>

      {/* Floating AI Assistant Drawer */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="bg-surface dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-2xl p-6 w-full max-w-container-max shadow-2xl space-y-3 animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary dark:text-sky-400 text-[24px]">auto_awesome</span>
                <h3 className="font-bold text-base">Gemini AI Copilot</h3>
              </div>
              <button onClick={() => setShowAiModal(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="text-xs text-on-surface-variant dark:text-slate-400">
              Assalomu alaykum! Men Kim bor boti sun'iy intellekt yordamchisiman.
            </p>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar (Hidden during SuperAdmin Control, Onboarding, or Expired view) */}
      {isBottomNavVisible && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hasUnreadRequests={true}
          onAiClick={() => setShowAiModal(true)}
        />
      )}

      {/* Admin Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};

const MoreCategoriesSubView: React.FC<{
  onBack: () => void;
  onSelectCategory: (id: string, name: string) => void;
}> = ({ onBack, onSelectCategory }) => {
  const [cats, setCats] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  useEffect(() => {
    fetch('/api/admin/categories')
      .then(r => r.json())
      .then(data => setCats(data || []));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
          <span className="material-symbols-outlined text-[20px] font-bold">arrow_back</span>
        </button>
        <h3 className="font-bold text-sm text-on-surface dark:text-slate-100">Kategoriyalar</h3>
      </div>
      <input
        type="text"
        placeholder="Kategoriyani qidirish..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-slate-50 dark:bg-slate-900 border border-outline-variant/30 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
      />
      <div className="bg-surface dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-sm divide-y divide-outline-variant/10 dark:divide-slate-800/80 overflow-hidden max-h-[300px] overflow-y-auto">
        {cats
          .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
          .map(c => (
            <button
              key={c.id}
              onClick={() => onSelectCategory(c.id, c.name)}
              className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left text-xs font-bold text-on-surface dark:text-slate-100"
            >
              <span>{c.name}</span>
              <span className="material-symbols-outlined text-[16px] text-slate-500">chevron_right</span>
            </button>
          ))}
      </div>
    </div>
  );
};

const MoreLandmarksSubView: React.FC<{
  onBack: () => void;
  onSelectLandmark: (id: string, name: string) => void;
}> = ({ onBack, onSelectLandmark }) => {
  const [lands, setLands] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  useEffect(() => {
    fetch('/api/admin/landmarks')
      .then(r => r.json())
      .then(data => setLands(data || []));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
          <span className="material-symbols-outlined text-[20px] font-bold">arrow_back</span>
        </button>
        <h3 className="font-bold text-sm text-on-surface dark:text-slate-100">Mo'ljallar</h3>
      </div>
      <input
        type="text"
        placeholder="Mo'ljalni qidirish..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-slate-50 dark:bg-slate-900 border border-outline-variant/30 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
      />
      <div className="bg-surface dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-sm divide-y divide-outline-variant/10 dark:divide-slate-800/80 overflow-hidden max-h-[300px] overflow-y-auto">
        {lands
          .filter(l => l.name.toLowerCase().includes(search.toLowerCase()))
          .map(l => (
            <button
              key={l.id}
              onClick={() => onSelectLandmark(l.id, l.name)}
              className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left text-xs font-bold text-on-surface dark:text-slate-100"
            >
              <span>{l.name}</span>
              <span className="material-symbols-outlined text-[16px] text-slate-500">chevron_right</span>
            </button>
          ))}
      </div>
    </div>
  );
};

export default function App(props: AppProps) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <MainShell {...props} />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
