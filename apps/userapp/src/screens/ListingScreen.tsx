import React from 'react';
import type { Route } from '../lib/router';
import { goBack } from '../lib/router';
import { ErrorView, Skeleton } from '../components/ui';
import { recommendPercent } from '../lib/format';
import { haptic, openUrl } from '../lib/telegram';
import { useListingPage } from './listing/useListingPage';
import { Gallery, OpenPill } from './listing/Gallery';
import { AreasCard, BadgeChips, DescriptionCard, HoursCard, LocationCard, ReviewsCard, ServicesCard } from './listing/Sections';
import { ListingSheets } from './listing/ListingSheets';
import { locationUrl } from './listing/helpers';

export const PageHeader: React.FC<{ title: string }> = ({ title }) => (
  <header className="fixed top-0 inset-x-0 z-50 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
    <div className="h-16 px-space-md flex items-center gap-space-xs min-w-0">
      <button
        aria-label="Orqaga"
        className="w-11 h-11 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container active:scale-95 transition-all"
        onClick={() => {
          haptic('light');
          goBack();
        }}
        type="button"
      >
        <span className="material-symbols-outlined text-[24px]">arrow_back_ios_new</span>
      </button>
      <h1 className="font-headline-sm text-headline-sm text-on-surface truncate">{title}</h1>
    </div>
  </header>
);

