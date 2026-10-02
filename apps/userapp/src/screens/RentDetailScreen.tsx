import React from 'react';
import type { Route } from '../lib/router';
import { goBack } from '../lib/router';
import { ErrorView, Skeleton } from '../components/ui';
import { formatRent, recommendPercent } from '../lib/format';
import { haptic } from '../lib/telegram';
import { useListingPage } from './listing/useListingPage';
import { Gallery, OpenPill } from './listing/Gallery';
import { DescriptionCard, LocationCard, ReviewsCard } from './listing/Sections';
import { ListingSheets } from './listing/ListingSheets';

const floatBtn =
  'w-11 h-11 pointer-events-auto flex items-center justify-center rounded-full bg-surface-container-lowest/80 text-on-surface shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_2px_rgba(255,255,255,0.9)] backdrop-blur-md active:scale-95 transition-transform';
const TERM_LABEL = { KUNLIK: 'Kunlik', OYLIK: 'Oylik', YILLIK: 'Yillik' } as const;

const Stat: React.FC<{ icon: string; tint: string; label: string; value: string }> = ({ icon, tint, label, value }) => (
  <div className="p-3 rounded-DEFAULT bg-surface-container-lowest shadow-[0_4px_12px_rgba(108,92,231,0.06),inset_1px_1px_2px_rgba(255,255,255,0.9)] flex items-center gap-2.5">
    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tint}`}>
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </div>
    <div className="flex flex-col min-w-0">
      <span className="font-body-sm text-body-sm text-on-surface-variant">{label}</span>
      <span className="font-label-lg text-label-lg text-on-surface truncate">{value}</span>
    </div>
  </div>
);

export const RentDetailScreen: React.FC<{ route: Route }> = ({ route }) => {
  const id = route.segments[1] || '';
  const p = useListingPage(id);
  const { data } = p;

  const header = (
    <header className="fixed top-0 w-full z-50 pt-safe pointer-events-none">
      <div className="h-16 px-margin flex items-center justify-between">
        <button
          aria-label="Orqaga"
          className={floatBtn}
          onClick={() => {
            haptic('light');
            goBack();
          }}
        >
          <span className="material-symbols-outlined text-[22px]">arrow_back</span>
        </button>
        {data.data && (
          <div className="flex items-center gap-space-xs pointer-events-auto">
            <button aria-label="Saqlash" onClick={p.toggleFav} className={`${floatBtn} ${p.fav ? 'text-error' : 'text-on-surface-variant'}`}>
              <span className={`material-symbols-outlined text-[22px] ${p.fav ? 'fill' : ''}`}>favorite</span>
            </button>
            <button aria-label="Ulashish" onClick={() => p.open('share')} className={floatBtn}>
              <span className="material-symbols-outlined text-[22px]">share</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );

  if (data.error)
    return (
      <div className="min-h-screen bg-surface pt-16">
        {header}
        <ErrorView error={data.error} onRetry={data.reload} />
      </div>
    );
  if (!data.data)
    return (
      <div className="min-h-screen bg-surface flex flex-col gap-space-md">
        {header}
        <Skeleton className="w-full aspect-[4/3] rounded-none" />
        <Skeleton className="h-48 mx-margin" />
        <Skeleton className="h-32 mx-margin" />
      </div>
    );

  const { listing: l, reviews, canReview } = data.data;
  const price = formatRent(l);
  const loading = p.phone.state.kind === 'loading';
  const term = l.rent?.term ? TERM_LABEL[l.rent.term] : null;
  const pct = recommendPercent(l);

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface flex flex-col min-h-screen relative">
      {header}
      <main className="flex flex-col relative w-full pt-0 pb-28 bg-surface min-h-screen">
        <Gallery listing={l} className="aspect-[4/3]" dots>
          <div className="absolute top-20 left-margin right-margin flex flex-wrap items-center gap-space-xs pointer-events-none z-10">
            <OpenPill listing={l} />
          </div>
        </Gallery>
        <div className="flex flex-col px-margin -mt-3 relative z-20 gap-space-lg pb-6">
          <div className="p-space-lg rounded-lg bg-surface-container-lowest clay-card flex flex-col gap-space-sm anim-slide-up">
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-sm text-label-sm ${l.verified ? 'bg-tertiary-fixed/60 text-on-tertiary-fixed' : 'bg-primary-fixed text-on-primary-fixed'}`}>
                {l.verified ? '✅ Tasdiqlangan' : '⚠️ Xalq aytgan'}
              </div>
              {pct !== null && <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">👍 {pct}%</span>}
            </div>
            <h1 className="font-headline-md text-headline-md text-on-surface font-extrabold tracking-tight">{l.name}</h1>
            {l.landmark && (
              <div className="flex items-start gap-1.5 text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5">location_on</span>
                <span className="font-body-md text-body-md text-on-surface">{l.landmark.name}</span>
              </div>
            )}
            {price && (
              <div className="mt-2 p-3.5 rounded-DEFAULT bg-surface-container-low flex flex-col gap-1.5 shadow-[inset_1px_1px_3px_rgba(255,255,255,0.8),inset_-2px_-2px_4px_rgba(108,92,231,0.05)]">
                <span className="font-headline-xl text-headline-xl font-extrabold text-primary">{price}</span>
              </div>
            )}
          </div>

          {(l.rent?.rooms || term) && (
            <div className="grid grid-cols-2 gap-space-xs anim-slide-up" style={{ animationDelay: '60ms' }}>
              {l.rent?.rooms ? <Stat icon="meeting_room" tint="bg-primary-fixed text-primary" label="Xonalar" value={`${l.rent.rooms} xona`} /> : null}
              {term && <Stat icon="calendar_month" tint="bg-tertiary-fixed text-tertiary" label="Muddat" value={term} />}
            </div>
          )}

          <DescriptionCard l={l} i={2} title="Tavsif" />
          <LocationCard l={l} i={3} />
          <ReviewsCard l={l} reviews={reviews} canReview={canReview} onReview={() => p.open('review')} i={4} />
          <div className="flex items-center justify-center gap-1.5 py-2">
            <span className="material-symbols-outlined text-outline text-[16px]">flag</span>
            <button className="font-label-sm text-label-sm text-outline hover:text-error transition-colors" onClick={() => p.open('report')} type="button">
              Ma'lumotda noaniqlik bormi? Xabar bering
            </button>
          </div>
          <div className="p-space-md rounded-lg bg-secondary-fixed/40 flex items-start gap-space-sm">
            <span className="material-symbols-outlined text-[20px] text-on-secondary-fixed">shield</span>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface">Kim bor? Xavfsizlik tavsiyasi</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Uy egasi bilan shaxsan ko'rishib, shartnoma tuzishni unutmang. Hech qachon ko'rmasdan oldindan to'lov qilmang.</span>
            </div>
          </div>
        </div>
      </main>
      <footer className="fixed bottom-0 w-full z-50 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
        <div className="h-20 px-margin flex items-center justify-between gap-gutter">
          <div className="flex flex-col min-w-0">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{term ? `${term} ijara` : 'Ijara'}</span>
            <span className="font-headline-sm text-headline-sm text-primary font-bold truncate">{price || l.name}</span>
          </div>
          <button
            onClick={p.call}
            disabled={loading}
            className={`h-12 px-space-lg flex items-center justify-center gap-space-xs rounded-full bg-primary text-on-primary font-label-lg text-label-lg shadow-[0_8px_20px_-2px_rgba(108,92,231,0.42),inset_0_2px_0_rgba(255,255,255,0.35)] active:scale-95 transition-transform shrink-0 ${loading ? 'opacity-80' : ''}`}
          >
            <span className="material-symbols-outlined text-[20px]">call</span>
            <span>{loading ? 'Ochilmoqda...' : "Qo'ng'iroq"}</span>
          </button>
        </div>
      </footer>
      <ListingSheets page={p} listing={l} />
    </div>
  );
};
