import React, { useState } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BottomNav, NavTab } from './components/BottomNav';
import { WorkRowCard } from './components/WorkRowCard';
import { RecordRow } from './components/RecordRow';
import { FilterChips } from './components/FilterChips';
import { EmptyState } from './components/EmptyState';
import { ErrorBanner } from './components/ErrorBanner';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { AuthModal } from './components/AuthModal';

const MainShell: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const showErrorBanner = true;

  const categories = [
    { id: 'all', label: 'Barchasi', count: 42 },
    { id: 'gazavik', label: 'Gazavik', count: 12 },
    { id: 'santexnik', label: 'Santexnik', count: 8 },
    { id: 'elektrik', label: 'Elektrik', count: 14 },
    { id: 'kafelchi', label: 'Kafelchi', count: 8 },
  ];

  return (
    <div className="min-h-screen bg-background dark:bg-[#121417] text-on-surface dark:text-slate-100 flex flex-col max-w-container-max mx-auto shadow-2xl relative pb-20">
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

      {/* Warning/Error Banners */}
      {showErrorBanner && (
        <ErrorBanner
          type="warning"
          message="Internet uzildi — o'zgarishlar keshlanmoqda"
        />
      )}

      {/* Content Area Based on Active Tab */}
      <main className="flex-1 p-4 space-y-4">
        {activeTab === 'home' && (
          <div className="space-y-4 animate-fade-in">
            {/* Category Filter Chips */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-outline dark:text-slate-400 mb-2">
                Kategoriyalar
              </h3>
              <FilterChips
                options={categories}
                activeId={activeCategoryFilter}
                onSelect={setActiveCategoryFilter}
              />
            </div>

            {/* Task Row Cards (Ish qatorlari) */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-outline dark:text-slate-400 mb-2.5">
                Kutilayotgan Amallar
              </h3>
              <WorkRowCard
                title="Nomzod tasdiqlanishi kutilmoqda"
                subtitle="Suhrob Gazavik — Telegram guruhdan topilgan nomzod"
                statusBadge="Yangi"
                edgeColor="amber"
              />
              <WorkRowCard
                title="Topilmagan so'rov kiritildi"
                subtitle="'Kafelchi Karzinka oldida' — 3 ta takroriy so'rov"
                statusBadge="Zudlik"
                edgeColor="red"
              />
              <WorkRowCard
                title="Yangi usta qo'shildi"
                subtitle="Bahrom Gazavik — Korzinka oldida"
                statusBadge="Tasdiq"
                edgeColor="green"
              />
            </div>

            {/* Record Rows (Yozuv qatorlari) */}
            <div className="bg-surface dark:bg-[#17212B] rounded-xl border border-outline-variant/30 dark:border-slate-800 p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-outline dark:text-slate-400">
                  Oxirgi Ustalar
                </h3>
                <span className="text-xs text-primary dark:text-sky-400 font-semibold cursor-pointer">
                  Barchasi (42)
                </span>
              </div>
              <RecordRow
                name="Bahrom Gazavik"
                category="Gazavik"
                landmark="Korzinka"
                rating={4.8}
                isVerified={true}
                onEdit={() => alert('Bahrom Gazavik tahrirlash')}
              />
              <RecordRow
                name="Sobir Gazavik"
                category="Gazavik"
                landmark="Markaziy Bozor"
                rating={3.5}
                isVerified={false}
                onEdit={() => alert('Sobir Gazavik tahrirlash')}
              />
              <RecordRow
                name="Jamshid Santexnik"
                category="Santexnik"
                landmark="3-mavze"
                rating={4.9}
                isVerified={true}
                onEdit={() => alert('Jamshid Santexnik tahrirlash')}
              />
            </div>
          </div>
        )}

        {activeTab === 'add' && (
          <div className="animate-fade-in space-y-4">
            <h2 className="font-bold text-lg text-on-surface dark:text-slate-100">Yangi Yozuv Qo'shish</h2>
            <EmptyState
              title="Yangi Usta Qo'shish Formasi"
              subtitle="Tizimga yangi xizmat ko'rsatuvchi yoki tashkilot ma'lumotlarini kiritish"
              iconName="person_add"
              actionText="Formani Ocharish"
              onAction={() => alert("Forma ochilmoqda...")}
            />
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="animate-fade-in space-y-4">
            <h2 className="font-bold text-lg text-on-surface dark:text-slate-100">Topilmagan So'rovlar</h2>
            <WorkRowCard
              title="Kafelchi / Plitkachi"
              subtitle="3 ta foydalanuvchi so'radi · Karzinka va 3-mavze"
              statusBadge="+ Qo'shish"
              edgeColor="red"
            />
            <WorkRowCard
              title="Mebel yig'uvchi"
              subtitle="2 ta foydalanuvchi so'radi · Markaziy bozor"
              statusBadge="Bog'lash"
              edgeColor="amber"
            />
          </div>
        )}

        {activeTab === 'database' && (
          <div className="animate-fade-in space-y-4">
            <h2 className="font-bold text-lg text-on-surface dark:text-slate-100">Ma'lumotlar Bazasi</h2>
            <LoadingSkeleton />
          </div>
        )}

        {activeTab === 'more' && (
          <div className="animate-fade-in space-y-4">
            <h2 className="font-bold text-lg text-on-surface dark:text-slate-100 font-bold">Sozlamalar va Yana</h2>
            <div className="bg-surface dark:bg-[#17212B] rounded-xl border border-outline-variant/30 dark:border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-outline-variant/20 dark:border-slate-800">
                <span className="text-sm font-medium">Shahar</span>
                <span className="text-xs font-semibold text-primary dark:text-sky-400">Olmaliq</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-outline-variant/20 dark:border-slate-800">
                <span className="text-sm font-medium">Til</span>
                <span className="text-xs font-semibold text-on-surface-variant dark:text-slate-400">O'zbek (Lotin)</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-outline-variant/20 dark:border-slate-800">
                <span className="text-sm font-medium">Tungi rejim</span>
                <button onClick={toggleTheme} className="text-xs font-semibold text-primary dark:text-sky-400">
                  {theme === 'dark' ? "Yoqilgan (Dark)" : "O'chirilgan (Light)"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating AI Assistant Drawer / Trigger */}
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
              Assalomu alaykum! Men Kim bor boti sun'iy intellekt yordamchisiman. Sizga qanday yordam bera olaman?
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
