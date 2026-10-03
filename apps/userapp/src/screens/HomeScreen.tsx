import React from 'react';
import type { Route } from '../lib/router';
import { navigate } from '../lib/router';
import { api } from '../lib/api';
import { haptic, tgUser } from '../lib/telegram';
import { useAsync, ErrorView, Skeleton } from '../components/ui';
import { Blob } from '../components/Blob';
import { CategoryGrid, OpenNowCard, PopularChips } from './home/HomeParts';
import { speechSupported } from './search/voice';

const go = (to: string) => () => {
  haptic('light');
  navigate(to);
};

export const HomeScreen: React.FC<{ route: Route }> = () => {
  const home = useAsync(() => api.home(), []);
  const name = tgUser()?.first_name || "qo'shni";

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased flex flex-col min-h-screen selection:bg-primary-fixed">
      <header className="fixed top-0 inset-x-0 z-50 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
        <div className="h-16 px-margin flex items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm min-w-0">
            <img alt="Kim bor?" className="h-8 w-auto object-contain shrink-0" src={`${(import.meta as unknown as { env: { BASE_URL: string } }).env.BASE_URL}logo.png`} />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-headline-sm text-headline-sm text-on-surface truncate">Kim bor?</span>
                <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim inline-block animate-pulse shrink-0" />
              </div>
              <button onClick={go('/map')} className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm truncate bg-surface-container-low px-2 py-0.5 rounded-full hover:text-primary transition-colors text-left active:scale-95" type="button">
                <span className="truncate">📍 Olmaliq shahri</span>
                <span className="material-symbols-outlined text-[12px]">expand_more</span>
              </button>
            </div>
          </div>
          <button aria-label="Profil" onClick={go('/profile')} className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-sm active:scale-95" type="button">
            <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative w-full px-margin pt-16 pb-28 bg-surface">
        <div className="flex flex-col w-full gap-space-lg select-none">
          {/* Salomlashish */}
          <div className="flex items-center justify-between gap-space-sm pt-1">
            <div className="flex items-center gap-space-sm min-w-0">
              <div className="relative shrink-0">
                <Blob shape="sphere" mood="idle" size={48} />
                <span className="absolute -bottom-1 -right-0.5 w-3.5 h-3.5 bg-tertiary-fixed-dim rounded-full shadow-sm ring-2 ring-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-headline-sm text-headline-sm text-on-surface truncate">Salom, {name}! 👋</span>
                </div>
                <button onClick={go('/map')} className="group flex items-center gap-1 text-on-surface-variant font-label-md text-label-md truncate bg-surface-container-low px-2.5 py-0.5 rounded-full hover:bg-surface-container-high transition-colors w-fit active:scale-95" type="button">
                  <span className="material-symbols-outlined fill text-[14px] text-primary">location_on</span>
                  <span className="truncate font-semibold text-on-surface">Olmaliq</span>
                  <span className="material-symbols-outlined text-[14px] text-outline group-hover:translate-y-0.5 transition-transform">expand_more</span>
                </button>
              </div>
            </div>
            <button onClick={go('/sos')} aria-label="Shoshilinch chaqiruv xizmati" className="relative shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg active:scale-95 transition-all overflow-hidden" type="button">
              <span className="absolute inset-0 bg-white/20 animate-ping rounded-full pointer-events-none opacity-40" />
              <span className="material-symbols-outlined fill text-[18px] animate-bounce">emergency_home</span>
              <span className="font-label-sm text-label-sm tracking-wider uppercase font-black">SOS</span>
            </button>
          </div>

          {/* Qidiruv maydoni — fokus rejimiga olib boradi */}
          <div className="relative w-full">
            <div
              role="button"
              onClick={go('/search')}
              className="relative flex items-center w-full h-[54px] rounded-2xl bg-surface-container-lowest px-4 shadow-[0_8px_20px_-4px_rgba(108,92,231,0.08),inset_1px_1px_2px_rgba(255,255,255,1)] transition-all active:scale-[0.98] cursor-text"
            >
              <span className="material-symbols-outlined fill text-primary text-[24px] shrink-0 mr-3">search</span>
              <span className="w-full font-body-md text-body-md text-outline min-w-0 truncate">Kim kerak? Santexnik, taksi, apteka...</span>
              {speechSupported() && (
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    aria-label="Ovozli qidiruv"
                    onClick={(e) => {
                      e.stopPropagation();
                      go('/search?voice=1')();
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-surface-container-low transition-colors active:scale-95"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">mic</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {home.error ? (
            <ErrorView error={home.error} onRetry={home.reload} />
          ) : (
            <>
              <CategoryGrid counts={home.data?.countsByType} />

              {/* Uy-joy ijarasi — eng ko'p so'raladigan bo'lim (2026-10) */}
              <div className="grid grid-cols-2 gap-2.5">
                <button onClick={() => navigate('/rent')} className="flex items-center gap-2 p-3 rounded-2xl bg-purple-50 active:scale-95 transition-transform shadow-[0_6px_14px_-2px_rgba(108,92,231,0.2)] text-left">
                  <span className="text-[26px]">🔑</span>
                  <span className="flex flex-col">
                    <span className="font-label-lg text-label-lg text-on-surface">Ijaraga uy</span>
                    <span className="font-label-sm text-label-sm text-purple-700/80">Qidirish</span>
                  </span>
                </button>
                <button onClick={() => navigate('/rent/add')} className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-50 active:scale-95 transition-transform shadow-[0_6px_14px_-2px_rgba(0,129,106,0.18)] text-left">
                  <span className="text-[26px]">🏠</span>
                  <span className="flex flex-col">
                    <span className="font-label-lg text-label-lg text-on-surface">Uy beraman</span>
                    <span className="font-label-sm text-label-sm text-emerald-700/80">Bepul e'lon</span>
                  </span>
                </button>
              </div>

              {/* Hozir ochiq */}
              {(home.loading || (home.data?.openNow.length ?? 0) > 0) && (
                <div className="flex flex-col gap-space-xs -mx-margin">
                  <div className="flex items-center justify-between px-margin">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-headline-sm text-headline-sm text-on-surface">Hozir ochiq yaqiningizda</span>
                    </div>
                  </div>
                  <div className="flex gap-3 overflow-x-auto px-margin pt-1 pb-2 no-scrollbar">
                    {home.loading
                      ? [0, 1].map((i) => <Skeleton key={i} className="shrink-0 w-[240px] h-[150px] rounded-3xl" />)
                      : home.data!.openNow.map((l, i) => <OpenNowCard key={l.id} l={l} i={i} />)}
                  </div>
                </div>
              )}

              {/* Ko'p so'ralgan */}
              {(home.data?.popular.length ?? 0) > 0 && (
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between px-1">
                    <span className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-1.5">
                      <span>🔥</span> Ko'p so'ralgan
                    </span>
                    <span className="font-label-sm text-label-sm text-outline">Olmaliqda ommabop</span>
                  </div>
                  <PopularChips items={home.data!.popular} />
                </div>
              )}
            </>
          )}

          {/* Qo'shing banneri */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-fixed via-secondary-fixed/50 to-primary/10 p-4 shadow-[0_10px_25px_-5px_rgba(108,92,231,0.18)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col min-w-0 z-10">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/80 w-fit mb-1">
                  <span className="material-symbols-outlined text-primary text-[12px]">favorite</span>
                  <span className="font-label-sm text-label-sm text-primary font-bold">Mahalla birdamligi</span>
                </div>
                <h4 className="font-headline-sm text-headline-sm text-on-surface">Usta yoki do'kon bilasizmi?</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 line-clamp-2">Olmaliqliklarga yordam bering, qo'shningizni tavsiya qiling!</p>
                <button onClick={go('/add')} className="mt-2.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-primary to-primary-container text-white font-label-lg text-label-lg shadow-md active:scale-95 transition-all w-fit" type="button">
                  <span>Qo'shing</span>
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                </button>
              </div>
              <div className="shrink-0 relative w-24 h-24 flex items-center justify-center">
                <div className="absolute inset-0 bg-white/40 rounded-full blur-md" />
                <Blob shape="sphere" mood="hop" size={80} className="relative z-10" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
