import React, { useEffect, useState } from 'react';
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
import { FormField } from './components/FormField';

const API_BASE = 'http://localhost:4000/api';

const MainShell: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Live Data States
  const [listings, setListings] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ activeListings: 0, unresolvedRequests: 0, pendingCandidates: 0 });
  const [clusters, setClusters] = useState<any[]>([]);

  // New Listing Form State
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLandmark, setNewLandmark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Fetch API data on load or tab change
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [listingsRes, statsRes, clustersRes] = await Promise.all([
        fetch(`${API_BASE}/admin/listings`),
        fetch(`${API_BASE}/admin/stats`),
        fetch(`${API_BASE}/admin/requests/clusters`),
      ]);

      if (listingsRes.ok) setListings(await listingsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (clustersRes.ok) setClusters(await clustersRes.json());
    } catch (err) {
      console.error('API Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      const res = await fetch(`${API_BASE}/admin/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          categoryName: newCategory,
          phone: newPhone,
          landmarkName: newLandmark,
          verified: true,
          badges: ['uyga_boradi', 'kafolat'],
        }),
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setNewName('');
        setNewCategory('');
        setNewPhone('');
        setNewLandmark('');
        fetchData();
      }
    } catch (err) {
      console.error('Create listing error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    { id: 'all', label: 'Barchasi', count: listings.length },
    { id: 'gazavik', label: 'Gazavik', count: listings.filter((l) => l.category?.name?.toLowerCase() === 'gazavik').length },
    { id: 'santexnik', label: 'Santexnik', count: listings.filter((l) => l.category?.name?.toLowerCase() === 'santexnik').length },
    { id: 'elektrik', label: 'Elektrik', count: listings.filter((l) => l.category?.name?.toLowerCase() === 'elektrik').length },
    { id: 'kafelchi', label: 'Kafelchi', count: listings.filter((l) => l.category?.name?.toLowerCase() === 'kafelchi').length },
  ];

  const filteredListings = activeCategoryFilter === 'all'
    ? listings
    : listings.filter((l) => l.category?.name?.toLowerCase() === activeCategoryFilter);

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

      {/* Online Status Banner */}
      <ErrorBanner
        type="warning"
        message={`Shahar: ${user?.cityName || 'Olmaliq'} · Baza faol (Fastify API)`}
      />

      {/* Content Area Based on Active Tab */}
      <main className="flex-1 p-4 space-y-4">
        {activeTab === 'home' && (
          <div className="space-y-4 animate-fade-in">
            {/* Summary Metrics */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-surface dark:bg-[#17212B] p-3 rounded-xl border border-outline-variant/30 dark:border-slate-800 text-center">
                <span className="text-xl font-bold text-primary dark:text-sky-400">{stats.activeListings}</span>
                <p className="text-[10px] text-on-surface-variant dark:text-slate-400 font-medium">Faol Ustalar</p>
              </div>
              <div className="bg-surface dark:bg-[#17212B] p-3 rounded-xl border border-outline-variant/30 dark:border-slate-800 text-center">
                <span className="text-xl font-bold text-amber-500">{stats.unresolvedRequests}</span>
                <p className="text-[10px] text-on-surface-variant dark:text-slate-400 font-medium">Topilmagan</p>
              </div>
              <div className="bg-surface dark:bg-[#17212B] p-3 rounded-xl border border-outline-variant/30 dark:border-slate-800 text-center">
                <span className="text-xl font-bold text-emerald-500">{stats.pendingCandidates || 0}</span>
                <p className="text-[10px] text-on-surface-variant dark:text-slate-400 font-medium">Nomzodlar</p>
              </div>
            </div>

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
            </div>

            {/* Record Rows (Yozuv qatorlari) */}
            <div className="bg-surface dark:bg-[#17212B] rounded-xl border border-outline-variant/30 dark:border-slate-800 p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-outline dark:text-slate-400">
                  Ustalar Ro'yxati ({filteredListings.length})
                </h3>
              </div>

              {isLoading ? (
                <LoadingSkeleton />
              ) : filteredListings.length === 0 ? (
                <EmptyState
                  title="Hozircha ustalar yo'q"
                  subtitle="Tanlangan kategoriya bo'yicha bazada ma'lumot topilmadi"
                  actionText="Usta Qo'shish"
                  onAction={() => setActiveTab('add')}
                />
              ) : (
                filteredListings.map((item) => (
                  <RecordRow
                    key={item.id}
                    name={item.name}
                    category={item.category?.name || 'Xizmat'}
                    landmark={item.primaryLandmark?.name}
                    phone={item.phone}
                    rating={item.bayesianRating || 4.5}
                    isVerified={item.verification === 'VERIFIED'}
                    onEdit={() => alert(`${item.name} tahrirlash`)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'add' && (
          <div className="animate-fade-in space-y-4">
            <h2 className="font-bold text-lg text-on-surface dark:text-slate-100">Yangi Usta / Xizmat Qo'shish</h2>
            
            {submitSuccess && (
              <div className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 p-3.5 rounded-xl border border-emerald-500/30 text-xs font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Yangi usta bazaga muvaffaqiyatli saqlandi! Avtomatik bildirishnoma yuborildi.
              </div>
            )}

            <form onSubmit={handleCreateListing} className="bg-surface dark:bg-[#17212B] p-4 rounded-xl border border-outline-variant/30 dark:border-slate-800 space-y-3">
              <FormField
                label="Usta yoki Xizmat Nomi"
                placeholder="Bahrom Gazavik"
                iconName="person"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />

              <FormField
                label="Kasbi / Kategoriyasi"
                placeholder="Gazavik"
                iconName="category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                required
              />

              <FormField
                label="Telefon Raqami"
                placeholder="+998 90 123 45 67"
                iconName="call"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                required
              />

              <FormField
                label="Asosiy Mo'ljal"
                placeholder="Korzinka"
                iconName="location_on"
                value={newLandmark}
                onChange={(e) => setNewLandmark(e.target.value)}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary dark:bg-sky-500 text-on-primary font-semibold text-xs py-3.5 rounded-full hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                {isSubmitting ? 'Saqlanmoqda...' : 'Bazaga Saqlash'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="animate-fade-in space-y-4">
            <h2 className="font-bold text-lg text-on-surface dark:text-slate-100">Topilmagan So'rovlar ({clusters.length})</h2>
            
            {clusters.length === 0 ? (
              <EmptyState
                title="Barcha so me rovlar hal qilingan"
                subtitle="Hozircha topilmagan so me rovlar mavjud emas"
              />
            ) : (
              clusters.map((c, i) => (
                <WorkRowCard
                  key={i}
                  title={c.canonicalName}
                  subtitle={`${c.count} ta takroriy so'rov kirdi`}
                  statusBadge={c.isExistingCategory ? "Bog'lash" : "+ Qo'shish"}
                  edgeColor={c.isExistingCategory ? 'amber' : 'red'}
                  onClick={() => {
                    setNewCategory(c.canonicalName);
                    setActiveTab('add');
                  }}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'database' && (
          <div className="animate-fade-in space-y-4">
            <h2 className="font-bold text-lg text-on-surface dark:text-slate-100">Ma'lumotlar Bazasi ({listings.length})</h2>
            
            {listings.map((item) => (
              <RecordRow
                key={item.id}
                name={item.name}
                category={item.category?.name || 'Xizmat'}
                landmark={item.primaryLandmark?.name}
                phone={item.phone}
                rating={item.bayesianRating || 4.5}
                isVerified={item.verification === 'VERIFIED'}
              />
            ))}
          </div>
        )}

        {activeTab === 'more' && (
          <div className="animate-fade-in space-y-4">
            <h2 className="font-bold text-lg text-on-surface dark:text-slate-100">Sozlamalar va Tizim</h2>
            <div className="bg-surface dark:bg-[#17212B] rounded-xl border border-outline-variant/30 dark:border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-outline-variant/20 dark:border-slate-800">
                <span className="text-sm font-medium">Shahar</span>
                <span className="text-xs font-semibold text-primary dark:text-sky-400">{user?.cityName || 'Olmaliq'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-outline-variant/20 dark:border-slate-800">
                <span className="text-sm font-medium">Fastify API Status</span>
                <span className="text-xs font-semibold text-emerald-500">200 OK</span>
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
              Assalomu alaykum! Men Kim bor boti sun'iy intellekt yordamchisiman. Bazaga usta qo'shish yoki so'rovlarni tahlil qilishda yordam bera olaman.
            </p>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasUnreadRequests={clusters.length > 0}
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
