import React, { useState } from 'react';

export interface PublicDirectoryScreenProps {
  cityName?: string;
}

export const PublicDirectoryScreen: React.FC<PublicDirectoryScreenProps> = ({
  cityName = 'Olmaliq',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    { id: 'c1', name: 'Gazavik', icon: '🔥', count: 12 },
    { id: 'c2', name: 'Santexnik', icon: '🚰', count: 18 },
    { id: 'c3', name: 'Elektrik', icon: '⚡', count: 15 },
    { id: 'c4', name: 'Kafelchi', icon: '🧱', count: 8 },
    { id: 'c5', name: 'Mebelchi', icon: '🪑', count: 10 },
    { id: 'c6', name: 'Malyar', icon: '🎨', count: 6 },
  ];

  const sampleListings = [
    {
      id: 'l1',
      name: 'Suhrob Gazavik',
      category: 'Gazavik',
      phone: '+998 90 123 45 67',
      landmark: 'Karzinka oldida',
      rating: 4.9,
      badge: '✅ Tasdiqlangan usta',
      workHours: '08:00 - 20:00',
    },
    {
      id: 'l2',
      name: 'Jasur Santexnik',
      category: 'Santexnik',
      phone: '+998 91 987 65 43',
      landmark: '3-mavze, Bozor yonida',
      rating: 4.8,
      badge: '🏷 Uyga boradi',
      workHours: '09:00 - 21:00',
    },
    {
      id: 'l3',
      name: 'Alisher Elektrik',
      category: 'Elektrik',
      phone: '+998 93 555 44 33',
      landmark: 'Markaziy shifoxona oldi',
      rating: 4.7,
      badge: "⭐ A'lo xizmat",
      workHours: '24/7',
    },
  ];

  const filteredListings = sampleListings.filter((item) => {
    const matchesQuery =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.landmark.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans max-w-container-max mx-auto shadow-2xl flex flex-col">
      {/* Top Header */}
      <header className="bg-slate-800/90 border-b border-slate-700/80 sticky top-0 z-30 backdrop-blur-md px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2AABEE] to-[#229ED9] text-white flex items-center justify-center font-bold text-base shadow-sm">
            K
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-100 flex items-center gap-1.5">
              Kim bor? <span className="text-xs bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full font-medium">{cityName}</span>
            </h1>
            <p className="text-[11px] text-slate-400">Shahar ishonchli ustalar katalogi</p>
          </div>
        </div>
      </header>

      {/* Main Search Bar */}
      <div className="p-4 space-y-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Qaysi usta kerak? (masalan: santexnik, karzinka)..."
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3.5 pl-11 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 transition-colors shadow-inner"
          />
          <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-slate-400 text-xl">
            search
          </span>
        </div>

        {/* Category Chips */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ommabop kasblar</h2>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-xs text-brand-400 hover:underline"
              >
                Hammasi
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(isSelected ? null : cat.name)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-brand-600 border-brand-500 text-white shadow-md'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                  <span className="text-[10px] opacity-60">({cat.count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Listings List */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {selectedCategory ? `${selectedCategory} ustalar (${filteredListings.length})` : `Barcha ustalar (${filteredListings.length})`}
          </h2>

          {filteredListings.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-8 text-center space-y-2">
              <div className="text-3xl">🔍</div>
              <p className="text-sm text-slate-300 font-medium">Bunday usta topilmadi</p>
              <p className="text-xs text-slate-400">Telegram botimizda savolingizni yozib qoldirishingiz mumkin.</p>
            </div>
          ) : (
            filteredListings.map((item) => (
              <div
                key={item.id}
                className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3 shadow-lg hover:border-slate-600 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-100 text-base">{item.name}</h3>
                      <span className="text-xs font-semibold text-amber-400 flex items-center gap-0.5 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20">
                        ⭐ {item.rating}
                      </span>
                    </div>
                    <p className="text-xs text-brand-400 font-medium mt-0.5">{item.category}</p>
                  </div>
                  <span className="text-[11px] bg-slate-700/60 text-slate-300 px-2.5 py-1 rounded-full border border-slate-600/50">
                    {item.badge}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-400">
                  <p className="flex items-center gap-1.5">
                    <span>📍</span> <span>{item.landmark}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span>🕐</span> <span>Ish vaqti: {item.workHours}</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-700/60 flex gap-2">
                  <a
                    href={`tel:${item.phone.replace(/\s+/g, '')}`}
                    className="flex-1 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white font-semibold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
                  >
                    <span>📞</span> <span>Qo'ng'iroq qilish</span>
                  </a>
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(item.phone)}`}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1 transition-all border border-slate-600"
                  >
                    <span>💬</span> <span>SMS / Telegram</span>
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