export const ListingScreen: React.FC<{ route: Route }> = ({ route }) => {
  const id = route.segments[1] || '';
  const p = useListingPage(id);
  const { data } = p;

  if (data.error) {
    return (
      <div className="min-h-screen bg-surface pt-16">
        <PageHeader title="Kartochka" />
        <ErrorView error={data.error} onRetry={data.reload} />
      </div>
    );
  }
  if (!data.data) {
    return (
      <div className="min-h-screen bg-surface pt-16 px-margin flex flex-col gap-space-md">
        <PageHeader title="Kartochka" />
        <Skeleton className="h-64 w-full rounded-b-[28px]" />
        <Skeleton className="h-40 mx-margin" />
        <Skeleton className="h-16" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  const { listing: l, reviews, canReview } = data.data;
  const pct = recommendPercent(l);
  const total = l.rating.up + l.rating.down;
  const mapUrl = locationUrl(l);
  const loading = p.phone.state.kind === 'loading';
  const subtitle = [l.category && `${l.category.emoji ? `${l.category.emoji} ` : ''}${l.category.name}`, l.landmark?.name].filter(Boolean).join(' • ');

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased flex flex-col min-h-screen">
      <PageHeader title={l.name} />
      <main className="flex-1 flex flex-col relative w-full px-margin pt-16 pb-safe bg-surface">
        <div className="flex flex-col w-full pb-28">
          <Gallery listing={l} className="h-64 rounded-b-[28px] shadow-lg shadow-primary/5">
            <OpenPill listing={l} className="absolute bottom-4 left-4" />
          </Gallery>

          <div className="relative -mt-4 mx-margin bg-surface-container-lowest rounded-lg p-space-lg shadow-xl shadow-primary/10 flex flex-col gap-space-sm z-10 anim-slide-up">
            <div className="flex items-start justify-between gap-space-sm">
              <div className="flex flex-col min-w-0">
                <h2 className="font-headline-md text-headline-md text-on-surface">{l.name}</h2>
                {subtitle && <p className="font-body-md text-body-md text-on-surface-variant mt-0.5 line-clamp-1">{subtitle}</p>}
              </div>
              {l.verified && (
                <div className="w-10 h-10 rounded-full bg-tertiary-fixed/60 flex items-center justify-center shrink-0 shadow-sm" title="Tasdiqlangan">
                  <span className="material-symbols-outlined text-tertiary text-[22px] fill">verified</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-space-xs pt-1">
              <div className="inline-flex items-center gap-1 bg-secondary-fixed/50 px-2.5 py-1 rounded-full">
                <span className="font-label-md text-label-md text-on-secondary-container">{pct !== null ? `👍 ${pct}% tavsiya qiladi (${total})` : 'Hali baholanmagan'}</span>
              </div>
              <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${l.verified ? 'bg-tertiary-fixed/50' : 'bg-primary-fixed/60'}`}>
                <span className={`font-label-sm text-label-sm ${l.verified ? 'text-on-tertiary-fixed' : 'text-on-primary-fixed'}`}>{l.verified ? '✅ Tasdiqlangan' : '⚠️ Xalq aytgan'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-space-xs">
              <button
                onClick={p.call}
                disabled={loading}
                className={`relative overflow-hidden flex-1 h-12 bg-tertiary-fixed text-on-tertiary-fixed rounded-full flex items-center justify-center gap-2 shadow-[0_8px_16px_-4px_rgba(0,129,106,0.3)] active:scale-95 transition-all ${loading ? 'skeleton' : ''}`}
              >
                <span className="material-symbols-outlined text-[20px] fill">call</span>
                <span className="font-label-lg text-label-lg text-on-tertiary-fixed">{loading ? 'Ochilmoqda...' : "📞 Qo'ng'iroq"}</span>
              </button>
              {mapUrl && (
                <button
                  aria-label="📍 Lokatsiya"
                  onClick={() => {
                    haptic('light');
                    openUrl(mapUrl);
                  }}
                  className="w-12 h-12 bg-secondary-fixed rounded-full flex items-center justify-center text-on-secondary-fixed shadow-sm active:scale-90 transition-all shrink-0"
                >
                  <span className="material-symbols-outlined text-[22px] fill">near_me</span>
                </button>
              )}
              <button
                aria-label="🔖 Saqlash"
                onClick={p.toggleFav}
                className={`w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-all shrink-0 ${p.fav ? 'bg-primary-fixed text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}
              >
                <span className={`material-symbols-outlined text-[22px] ${p.fav ? 'fill' : ''}`}>{p.fav ? 'bookmark' : 'bookmark_border'}</span>
              </button>
              <button
                aria-label="Ulashish"
                onClick={() => p.open('share')}
                className="w-12 h-12 bg-surface-container-high rounded-full flex items-center justify-center text-on-surface-variant active:scale-90 transition-all shrink-0"
              >
                <span className="material-symbols-outlined text-[22px]">share</span>
              </button>
            </div>
          </div>

          <div className="px-margin flex flex-col gap-space-lg mt-space-lg">
            <HoursCard l={l} i={1} />
            <BadgeChips l={l} i={2} />
            <LocationCard l={l} i={3} />
            <AreasCard l={l} i={4} />
            <ServicesCard l={l} i={5} />
            <DescriptionCard l={l} i={6} />
            <ReviewsCard l={l} reviews={reviews} canReview={canReview} onReview={() => p.open('review')} i={7} />
            <div className="flex items-center justify-center gap-1.5 py-2">
              <span className="material-symbols-outlined text-outline text-[16px]">info</span>
              <button className="font-label-sm text-label-sm text-outline hover:text-error transition-colors" onClick={() => p.open('report')} type="button">
                Ma'lumotda xatolik bormi? Xabar bering
              </button>
            </div>
          </div>

          <div className="fixed bottom-0 inset-x-0 bg-surface/90 backdrop-blur-xl p-space-md pb-safe shadow-[0_-8px_24px_rgba(0,0,0,0.06)] z-40 flex items-center justify-between gap-space-md">
            <div className="flex flex-col min-w-0 pl-1">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider truncate">{l.name}</span>
              <span className="font-label-lg text-label-lg text-primary truncate">{pct !== null ? `👍 ${pct}% tavsiya` : l.verified ? '✅ Tasdiqlangan' : '⚠️ Xalq aytgan'}</span>
            </div>
            <button
              onClick={p.call}
              disabled={loading}
              className={`h-12 px-6 bg-tertiary text-on-tertiary rounded-full font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(0,102,83,0.35)] active:scale-95 transition-all shrink-0 ${loading ? 'opacity-80' : ''}`}
            >
              <span className="material-symbols-outlined text-[20px] fill">phone_in_talk</span>
              <span>{loading ? 'Ochilmoqda...' : "Bog'lanish"}</span>
            </button>
          </div>
        </div>
      </main>
      <ListingSheets page={p} listing={l} />
    </div>
  );
};
