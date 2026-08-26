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
  const { user, authState, banMessage, isLoading, loginWithPassword, setupPassword } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  
  // Navigation & Control States
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<
    'normal' | 'expired' | 'moderators' | 'settings' | 'statistics' | 'bot_messages' | 'emergency' | 'dictionary' | 'chat' | 'category_detail' | 'landmark_detail' | 'subscription_billing' | 'settings_lang_theme'
  >('normal');
  const [moreSubView, setMoreSubView] = useState<'menu' | 'categories' | 'landmarks' | 'groups'>('menu');
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

  if (authState === 'BANNED') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-slate-800/90 border border-red-500/30 rounded-2xl p-7 max-w-sm w-full shadow-2xl backdrop-blur-md text-center">
          <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-400 text-2xl shadow-inner">
            🚫
          </div>
          <h1 className="text-lg font-bold mb-2 text-slate-100">Vaqtincha bloklangan</h1>
          <p className="text-slate-400 text-xs">{banMessage || 'Ko\'p marta xato parol kiritildi.'}</p>
        </div>
      </div>
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

                          {/* Guruhlar */}
                          <button
                            onClick={() => setMoreSubView('groups')}
                            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center"><span className="material-symbols-outlined text-[16px]">groups</span></span>
                              <span className="text-xs font-bold text-on-surface dark:text-slate-100">Guruhlar</span>
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

                    {/* SUBVIEW: Connected Groups List */}
                    {moreSubView === 'groups' && (
                      <MoreGroupsSubView onBack={() => setMoreSubView('menu')} />
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

const OBJECT_TYPE_LABEL: Record<string, string> = {
  USTA: 'Usta',
  DOKON_OBYEKT: "Do'kon",
  MUASSASA: 'Muassasa',
  TRANSPORT: 'Transport',
};

const MoreCategoriesSubView: React.FC<{
  onBack: () => void;
  onSelectCategory: (id: string, name: string) => void;
}> = ({ onBack, onSelectCategory }) => {
  const [cats, setCats] = useState<any[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Yangi kategoriya forma maydonlari
  const [newName, setNewName] = useState('');
  const [newObjectType, setNewObjectType] = useState<'USTA' | 'DOKON_OBYEKT' | 'MUASSASA' | 'TRANSPORT'>('USTA');
  const [newGroup, setNewGroup] = useState('');
  const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);
  const [customGroupInput, setCustomGroupInput] = useState('');
  const [newSynonyms, setNewSynonyms] = useState<string[]>([]);
  const [newSynonymInput, setNewSynonymInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadCategories = () => {
    const initData = window.Telegram?.WebApp?.initData || '';
    fetch('/api/admin/categories', { headers: { 'x-init-data': initData } })
      .then(r => r.json())
      .then(data => setCats(data || []));
  };

  const loadGroups = () => {
    const initData = window.Telegram?.WebApp?.initData || '';
    fetch('/api/admin/categories/groups', { headers: { 'x-init-data': initData } })
      .then(r => r.json())
      .then(data => {
        setGroups(data || []);
        if (data && data.length > 0) setNewGroup(data[0]);
      });
  };

  useEffect(() => {
    loadCategories();
    loadGroups();
  }, []);

  // Tanlangan Turi (Usta/Do'kon/Muassasa/Transport)ga tegishli guruhlarni
  // haqiqiy ma'lumotdan (cats) aniqlaydi — bir guruh bir nechta turga tegishli
  // bo'lishi mumkin (masalan "Avtomobil va transport" — Usta HAM Transport).
  // Eng ko'p ishlatilgani birinchi ko'rsatiladi. Hech narsa topilmasa,
  // barcha mavjud guruhlar ko'rsatiladi.
  const groupsForType = (ot: string): string[] => {
    const counts: Record<string, number> = {};
    for (const c of cats) {
      if (c.objectType === ot && c.group) counts[c.group] = (counts[c.group] || 0) + 1;
    }
    const relevant = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    return relevant.length > 0 ? relevant : groups;
  };

  const groupCountForType = (g: string, ot: string): number =>
    cats.filter((c) => c.group === g && c.objectType === ot).length;

  // Turi o'zgarganda, unga mos guruh ro'yxati ham yangilanadi
  useEffect(() => {
    const relevant = groupsForType(newObjectType);
    if (relevant.length > 0 && !relevant.includes(newGroup)) {
      setNewGroup(relevant[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newObjectType, cats]);

  const resetForm = () => {
    setNewName('');
    setNewObjectType('USTA');
    setNewGroup(groupsForType('USTA')[0] || groups[0] || '');
    setIsAddingNewGroup(false);
    setCustomGroupInput('');
    setNewSynonyms([]);
    setNewSynonymInput('');
    setFormError(null);
  };

  const handleAddSynonym = () => {
    const clean = newSynonymInput.trim().toLowerCase();
    if (clean && !newSynonyms.includes(clean)) {
      setNewSynonyms([...newSynonyms, clean]);
      setNewSynonymInput('');
    }
  };

  const handleCreateCategory = async () => {
    const finalGroup = isAddingNewGroup ? customGroupInput.trim() : newGroup;
    if (!newName.trim()) {
      setFormError('Kategoriya nomini kiriting');
      return;
    }
    setIsSaving(true);
    setFormError(null);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-init-data': initData },
        body: JSON.stringify({
          name: newName.trim(),
          objectType: newObjectType,
          group: finalGroup || null,
          synonyms: newSynonyms,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddForm(false);
        resetForm();
        loadCategories();
        loadGroups();
      } else {
        setFormError(data.message || 'Saqlashda xatolik yuz berdi');
      }
    } catch {
      setFormError('Aloqa xatoligi');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCats = cats.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const groupedCats = filteredCats.reduce<Record<string, any[]>>((acc, c) => {
    const key = c.group || 'Boshqa';
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});
  const groupOrder = Object.keys(groupedCats).sort((a, b) => {
    if (a === 'Boshqa') return 1;
    if (b === 'Boshqa') return -1;
    return groupedCats[b].length - groupedCats[a].length;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <span className="material-symbols-outlined text-[20px] font-bold">arrow_back</span>
          </button>
          <h3 className="font-bold text-sm text-on-surface dark:text-slate-100">Kategoriyalar</h3>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddForm(true);
          }}
          className="bg-primary dark:bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Qo'shish
        </button>
      </div>
      <input
        type="text"
        placeholder="Kategoriyani qidirish..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-slate-50 dark:bg-slate-900 border border-outline-variant/30 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
      />

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {groupOrder.map((groupName) => (
          <div key={groupName} className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
              {groupName} · {groupedCats[groupName].length}
            </p>
            <div className="bg-surface dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-sm divide-y divide-outline-variant/10 dark:divide-slate-800/80 overflow-hidden">
              {groupedCats[groupName].map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelectCategory(c.id, c.name)}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left text-xs font-bold text-on-surface dark:text-slate-100"
                >
                  <span className="flex items-center gap-2">
                    {c.name}
                    {c.objectType && (
                      <span className="text-[9px] font-bold text-primary dark:text-sky-400 bg-primary/10 dark:bg-sky-500/10 px-1.5 py-0.5 rounded-full">
                        {OBJECT_TYPE_LABEL[c.objectType] || c.objectType}
                      </span>
                    )}
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-slate-500">chevron_right</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: YANGI KATEGORIYA QO'SHISH */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold text-base text-on-surface dark:text-slate-100">Yangi kategoriya</h3>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nomi *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="masalan: Payvandchi"
                className="w-full bg-slate-50 dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-on-surface dark:text-slate-100 outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Turi *</label>
              <p className="text-[10px] text-slate-500 mb-1.5">Bu qanday narsa — usta, do'kon, muassasa yoki transport xizmatimi?</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: 'USTA', icon: '🔧' },
                  { id: 'DOKON_OBYEKT', icon: '🏪' },
                  { id: 'MUASSASA', icon: '🏢' },
                  { id: 'TRANSPORT', icon: '🚗' },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setNewObjectType(t.id)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                      newObjectType === t.id
                        ? 'bg-primary/10 dark:bg-sky-500/15 border-primary dark:border-sky-500 text-primary dark:text-sky-400'
                        : 'bg-slate-50 dark:bg-[#17212B] border-transparent text-slate-500'
                    }`}
                  >
                    <span>{t.icon}</span>
                    {OBJECT_TYPE_LABEL[t.id]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Guruh (bo'lim)</label>
              <p className="text-[10px] text-slate-500 mb-1.5">Yuqorida tanlangan turga mos guruhlar ko'rsatilmoqda. Mos keladigani bo'lmasa, "+ Yangi" orqali o'zingiz nom bering.</p>
              {!isAddingNewGroup ? (
                <div className="flex gap-2">
                  <select
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-on-surface dark:text-slate-100 outline-none"
                  >
                    {groupsForType(newObjectType).map((g) => (
                      <option key={g} value={g}>{g} ({groupCountForType(g, newObjectType)})</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => { setIsAddingNewGroup(true); setCustomGroupInput(''); }}
                    className="bg-slate-100 dark:bg-slate-800 text-on-surface dark:text-slate-200 px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap"
                  >
                    + Yangi
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customGroupInput}
                    onChange={(e) => setCustomGroupInput(e.target.value)}
                    placeholder="Yangi bo'lim nomi..."
                    className="flex-1 bg-slate-50 dark:bg-[#17212B] border border-primary rounded-xl px-3.5 py-2.5 text-xs text-on-surface dark:text-slate-100 outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setIsAddingNewGroup(false)}
                    className="bg-slate-100 dark:bg-slate-800 text-on-surface dark:text-slate-200 px-3 py-2 rounded-xl text-[11px] font-bold"
                  >
                    Ro'yxatdan
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sinonimlar</label>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {newSynonyms.map((s) => (
                  <span key={s} className="bg-primary/10 dark:bg-sky-500/10 text-primary dark:text-sky-400 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1">
                    {s}
                    <button type="button" onClick={() => setNewSynonyms(newSynonyms.filter(x => x !== s))} className="hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSynonymInput}
                  onChange={(e) => setNewSynonymInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSynonym(); } }}
                  placeholder="masalan: payvandkor"
                  className="flex-1 bg-slate-50 dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-on-surface dark:text-slate-100 outline-none"
                />
                <button type="button" onClick={handleAddSynonym} className="bg-slate-100 dark:bg-slate-800 text-on-surface dark:text-slate-200 px-3 py-2 rounded-xl text-[11px] font-bold">+</button>
              </div>
            </div>

            {formError && <p className="text-red-500 text-[11px] font-semibold">{formError}</p>}

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-on-surface dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleCreateCategory}
                disabled={isSaving}
                className="flex-1 py-2.5 bg-primary dark:bg-sky-500 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {isSaving ? 'Saqlanmoqda...' : "Qo'shish"}
              </button>
            </div>
          </div>
        </div>
      )}
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

const MoreGroupsSubView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/groups')
      .then(r => r.json())
      .then(data => setGroups(data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
          <span className="material-symbols-outlined text-[20px] font-bold">arrow_back</span>
        </button>
        <h3 className="font-bold text-sm text-on-surface dark:text-slate-100">Guruhlar</h3>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        Botni yangi guruh yoki kanalga qo'shish uchun — Telegram'da botni qidirib
        (@ nomi bilan), o'sha guruhga a'zo sifatida qo'shing va <b>admin</b> qiling
        (xabarlarni o'qishi uchun shart). Qo'shimcha sozlash shart emas — admin
        qilib qo'yilgan zahoti bot avtomatik ishlay boshlaydi va shu yerda paydo bo'ladi.
      </p>
      {loading ? (
        <div className="bg-surface dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-sm p-4 space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-surface dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-sm p-8 text-center text-xs text-slate-500">
          Hali hech qanday guruhga qo'shilmagan
        </div>
      ) : (
        <div className="bg-surface dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-sm divide-y divide-outline-variant/10 dark:divide-slate-800/80 overflow-hidden">
          {groups.map((g) => (
            <div key={g.id} className="flex items-center justify-between p-3.5">
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[16px]">groups</span></span>
                <span className="text-xs font-bold text-on-surface dark:text-slate-100 truncate">{g.title}</span>
              </span>
              <span className="text-[10px] text-slate-500 shrink-0">
                {new Date(g.createdAt).toLocaleDateString('uz-UZ')}
              </span>
            </div>
          ))}
        </div>
      )}
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
