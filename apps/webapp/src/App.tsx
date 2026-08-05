import React, { useState } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BottomNav, NavTab } from './components/BottomNav';
import { AuthModal } from './components/AuthModal';
import { DashboardScreen } from './screens/DashboardScreen';
import { AddListingScreen } from './screens/AddListingScreen';
import { RequestsScreen } from './screens/RequestsScreen';
import { DatabaseScreen } from './screens/DatabaseScreen';
import { SuperAdminControlScreen } from './screens/SuperAdminControlScreen';
import { OnboardingWizardScreen } from './screens/OnboardingWizardScreen';
import { SubscriptionLockScreen } from './screens/SubscriptionLockScreen';

const MainShell: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  
  // Navigation & Control States
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [viewMode, setViewMode] = useState<'normal' | 'superadmin' | 'onboarding' | 'expired'>('normal');
  const [selectedCityName, setSelectedCityName] = useState(user?.cityName || 'Olmaliq');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [prefilledCategory, setPrefilledCategory] = useState<string | undefined>();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || true; // Allow testing Super-Admin mode

  // Hide Bottom Navigation in Super-Admin Control, Onboarding, or Expired mode
  const isBottomNavVisible = viewMode === 'normal';

  return (
    <div className="min-h-screen bg-background dark:bg-[#121417] text-on-surface dark:text-slate-100 flex flex-col max-w-container-max mx-auto shadow-2xl relative pb-20 font-sans">
      {/* Top Header Bar */}
      {viewMode === 'normal' && (
        <header className="sticky top-0 z-30 bg-surface/95 dark:bg-[#17212B]/95 backdrop-blur-md border-b border-outline-variant/30 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2AABEE] to-[#229ED9] text-white flex items-center justify-center font-bold text-base shadow-sm">
              K
            </div>

            {/* SUPER-ADMIN CITY SWITCHER DROPDOWN */}
            <div className="relative">
              <button
                onClick={() => {
                  if (isSuperAdmin) setShowCityDropdown(!showCityDropdown);
                }}
                className="flex items-center gap-1.5 hover:bg-surface-container-low dark:hover:bg-slate-800 px-2 py-1 rounded-lg transition-colors text-left"
              >
                <div>
                  <div className="flex items-center gap-1">
                    <h1 className="font-bold text-base text-on-surface dark:text-slate-100">{selectedCityName}</h1>
                    {isSuperAdmin && (
                      <span className="material-symbols-outlined text-[18px] text-on-surface-variant dark:text-slate-400">
                        expand_more
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-on-surface-variant dark:text-slate-400">
                    {user?.name || 'Bobur (Admin)'}
                  </p>
                </div>
              </button>

              {/* DROPDOWN LIST */}
              {showCityDropdown && isSuperAdmin && (
                <div className="absolute top-12 left-0 bg-surface dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-xl shadow-xl z-50 w-52 py-1 animate-fadeIn">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-outline uppercase tracking-wider">
                    Shaharlar
                  </div>
                  {['Olmaliq', 'Chirchiq', 'Angren'].map((cityName) => (
                    <button
                      key={cityName}
                      onClick={() => {
                        setSelectedCityName(cityName);
                        setShowCityDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-surface-container-low dark:hover:bg-slate-800 transition-colors flex items-center justify-between"
                    >
                      {cityName}
                      {selectedCityName === cityName && (
                        <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                      )}
                    </button>
                  ))}

                  <div className="border-t border-outline-variant/30 dark:border-slate-800 my-1" />

                  {/* 👑 BOSHQARUV (SUPER-ADMIN CONTROL PANEL) */}
                  <button
                    onClick={() => {
                      setShowCityDropdown(false);
                      setViewMode('superadmin');
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors flex items-center gap-2"
                  >
                    <span>👑</span> Boshqaruv
                  </button>

                  {/* ＋ YANGI SHAHAR */}
                  <button
                    onClick={() => {
                      setShowCityDropdown(false);
                      setViewMode('onboarding');
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-primary dark:text-sky-400 hover:bg-primary-container/10 transition-colors flex items-center gap-2"
                  >
                    <span>＋</span> Yangi shahar
                  </button>
                </div>
              )}
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
        {viewMode === 'superadmin' && (
          <SuperAdminControlScreen onBackToDashboard={() => setViewMode('normal')} />
        )}

        {viewMode === 'onboarding' && (
          <OnboardingWizardScreen onCompleteOnboarding={() => setViewMode('normal')} />
        )}

        {viewMode === 'expired' && (
          <SubscriptionLockScreen
            cityName={selectedCityName}
            onRenewPayment={() => setViewMode('normal')}
          />
        )}

        {viewMode === 'normal' && (
          <>
            {activeTab === 'home' && (
              <DashboardScreen
                onNavigateTab={setActiveTab}
                onSelectCategoryToAdd={(cat) => setPrefilledCategory(cat)}
              />
            )}

            {activeTab === 'add' && (
              <AddListingScreen
                initialCategory={prefilledCategory}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'requests' && (
              <RequestsScreen
                onNavigateTab={setActiveTab}
                onSelectCategoryToAdd={(cat) => setPrefilledCategory(cat)}
              />
            )}

            {activeTab === 'database' && (
              <DatabaseScreen onNavigateTab={setActiveTab} />
            )}

            {activeTab === 'more' && (
              <div className="p-4 bg-surface dark:bg-[#17212B] rounded-xl border border-outline-variant/30 dark:border-slate-800 space-y-3">
                <h2 className="font-bold text-base">Sozlamalar va Test Hollar</h2>
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => setViewMode('onboarding')}
                    className="w-full py-2.5 bg-primary/10 text-primary font-bold text-xs rounded-xl"
                  >
                    🚀 3-Qadam Onboardingni Sinash
                  </button>
                  <button
                    onClick={() => setViewMode('expired')}
                    className="w-full py-2.5 bg-red-500/10 text-red-500 font-bold text-xs rounded-xl"
                  >
                    🔒 Obuna Tugash Ekranini Sinash
                  </button>
                </div>
              </div>
            )}
          </>
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

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainShell />
      </AuthProvider>
    </ThemeProvider>
  );
}
