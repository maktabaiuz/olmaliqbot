import React, { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { FeedbackProvider, useFeedback } from './context/FeedbackContext';
import { BottomNav, NavTab } from './components/BottomNav';
import { IosSection, IosRow } from './components/ios/IosCard';
import { IosHeader } from './components/ios/IosHeader';
import { IosSearchBar } from './components/ios/IosSearchBar';
import { DashboardScreen } from './screens/DashboardScreen';
import { UserChatScreen } from './screens/UserChatScreen';
import { UsersScreen } from './screens/UsersScreen';
import { AddListingScreen } from './screens/AddListingScreen';
import { RequestsScreen } from './screens/RequestsScreen';
import { DatabaseScreen } from './screens/DatabaseScreen';

import { AccessDeniedScreen } from './screens/AccessDeniedScreen';
import { LoginScreen } from './screens/LoginScreen';
import { WebLoginScreen } from './screens/WebLoginScreen';
import { PasswordSetupScreen } from './screens/PasswordSetupScreen';

import { ModeratorManagementScreen } from './screens/ModeratorManagementScreen';
import { ListingDetailScreen } from './screens/ListingDetailScreen';
import { BotMessagesEditorScreen } from './screens/BotMessagesEditorScreen';
import { EmergencyNumbersScreen } from './screens/EmergencyNumbersScreen';
import { GlobalDictionaryScreen } from './screens/GlobalDictionaryScreen';
import { CategoryDetailScreen } from './screens/CategoryDetailScreen';
import { LandmarkDetailScreen } from './screens/LandmarkDetailScreen';
import { GroupDetailScreen } from './screens/GroupDetailScreen';
import { SettingsLanguageThemeScreen } from './screens/SettingsLanguageThemeScreen';
import { BroadcastScreen } from './screens/BroadcastScreen';
import { UsefulBotsScreen } from './screens/UsefulBotsScreen';
import { ModerationLogsScreen } from './screens/ModerationLogsScreen';
import { ErrorBoundary, OfflineStatusBanner } from './components/OfflineAndErrorNotice';
import { SwipeToDeleteRow } from './components/SwipeToDeleteRow';
import { avatarColorForName } from './utils/avatarColor';

export interface AppProps {
  previewConfig?: {
    theme: 'dark' | 'light';
    role: 'SUPER_ADMIN' | 'MODERATOR_EDITOR' | 'MODERATOR_VIEWER';
    initialTab: 'home' | 'add' | 'requests' | 'database' | 'moderators' | 'detail' | 'bot_messages' | 'emergency' | 'dictionary';
  };
}

const MoreRow: React.FC<{ icon: string; iconColor: string; label: string; onClick: () => void; last?: boolean }> = ({
  icon,
  iconColor,
  label,
  onClick,
  last,
}) => (
  <IosRow onClick={onClick} last={last}>
    <span className="flex items-center gap-3">
      <span
        className="w-7 h-7 rounded-[7px] text-white flex items-center justify-center shrink-0"
        style={{ backgroundColor: iconColor }}
      >
        <span className="material-symbols-outlined text-[16px]">{icon}</span>
      </span>
      <span className="text-[15px] text-ios-label">{label}</span>
    </span>
    <span className="material-symbols-outlined text-[18px] text-ios-label-secondary/50">chevron_right</span>
  </IosRow>
);

const MainShell: React.FC<AppProps> = ({ previewConfig }) => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const { user, authState, banMessage, isLoading, loginWithPassword, setupPassword, loginWithWebCredentials } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  
  // Navigation & Control States
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<
    'normal' | 'moderators' | 'bot_messages' | 'emergency' | 'dictionary' | 'chat' | 'category_detail' | 'landmark_detail' | 'group_detail' | 'settings_lang_theme'
  >('normal');
  const [moreSubView, setMoreSubView] = useState<'menu' | 'categories' | 'landmarks' | 'groups' | 'community_link' | 'broadcast' | 'useful_bots' | 'moderation_logs'>('menu');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeCategoryName, setActiveCategoryName] = useState<string>('');
  const [activeLandmarkId, setActiveLandmarkId] = useState<string | null>(null);
  const [activeLandmarkName, setActiveLandmarkName] = useState<string>('');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeGroupTitle, setActiveGroupTitle] = useState<string>('');

  // Direct Chat states
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [activeChatUserFullName, setActiveChatUserFullName] = useState<string>('');
  const [activeChatUserUsername, setActiveChatUserUsername] = useState<string | undefined>();

  const [prefilledCategory, setPrefilledCategory] = useState<string | undefined>();
  const [hasUnreadRequests, setHasUnreadRequests] = useState(false);

  // "So'rovlar" tabidagi qizil nuqta — MUHIM (2026-09): avval bu doim
  // hardcoded `true` edi (real holatdan qat'i nazar) va BottomNav uni
  // umuman ishlatmasdi ham — ikki karra o'lik kod. Endi bazadagi
  // "hali kategoriyaga bog'lanmagan yangi ehtiyojlar" soniga qarab
  // haqiqiy holatni ko'rsatadi.
  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData || '';
    fetch('/api/admin/requests/top-missing?limit=1', { headers: { 'x-init-data': initData } })
      .then((r) => r.json())
      .then((data) => setHasUnreadRequests(Array.isArray(data) && data.length > 0))
      .catch(() => setHasUnreadRequests(false));
  }, []);

  // React to previewConfig changes
  useEffect(() => {
    if (previewConfig) {
      const { initialTab } = previewConfig;
      if (initialTab === 'moderators') setViewMode('moderators');
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
      <div className="min-h-screen bg-ios-bg text-ios-label flex items-center justify-center p-6">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-ios-fill/20"></div>
          <div className="h-3.5 w-28 bg-ios-fill/20 rounded-full"></div>
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

  if (authState === 'REQUIRES_WEB_LOGIN') {
    return (
      <WebLoginScreen
        onLogin={async (loginUsername, pass) => {
          return await loginWithWebCredentials(loginUsername, pass);
        }}
      />
    );
  }

  if (authState === 'BANNED') {
    return (
      <div className="min-h-screen bg-ios-bg text-ios-label flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-sm">
          <div className="w-16 h-16 bg-ios-red/10 rounded-full flex items-center justify-center mx-auto mb-4 text-ios-red">
            <span className="material-symbols-outlined text-[28px]">block</span>
          </div>
          <h1 className="text-[20px] font-semibold mb-1 text-ios-label">Vaqtincha bloklangan</h1>
          <p className="text-ios-label-secondary/70 text-[15px]">{banMessage || 'Ko\'p marta xato parol kiritildi.'}</p>
        </div>
      </div>
    );
  }

  if (authState === 'REQUIRES_SETUP') {
    return (
      <PasswordSetupScreen
        adminName={user?.name || 'Admin'}
        onSetupPassword={async (pass) => {
          return await setupPassword(pass);
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
    <div className="min-h-screen bg-ios-bg text-ios-label flex flex-col max-w-container-max mx-auto relative pb-20">
      {/* Offline Status Banner */}
      <OfflineStatusBanner />

      {/* Top Header Bar — iOS style */}
      {viewMode === 'normal' && (
        <header className="sticky top-0 z-30 bg-ios-card/90 backdrop-blur-xl px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-full text-white flex items-center justify-center font-semibold text-base"
              style={{ backgroundColor: avatarColorForName(user?.name || 'Olmaliq') }}
            >
              {(user?.name || 'Olmaliq').trim()[0]?.toUpperCase() || 'O'}
            </div>

            <div>
              <h1 className="font-semibold text-[15px] text-ios-label leading-tight">Olmaliq</h1>
              <p className="text-[12px] text-ios-label-secondary/70 leading-tight">
                {user?.name || 'Bobur (Admin)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full text-ios-blue flex items-center justify-center active:opacity-50 transition-opacity"
              title="Mavzuni almashtirish"
            >
              <span className="material-symbols-outlined text-[20px]">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
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

        {viewMode === 'group_detail' && activeGroupId && (
          <GroupDetailScreen
            groupId={activeGroupId}
            groupTitle={activeGroupTitle}
            onBack={() => setViewMode('normal')}
          />
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
                      <div className="flex flex-col gap-6 -mx-4 px-4 pt-1">
                        <h1 className="text-[28px] font-bold tracking-[-0.02em] text-ios-label -mb-2">{t('more_title')}</h1>

                        {/* Profil */}
                        <IosSection>
                          <IosRow last>
                            <span className="flex items-center gap-3">
                              <span
                                className="w-11 h-11 rounded-full text-white flex items-center justify-center font-semibold text-base"
                                style={{ backgroundColor: avatarColorForName(user?.name || 'Admin') }}
                              >
                                {user?.name ? user.name[0].toUpperCase() : 'A'}
                              </span>
                              <span className="flex flex-col">
                                <span className="text-[15px] font-medium text-ios-label">{user?.name || 'Bobur'}</span>
                                <span className="text-[13px] text-ios-label-secondary/70">{user?.cityName || 'Olmaliq'} admini</span>
                              </span>
                            </span>
                          </IosRow>
                        </IosSection>

                        {/* Katalog */}
                        <IosSection title={t('more_section_catalog')}>
                          <MoreRow icon="category" iconColor="rgb(88 86 214)" label={t('more_item_categories')} onClick={() => setMoreSubView('categories')} />
                          <MoreRow icon="location_on" iconColor="rgb(48 176 199)" label={t('more_item_landmarks')} onClick={() => setMoreSubView('landmarks')} />
                          <MoreRow icon="groups" iconColor="rgb(0 122 255)" label={t('more_item_groups')} onClick={() => setMoreSubView('groups')} />
                          <MoreRow icon="campaign" iconColor="rgb(255 45 85)" label={t('more_item_community_link')} onClick={() => setMoreSubView('community_link')} last />
                        </IosSection>

                        {/* Shahar */}
                        <IosSection title={t('more_section_city')}>
                          <MoreRow icon="emergency" iconColor="rgb(255 59 48)" label={t('more_item_emergency')} onClick={() => setViewMode('emergency')} last />
                        </IosSection>

                        {/* Moderatsiya (faqat SUPER_ADMIN) */}
                        {isSuperAdmin && (
                          <IosSection title={t('more_section_moderation')}>
                            <MoreRow icon="badge" iconColor="rgb(175 82 222)" label={t('more_item_moderators')} onClick={() => setViewMode('moderators')} />
                            <MoreRow icon="campaign" iconColor="rgb(88 86 214)" label={t('more_item_broadcast')} onClick={() => setMoreSubView('broadcast')} />
                            <MoreRow icon="smart_toy" iconColor="rgb(48 176 199)" label={t('more_item_useful_bots')} onClick={() => setMoreSubView('useful_bots')} />
                            <MoreRow icon="block" iconColor="rgb(255 45 85)" label={t('more_item_moderation_logs')} onClick={() => setMoreSubView('moderation_logs')} last />
                          </IosSection>
                        )}

                        {/* Tizim */}
                        <IosSection title={t('more_section_system')}>
                          {isSuperAdmin && (
                            <MoreRow icon="smart_toy" iconColor="rgb(255 149 0)" label={t('more_item_bot_messages')} onClick={() => setViewMode('bot_messages')} />
                          )}
                          {isSuperAdmin && (
                            <MoreRow icon="menu_book" iconColor="rgb(142 142 147)" label={t('more_item_dictionary')} onClick={() => setViewMode('dictionary')} />
                          )}
                          <MoreRow icon="language" iconColor="rgb(0 122 255)" label={t('more_item_settings_lang_theme')} onClick={() => setViewMode('settings_lang_theme')} last />
                        </IosSection>
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
                      <MoreGroupsSubView
                        onBack={() => setMoreSubView('menu')}
                        onSelectGroup={(id, title) => {
                          setActiveGroupId(id);
                          setActiveGroupTitle(title);
                          setViewMode('group_detail');
                        }}
                      />
                    )}
                    {moreSubView === 'community_link' && (
                      <CommunityLinkSubView onBack={() => setMoreSubView('menu')} />
                    )}
                    {moreSubView === 'useful_bots' && (
                      <UsefulBotsScreen onBack={() => setMoreSubView('menu')} />
                    )}
                    {moreSubView === 'moderation_logs' && (
                      <ModerationLogsScreen onBack={() => setMoreSubView('menu')} />
                    )}
                    {moreSubView === 'broadcast' && (
                      <BroadcastScreen onBack={() => setMoreSubView('menu')} />
                    )}
                  </div>
                )}
              </>
            )}
          </React.Fragment>
        )}
      </main>

      {/* Bottom Navigation Bar (Hidden during SuperAdmin Control, Onboarding, or Expired view) */}
      {isBottomNavVisible && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hasUnreadRequests={hasUnreadRequests}
        />
      )}
    </div>
  );
};

const OBJECT_TYPE_LABEL: Record<string, string> = {
  USTA: 'Usta',
  DOKON_OBYEKT: "Do'kon",
  MUASSASA: 'Muassasa',
  TRANSPORT: 'Transport',
  ARENDA: 'Arenda',
  ZAPRAVKA: 'Zapravka',
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
  const [newObjectType, setNewObjectType] = useState<'USTA' | 'DOKON_OBYEKT' | 'MUASSASA' | 'TRANSPORT' | 'ARENDA' | 'ZAPRAVKA'>('USTA');
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
    <div className="flex flex-col gap-3 -mx-4 px-4 pt-1">
      <IosHeader
        title="Kategoriyalar"
        onBack={onBack}
        trailing={
          <button
            onClick={() => { resetForm(); setShowAddForm(true); }}
            className="text-ios-blue text-[15px] font-normal active:opacity-40"
          >
            Qo'shish
          </button>
        }
      />
      <IosSearchBar value={search} onChange={setSearch} placeholder="Kategoriyani qidirish" />

      <div className="flex flex-col gap-4 max-h-[440px] overflow-y-auto -mx-1 px-1">
        {groupOrder.map((groupName) => (
          <IosSection key={groupName} title={`${groupName} · ${groupedCats[groupName].length}`}>
            {groupedCats[groupName].map((c, idx) => (
              <IosRow key={c.id} onClick={() => onSelectCategory(c.id, c.name)} last={idx === groupedCats[groupName].length - 1}>
                <span className="flex items-center gap-2 text-[15px] text-ios-label">
                  {c.name}
                  {c.objectType && (
                    <span className="text-[11px] font-medium text-ios-blue bg-ios-blue/10 px-1.5 py-0.5 rounded-full">
                      {OBJECT_TYPE_LABEL[c.objectType] || c.objectType}
                    </span>
                  )}
                </span>
                <span className="material-symbols-outlined text-[18px] text-ios-label-secondary/50">chevron_right</span>
              </IosRow>
            ))}
          </IosSection>
        ))}
      </div>

      {/* MODAL: YANGI KATEGORIYA QO'SHISH */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center animate-fade-in">
          <div className="bg-ios-bg rounded-t-ios-lg p-5 w-full max-w-container-max space-y-4 max-h-[85vh] overflow-y-auto">
            <h3 className="text-[17px] font-semibold text-ios-label text-center">Yangi kategoriya</h3>

            <div className="space-y-1.5">
              <label className="block text-[13px] text-ios-label-secondary/70 px-1">Nomi *</label>
              <div className="bg-ios-card rounded-ios px-3.5">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="masalan: Payvandchi"
                  className="w-full bg-transparent py-2.5 text-[15px] text-ios-label outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] text-ios-label-secondary/70 px-1">Turi *</label>
              <p className="text-[12px] text-ios-label-secondary/60 px-1">Bu qanday narsa — usta, do'kon, muassasa yoki transport xizmatimi?</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: 'USTA', icon: '🔧' },
                  { id: 'DOKON_OBYEKT', icon: '🏪' },
                  { id: 'MUASSASA', icon: '🏢' },
                  { id: 'TRANSPORT', icon: '🚗' },
                  { id: 'ARENDA', icon: '🔑' },
                  { id: 'ZAPRAVKA', icon: '⛽' },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setNewObjectType(t.id)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-ios text-[13px] font-medium border-2 transition-all ${
                      newObjectType === t.id
                        ? 'bg-ios-blue/10 border-ios-blue text-ios-blue'
                        : 'bg-ios-card border-transparent text-ios-label-secondary/70'
                    }`}
                  >
                    <span>{t.icon}</span>
                    {OBJECT_TYPE_LABEL[t.id]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] text-ios-label-secondary/70 px-1">Guruh (bo'lim)</label>
              <p className="text-[12px] text-ios-label-secondary/60 px-1">Yuqorida tanlangan turga mos guruhlar ko'rsatilmoqda. Mos keladigani bo'lmasa, "+ Yangi" orqali o'zingiz nom bering.</p>
              {!isAddingNewGroup ? (
                <div className="flex gap-2">
                  <select
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value)}
                    className="flex-1 bg-ios-card rounded-ios px-3.5 py-2.5 text-[15px] text-ios-label outline-none"
                  >
                    {groupsForType(newObjectType).map((g) => (
                      <option key={g} value={g}>{g} ({groupCountForType(g, newObjectType)})</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => { setIsAddingNewGroup(true); setCustomGroupInput(''); }}
                    className="bg-ios-card text-ios-blue px-3.5 py-2.5 rounded-ios text-[13px] font-medium whitespace-nowrap"
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
                    className="flex-1 bg-ios-card rounded-ios px-3.5 py-2.5 text-[15px] text-ios-label outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setIsAddingNewGroup(false)}
                    className="bg-ios-card text-ios-label-secondary/70 px-3.5 py-2.5 rounded-ios text-[13px] font-medium"
                  >
                    Ro'yxatdan
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] text-ios-label-secondary/70 px-1">Sinonimlar</label>
              <div className="flex flex-wrap gap-1.5">
                {newSynonyms.map((s) => (
                  <span key={s} className="bg-ios-blue/10 text-ios-blue px-2.5 py-1 rounded-full text-[13px] font-medium flex items-center gap-1">
                    {s}
                    <button type="button" onClick={() => setNewSynonyms(newSynonyms.filter(x => x !== s))} className="active:opacity-50">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="flex-1 bg-ios-card rounded-ios px-3.5">
                  <input
                    type="text"
                    value={newSynonymInput}
                    onChange={(e) => setNewSynonymInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSynonym(); } }}
                    placeholder="masalan: payvandkor"
                    className="w-full bg-transparent py-2.5 text-[15px] text-ios-label outline-none"
                  />
                </div>
                <button type="button" onClick={handleAddSynonym} className="bg-ios-card text-ios-blue px-4 rounded-ios text-[15px] font-medium">+</button>
              </div>
            </div>

            {formError && <p className="text-ios-red text-[13px] font-medium px-1">{formError}</p>}

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={handleCreateCategory}
                disabled={isSaving}
                className="w-full py-3.5 bg-ios-blue text-white rounded-ios text-[16px] font-medium disabled:opacity-40 active:opacity-70"
              >
                {isSaving ? 'Saqlanmoqda…' : "Qo'shish"}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="w-full py-3.5 bg-ios-card text-ios-blue rounded-ios text-[16px] font-medium active:opacity-70"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const IOS_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, sans-serif';

const MoreLandmarksSubView: React.FC<{
  onBack: () => void;
  onSelectLandmark: (id: string, name: string) => void;
}> = ({ onBack, onSelectLandmark }) => {
  const { confirm, showToast } = useFeedback();
  const [lands, setLands] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const loadLandmarks = () => {
    const initData = window.Telegram?.WebApp?.initData || '';
    fetch('/api/admin/landmarks', { headers: { 'x-init-data': initData } })
      .then(r => r.json())
      .then(data => setLands(data || []));
  };
  useEffect(() => { loadLandmarks(); }, []);

  const filtered = lands.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));
  const exactMatchExists = lands.some(l => l.name.toLowerCase() === search.trim().toLowerCase());

  const handleCreate = async () => {
    const name = search.trim();
    if (!name) return;
    setCreating(true);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch('/api/admin/landmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-init-data': initData },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSearch('');
        loadLandmarks();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (l: any) => {
    const ok = await confirm({
      title: `"${l.name}" o'chirilsinmi?`,
      message: 'Bu amalni ortga qaytarib bo\'lmaydi.',
      confirmLabel: "O'chirish",
      destructive: true,
    });
    if (!ok) return;
    setDeletingId(l.id);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch(`/api/admin/landmarks/${l.id}`, {
        method: 'DELETE',
        headers: { 'x-init-data': initData },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setLands(prev => prev.filter(x => x.id !== l.id));
      } else {
        showToast(data.message || "O'chirishda xatolik yuz berdi.", 'error');
      }
    } catch {
      showToast('Aloqa xatosi.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="animate-fade-in -mx-4 -mt-2" style={{ fontFamily: IOS_FONT }}>
      {/* iOS Large Title header */}
      <div className="px-4 pt-1 pb-3">
        <button
          onClick={onBack}
          className="flex items-center gap-0.5 text-[#007AFF] dark:text-[#0A84FF] text-[15px] font-normal mb-1 -ml-1.5 active:opacity-40"
        >
          <span className="material-symbols-outlined text-[22px]">chevron_left</span>
          Orqaga
        </button>
        <div className="flex items-end justify-between">
          <h1 className="text-[28px] font-bold tracking-[-0.02em] text-on-surface dark:text-white leading-tight">
            Manzillar
          </h1>
          <div className="flex items-center gap-3 mb-1.5">
            <span className="text-[13px] text-[#8E8E93] font-normal">{lands.length} ta</span>
            <button
              onClick={() => setIsEditing(v => !v)}
              className="text-[15px] font-medium text-[#007AFF] dark:text-[#0A84FF] active:opacity-40"
            >
              {isEditing ? 'Tayyor' : 'Tahrirlash'}
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {/* iOS UISearchBar */}
        <div className="relative">
          <span
            className={`material-symbols-outlined absolute top-1/2 -translate-y-1/2 text-[17px] text-[#8E8E93] pointer-events-none transition-all ${
              searchFocused || search ? 'left-2.5' : 'left-1/2 -translate-x-1/2'
            }`}
          >
            search
          </span>
          <input
            type="text"
            placeholder="Qidirish"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className={`w-full bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] border-none rounded-[10px] py-[7px] text-[15px] text-on-surface dark:text-white placeholder:text-[#8E8E93] focus:outline-none transition-all ${
              searchFocused || search ? 'pl-8 pr-3 text-left' : 'pl-3 pr-3 text-center'
            }`}
          />
        </div>

        {search.trim() && !exactMatchExists && (
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full flex items-center gap-2.5 text-left px-3.5 py-3 rounded-[10px] bg-[#007AFF]/10 dark:bg-[#0A84FF]/15 text-[#007AFF] dark:text-[#0A84FF] text-[15px] font-medium disabled:opacity-50 active:opacity-60"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            {creating ? 'Qo\'shilmoqda...' : `"${search.trim()}"ni yangi manzil sifatida qo'shish`}
          </button>
        )}

        <p className="text-[13px] text-[#8E8E93] leading-snug -mt-1 px-0.5">
          Yozuv qo'shishda manzil FAQAT shu ro'yxatdan tanlanadi. O'chirish uchun qatorni chapga suring
          yoki "Tahrirlash"ni bosing.
        </p>

        {/* iOS grouped inset list */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] shadow-sm overflow-hidden max-h-[420px] overflow-y-auto">
          {filtered.length === 0 && (
            <div className="p-5 text-center text-[15px] text-[#8E8E93]">Manzil topilmadi</div>
          )}
          {filtered.map((l, idx) => (
            <div
              key={l.id}
              className="flex items-center bg-white dark:bg-[#1C1C1E]"
              style={{ borderTop: idx === 0 ? 'none' : '0.5px solid rgba(60,60,67,0.29)' }}
            >
              {isEditing && (
                <button
                  onClick={() => handleDelete(l)}
                  disabled={deletingId === l.id}
                  className="shrink-0 w-6 h-6 rounded-full bg-[#FF3B30] text-white flex items-center justify-center ml-3.5 active:opacity-70 disabled:opacity-50"
                  aria-label="O'chirish"
                >
                  <span className="material-symbols-outlined text-[16px] font-bold">remove</span>
                </button>
              )}
              <div className="flex-1 min-w-0">
                <SwipeToDeleteRow onDelete={() => handleDelete(l)} disabled={isEditing || deletingId === l.id}>
                  <button
                    onClick={() => !isEditing && onSelectLandmark(l.id, l.name)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 bg-white dark:bg-[#1C1C1E] active:bg-[#F2F2F7] dark:active:bg-[#2C2C2E] text-left"
                  >
                    <span
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-[14px] font-semibold"
                      style={{ backgroundColor: avatarColorForName(l.name) }}
                    >
                      {l.name.trim()[0]?.toUpperCase() || '?'}
                    </span>
                    <span className="flex-1 min-w-0 text-[15px] font-normal text-on-surface dark:text-white truncate">
                      {l.name}
                    </span>
                    <span className="flex items-center gap-1 text-[#8E8E93] shrink-0">
                      {typeof l.listingCount === 'number' && (
                        <span className="text-[13px]">{l.listingCount}</span>
                      )}
                      {!isEditing && <span className="material-symbols-outlined text-[18px]">chevron_right</span>}
                    </span>
                  </button>
                </SwipeToDeleteRow>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MoreGroupsSubView: React.FC<{
  onBack: () => void;
  onSelectGroup: (id: string, title: string) => void;
}> = ({ onBack, onSelectGroup }) => {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    fetch('/api/admin/groups')
      .then(r => r.json())
      .then(data => setGroups(data || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = groups.filter(g => (g.title || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-fade-in -mx-4 -mt-2" style={{ fontFamily: IOS_FONT }}>
      <div className="px-4 pt-1 pb-3">
        <button
          onClick={onBack}
          className="flex items-center gap-0.5 text-[#007AFF] dark:text-[#0A84FF] text-[15px] font-normal mb-1 -ml-1.5 active:opacity-40"
        >
          <span className="material-symbols-outlined text-[22px]">chevron_left</span>
          Orqaga
        </button>
        <div className="flex items-end justify-between">
          <h1 className="text-[28px] font-bold tracking-[-0.02em] text-on-surface dark:text-white leading-tight">
            Guruhlar
          </h1>
          <span className="text-[13px] text-[#8E8E93] font-normal mb-1">{groups.length} ta</span>
        </div>
      </div>

      <div className="px-4 space-y-3">
        <div className="relative">
          <span
            className={`material-symbols-outlined absolute top-1/2 -translate-y-1/2 text-[17px] text-[#8E8E93] pointer-events-none transition-all ${
              searchFocused || search ? 'left-2.5' : 'left-1/2 -translate-x-1/2'
            }`}
          >
            search
          </span>
          <input
            type="text"
            placeholder="Qidirish"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className={`w-full bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] border-none rounded-[10px] py-[7px] text-[15px] text-on-surface dark:text-white placeholder:text-[#8E8E93] focus:outline-none transition-all ${
              searchFocused || search ? 'pl-8 pr-3 text-left' : 'pl-3 pr-3 text-center'
            }`}
          />
        </div>

        <p className="text-[13px] text-[#8E8E93] leading-snug -mt-1 px-0.5">
          Botni yangi guruh yoki kanalga qo'shish uchun — Telegram'da botni qidirib
          (@ nomi bilan), o'sha guruhga a'zo sifatida qo'shing va <b>admin</b> qiling
          (xabarlarni o'qishi va o'chirishi uchun shart). Qo'shimcha sozlash shart emas.
        </p>

        {loading ? (
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] shadow-sm p-4 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-4 bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] shadow-sm overflow-hidden">
            {filtered.length === 0 && (
              <div className="p-5 text-center text-[15px] text-[#8E8E93]">
                {groups.length === 0 ? 'Hali hech qanday guruhga qo\'shilmagan' : 'Guruh topilmadi'}
              </div>
            )}
            {filtered.map((g, idx) => (
              <button
                key={g.id}
                onClick={() => onSelectGroup(g.id, g.title)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 bg-white dark:bg-[#1C1C1E] active:bg-[#F2F2F7] dark:active:bg-[#2C2C2E] text-left"
                style={{ borderTop: idx === 0 ? 'none' : '0.5px solid rgba(60,60,67,0.29)' }}
              >
                <span
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-[14px] font-semibold"
                  style={{ backgroundColor: avatarColorForName(g.title || '?') }}
                >
                  {(g.title || '?').trim()[0]?.toUpperCase() || '?'}
                </span>
                <span className="flex-1 min-w-0 flex items-center gap-1.5">
                  <span className="text-[15px] font-normal text-on-surface dark:text-white truncate">
                    {g.title}
                  </span>
                  {g.hasIssue && (
                    <span className="material-symbols-outlined text-[16px] text-[#FF9500] shrink-0" title="Bot huquqi yetishmayapti">
                      warning
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1 text-[#8E8E93] shrink-0">
                  {typeof g.memberCount === 'number' && (
                    <span className="text-[13px]">{g.memberCount} a'zo</span>
                  )}
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const DEFAULT_COMMUNITY_LABEL = "📣 Kanal/Guruhga o'tish";

const CommunityLinkSubView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/settings/community_url').then(r => r.json()),
      fetch('/api/admin/settings/community_label').then(r => r.json()),
    ])
      .then(([urlData, labelData]) => {
        setUrl(urlData?.value || '');
        setLabel(labelData?.value || '');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const headers = { 'Content-Type': 'application/json', 'x-init-data': initData };
      const [urlRes, labelRes] = await Promise.all([
        fetch('/api/admin/settings/community_url', {
          method: 'PUT', headers, body: JSON.stringify({ value: url.trim() }),
        }),
        fetch('/api/admin/settings/community_label', {
          method: 'PUT', headers, body: JSON.stringify({ value: label.trim() }),
        }),
      ]);
      if (urlRes.ok && labelRes.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      // jim — foydalanuvchi "Saqlash"ni qayta bosib ko'radi
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 -mx-4 px-4 pt-1">
      <IosHeader title="Kanal/Bot havolasi" onBack={onBack} />
      <p className="text-[13px] text-ios-label-secondary/70 leading-relaxed">
        Bot har bir javobida ko'rsatadigan qizil tugma qayerga olib borishini
        va nima deb yozilishini shu yerdan sozlaysiz — Telegram kanal, guruh
        yoki boshqa bot havolasi bo'lishi mumkin. Havola bo'sh qoldirilsa,
        tugma umuman ko'rsatilmaydi.
      </p>

      <IosSection>
        <div className="px-4 py-3 space-y-1.5" style={{ borderBottom: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}>
          <label className="text-[13px] text-ios-label-secondary/70">Havola (URL)</label>
          {loading ? (
            <div className="h-9 bg-ios-fill/[0.12] rounded-ios animate-pulse" />
          ) : (
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://t.me/olmaliq_kanal"
              className="w-full bg-transparent text-[15px] text-ios-label placeholder:text-ios-label-secondary/50 outline-none"
            />
          )}
        </div>

        <div className="px-4 py-3 space-y-1.5" style={{ borderBottom: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}>
          <label className="text-[13px] text-ios-label-secondary/70">Tugma nomi (matni)</label>
          {loading ? (
            <div className="h-9 bg-ios-fill/[0.12] rounded-ios animate-pulse" />
          ) : (
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={DEFAULT_COMMUNITY_LABEL}
              className="w-full bg-transparent text-[15px] text-ios-label placeholder:text-ios-label-secondary/50 outline-none"
            />
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={loading || saving}
          className="w-full py-3.5 text-ios-blue font-medium text-[16px] disabled:opacity-40 active:opacity-60"
        >
          {saving ? 'Saqlanmoqda…' : saved ? 'Saqlandi ✓' : 'Saqlash'}
        </button>
      </IosSection>
      <p className="text-[13px] text-ios-label-secondary/70 px-1">
        Bo'sh qoldirilsa, standart nom ishlatiladi: "{DEFAULT_COMMUNITY_LABEL}"
      </p>
    </div>
  );
};

export default function App(props: AppProps) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <FeedbackProvider>
            <AuthProvider>
              <MainShell {...props} />
            </AuthProvider>
          </FeedbackProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
