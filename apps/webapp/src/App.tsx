import React, { useState } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BottomNav, NavTab } from './components/BottomNav';
import { AuthModal } from './components/AuthModal';
import { DashboardScreen } from './screens/DashboardScreen';
import { AddListingScreen } from './screens/AddListingScreen';
import { RequestsScreen } from './screens/RequestsScreen';
import { DatabaseScreen } from './screens/DatabaseScreen';

const MainShell: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [prefilledCategory, setPrefilledCategory] = useState<string | undefined>();

  return (
    <div className="min-h-screen bg-background dark:bg-[#121417] text-on-surface dark:text-slate-100 flex flex-col max-w-container-max mx-auto shadow-2xl relative pb-20 font-sans">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-surface/95 dark:bg-[#17212B]/95 backdrop-blur-md border-b border-outline-variant/30 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2AABEE] to-[#229ED9] text-white flex items-center justify-center font-bold text-base shadow-sm">
            K
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-base text-on-surface dark:text-slate-100">Kim bor?</h1>
              <span className="text-[10px] font-semibold bg-primary-container/20 text-primary dark:text-sky-400 px-2 py-0.5 rounded-full border border-primary/20">
                {user?.cityName || 'Olmaliq'}
              </span>
            </div>
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

      {/* Main Content Area */}
      <main className="flex-1 p-4 space-y-4">
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
          <div className="p-4 bg-surface dark:bg-[#17212B] rounded-xl border border-outline-variant/30 dark:border-slate-800">
            <h2 className="font-bold text-base">Sozlamalar va Tizim</h2>
          </div>
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

      {/* Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasUnreadRequests={true}
        onAiClick={() => setShowAiModal(true)}
      />

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
