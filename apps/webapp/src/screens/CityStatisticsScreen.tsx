import React, { useState } from 'react';

export interface CityStatisticsScreenProps {
  cityName?: string;
  onNavigateToAddListingWithCategory?: (category: string) => void;
  onBack: () => void;
}

export const CityStatisticsScreen: React.FC<CityStatisticsScreenProps> = ({
  cityName = 'Olmaliq',
  onNavigateToAddListingWithCategory,
  onBack,
}) => {
  const [period, setPeriod] = useState<'7d' | '30d' | 'year' | 'all'>('7d');
  const [hasData, setHasData] = useState(true);

  // Mock analytics metrics (reflecting real city activity)
  const answerRate = 94; // %
  const totalQueries = 342;
  const weeklyData = [
    { day: 'Dush', count: 42 },
    { day: 'Sesh', count: 58 },
    { day: 'Chor', count: 65 },
    { day: 'Pay', count: 50 },
    { day: 'Jum', count: 72 },
    { day: 'Shan', count: 35 },
    { day: 'Yak', count: 20 },
  ];

  const pulseData = [12, 5, 2, 0, 1, 4, 18, 32, 45, 52, 60, 48, 55, 62, 70, 58, 64, 80, 75, 60, 42, 30, 22, 15];

  const coverageCategories = [
    { name: 'Gazavik', count: 5, color: 'bg-emerald-500' },
    { name: 'Santexnik', count: 7, color: 'bg-emerald-500' },
    { name: 'Elektrik', count: 4, color: 'bg-emerald-500' },
    { name: 'Kafelchi', count: 1, color: 'bg-amber-500' },
    { name: 'Svarshik', count: 2, color: 'bg-emerald-500' },
    { name: 'Malyar', count: 0, color: 'bg-red-500' },
    { name: 'Eshik-deraza', count: 3, color: 'bg-emerald-500' },
    { name: 'Avtoelektrik', count: 0, color: 'bg-red-500' },
    { name: 'Konditsioner', count: 2, color: 'bg-emerald-500' },
    { name: 'Dorixona', count: 8, color: 'bg-emerald-500' },
  ];

  const topQueries = [
    { category: 'Gazavik', count: 86, hasListing: true },
    { category: 'Santexnik', count: 74, hasListing: true },
    { category: 'Elektrik', count: 62, hasListing: true },
    { category: 'Avtoelektrik', count: 48, hasListing: false }, // Missing in DB!
    { category: 'Malyar', count: 39, hasListing: false },      // Missing in DB!
  ];

  const maxWeeklyCount = Math.max(...weeklyData.map(d => d.count));
  const maxQueryCount = Math.max(...topQueries.map(q => q.count));

  return (
    <div className="min-h-screen bg-background dark:bg-[#121417] text-on-surface dark:text-slate-100 font-sans flex flex-col relative pb-12">
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-surface/95 dark:bg-[#17212B]/95 backdrop-blur-md border-b border-outline-variant/30 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-xl hover:bg-surface-container-low dark:hover:bg-slate-800 text-on-surface-variant dark:text-slate-300 transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          <div>
            <h1 className="font-bold text-base text-on-surface dark:text-slate-100">
              Shahar Statistikasi
            </h1>
            <p className="text-[11px] text-on-surface-variant dark:text-slate-400">
              {cityName} bo'yicha real-vaqt tahlili
            </p>
          </div>
        </div>

        <button
          onClick={() => setHasData(!hasData)}
          className="text-[11px] text-slate-400 font-medium underline"
        >
          {hasData ? "Bo'sh holat" : "Ma'lumotli holat"}
        </button>
      </header>

      {/* PERIOD CHIPS */}
      <div className="px-4 py-3 bg-surface dark:bg-[#17212B] border-b border-outline-variant/30 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: '7d', label: '7 kun' },
          { id: '30d', label: '30 kun' },
          { id: 'year', label: 'Yil' },
          { id: 'all', label: 'Hammasi' },
        ].map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id as any)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              period === p.id
                ? 'bg-primary text-white shadow-md'
                : 'bg-surface-container-low dark:bg-slate-800 text-on-surface-variant dark:text-slate-400'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!hasData ? (
        /* EMPTY STATE */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
            <span className="material-symbols-outlined text-3xl">analytics</span>
          </div>
          <h2 className="font-bold text-base text-slate-200">Hali ma'lumot yig'ilmagan</h2>
          <p className="text-xs text-slate-400 max-w-xs">
            Guruhda foydalanuvchilar savollar bera boshlagach, bu yerda 5 xil animatsiyali statistik grafiklar paydo bo'ladi.
          </p>
        </div>
      ) : (
        /* 5 ANALYTICAL BLOCKS */
        <main className="p-4 space-y-4 animate-fadeIn">
          {/* BLOK 1: JAVOB BERISH DARAJASI (CIRCULAR PROGRESS) */}
          <section className="bg-surface-container-lowest dark:bg-[#17212B] rounded-2xl p-5 border border-outline-variant/30 dark:border-slate-800 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider block mb-1">
                Javob Berish Darajasi
              </span>
              <h2 className="text-2xl font-black text-on-surface dark:text-slate-100">
                {answerRate}% <span className="text-xs font-semibold text-emerald-500">↑ 3.2%</span>
              </h2>
              <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-1">
                {totalQueries} ta so'rovdan 321 tasiga bot 3 soniyada javob berdi.
              </p>
            </div>

            {/* Circular Progress SVG */}
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-primary dark:text-sky-400 transition-all duration-1000 ease-out"
                  strokeDasharray={`${answerRate}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-black text-sky-400">{answerRate}%</span>
            </div>
          </section>

          {/* BLOK 2: SHAHAR PULSI (24 SOATLIK LINE) */}
          <section className="bg-surface-container-lowest dark:bg-[#17212B] rounded-2xl p-4 border border-outline-variant/30 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">
                Shahar Pulsi (24 Soat)
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Faol vaqt: 17:00 - 19:00
              </span>
            </div>

            {/* Simulated Line Wave with Pulsing Peak Dot */}
            <div className="h-24 flex items-end gap-1 pt-4 pb-1 px-1 relative">
              {pulseData.map((val, idx) => {
                const heightPct = (val / 80) * 100;
                const isPeak = val === 80;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group relative">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-sm transition-all ${
                        isPeak ? 'bg-emerald-400' : 'bg-primary/40 dark:bg-sky-500/30 hover:bg-sky-400'
                      }`}
                    />
                    {isPeak && (
                      <div className="absolute -top-3 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#17212B] animate-bounce" />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:00</span>
            </div>
          </section>

          {/* BLOK 3: HAF TALIK GRAFIK (7 USTUN) */}
          <section className="bg-surface-container-lowest dark:bg-[#17212B] rounded-2xl p-4 border border-outline-variant/30 dark:border-slate-800 space-y-3 shadow-sm">
            <span className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider block">
              Haftalik So'rovlar O'sishi
            </span>

            <div className="h-32 flex items-end justify-between gap-2 pt-4 px-2">
              {weeklyData.map(d => {
                const heightPct = (d.count / maxWeeklyCount) * 100;
                return (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold text-sky-400">{d.count}</span>
                    <div className="w-full bg-slate-800 rounded-t-lg h-24 flex items-end overflow-hidden">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full bg-gradient-to-t from-primary to-secondary rounded-t-lg transition-all duration-700"
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">{d.day}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* BLOK 4: QAMROV TO'RI (HEATMAP GRID) */}
          <section className="bg-surface-container-lowest dark:bg-[#17212B] rounded-2xl p-4 border border-outline-variant/30 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">
                Kategoriya Qamrov To'ri
              </span>
              <div className="flex items-center gap-2 text-[10px] font-semibold">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500" /> 3+</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500" /> 1</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500" /> 0</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {coverageCategories.map(c => (
                <div
                  key={c.name}
                  className="p-2.5 rounded-xl bg-surface-container-low dark:bg-[#1C2733] border border-outline-variant/20 dark:border-slate-800 flex items-center justify-between"
                >
                  <span className="text-xs font-semibold text-slate-200">{c.name}</span>
                  <span className={`text-[10px] font-black text-white px-2 py-0.5 rounded-full ${c.color}`}>
                    {c.count} usta
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* BLOK 5: TOP 5 SO'RALGAN (QIZIL TAG & CLICK TO ADD) */}
          <section className="bg-surface-container-lowest dark:bg-[#17212B] rounded-2xl p-4 border border-outline-variant/30 dark:border-slate-800 space-y-3 shadow-sm">
            <span className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider block">
              TOP 5 So'ralgan Kasblar
            </span>

            <div className="space-y-2.5">
              {topQueries.map(q => {
                const widthPct = (q.count / maxQueryCount) * 100;
                return (
                  <div
                    key={q.category}
                    onClick={() => {
                      if (!q.hasListing && onNavigateToAddListingWithCategory) {
                        onNavigateToAddListingWithCategory(q.category);
                      }
                    }}
                    className={`p-2.5 rounded-xl border transition-all ${
                      !q.hasListing
                        ? 'bg-red-500/10 border-red-500/30 cursor-pointer hover:bg-red-500/20'
                        : 'bg-surface-container-low dark:bg-[#1C2733] border-outline-variant/20 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-200">{q.category}</span>
                        {!q.hasListing && (
                          <span className="bg-red-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                            🚨 Bazada yo'q — qo'shish +
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-sky-400">{q.count} so'rov</span>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className={`h-full rounded-full transition-all duration-700 ${
                          !q.hasListing ? 'bg-red-500' : 'bg-primary'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      )}
    </div>
  );
};
