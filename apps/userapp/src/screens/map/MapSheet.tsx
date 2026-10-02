import React from 'react';
import type { Listing } from '../../lib/types';
import { navigate } from '../../lib/router';
import { haptic, shareToTelegram } from '../../lib/telegram';
import { recommendPercent } from '../../lib/format';
import { PIN_STYLE } from './pins';

/**
 * Stitch "xarita_olmaliq_mahallalari_va_ustalari" pastki kartasi:
 * mahalla sarlavhasi → tanlangan yozuv kartasi → "Yana shu mahallada".
 */
const Tile: React.FC<{ type: string; size?: number }> = ({ type, size = 56 }) => {
  const st = PIN_STYLE[type] || PIN_STYLE.USTA;
  return (
    <div
      className="shrink-0 rounded-2xl flex items-center justify-center border-b-4"
      style={{ width: size, height: size, background: `${st.color}1f`, borderColor: st.color, color: st.color }}
    >
      <span className="material-symbols-outlined fill" style={{ fontSize: size * 0.46 }}>
        {st.icon}
      </span>
    </div>
  );
};

const FeaturedCard: React.FC<{ l: Listing }> = ({ l }) => {
  const pct = recommendPercent(l);
  const open = () => {
    haptic('light');
    navigate(`/listing/${l.id}`);
  };
  return (
    <div className="bg-surface-container-low rounded-[1.5rem] p-4 anim-slide-up">
      <div className="flex gap-3">
        <Tile type={l.type} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-headline-md text-headline-md text-on-surface truncate">{l.name}</h3>
            {l.verified && <span className="material-symbols-outlined text-tertiary-container text-[20px] fill shrink-0">verified</span>}
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant truncate">{l.services || l.category?.name}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="font-label-lg text-label-lg text-on-surface">{pct != null ? `👍 ${pct}%` : 'Yangi'}</span>
            {l.open.status !== 'unknown' && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-md text-label-md ${
                  l.open.status === 'open' ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant' : 'bg-error-container text-on-error-container'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${l.open.status === 'open' ? 'bg-tertiary-container animate-pulse' : 'bg-error'}`} />
                {l.open.label}
              </span>
            )}
          </div>
        </div>
      </div>
      {l.landmark && (
        <div className="mt-3 flex items-center gap-2 bg-surface-container-lowest rounded-xl px-3 py-2.5">
          <span className="material-symbols-outlined text-primary text-[18px]">near_me</span>
          <span className="font-body-md text-body-md text-on-surface truncate">{l.landmark.name}</span>
        </div>
      )}
      <div className="mt-3 flex items-center gap-2">
        <button onClick={open} className="flex-1 h-12 rounded-full bg-tertiary text-on-tertiary font-label-lg text-label-lg flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md">
          <span className="material-symbols-outlined text-[20px] fill">call</span>
          Qo'ng'iroq
        </button>
        <button onClick={open} className="flex-1 h-12 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-lg text-label-lg flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
          Batafsil
          <span className="material-symbols-outlined text-[18px]">north_east</span>
        </button>
        <button
          aria-label="Ulashish"
          onClick={() => shareToTelegram(`https://t.me/uz11_bot?start=listing_${l.id}`, `${l.name} — Kim bor? Olmaliq`)}
          className="w-12 h-12 rounded-full bg-surface-container-lowest text-primary flex items-center justify-center active:scale-90 transition-transform shadow-sm"
        >
          <span className="material-symbols-outlined text-[20px]">send</span>
        </button>
      </div>
    </div>
  );
};

export const MapSheet: React.FC<{
  areaTitle: string;
  areaSubtitle: string;
  featured: Listing | null;
  nearby: Listing[];
  nearbyTitle: string;
  onSeeAll?: () => void;
}> = ({ areaTitle, areaSubtitle, featured, nearby, nearbyTitle, onSeeAll }) => (
  <section className="relative -mt-8 z-[500] bg-surface-container-lowest rounded-t-[2rem] rounded-b-[2rem] clay-card px-4 pt-3 pb-5 flex flex-col gap-3">
    <div className="flex justify-center">
      <span className="w-10 h-1.5 rounded-full bg-outline-variant/60" />
    </div>
    <div className="bg-surface-container-low rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 font-label-sm text-label-sm uppercase tracking-wider">
          <span className="text-primary">Mahalla hududi</span>
          <span className="w-1 h-1 rounded-full bg-outline" />
          <span className="text-on-surface-variant normal-case">{areaSubtitle}</span>
        </div>
        <h2 className="font-headline-md text-headline-md text-on-surface truncate">{areaTitle}</h2>
      </div>
      <span className="shrink-0 px-3 py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-md text-label-md">
        {nearby.length + (featured ? 1 : 0)} ta joy
      </span>
    </div>

    {featured ? (
      <FeaturedCard key={featured.id} l={featured} />
    ) : (
      <p className="font-body-md text-body-md text-on-surface-variant text-center py-4">Bu hududda hozircha xaritaga joylangan e'lon yo'q.</p>
    )}

    {nearby.length > 0 && (
      <>
        <div className="flex items-center justify-between px-1 pt-1">
          <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{nearbyTitle}</span>
          {onSeeAll && (
            <button onClick={onSeeAll} className="font-label-md text-label-md text-primary font-bold flex items-center gap-0.5 active:opacity-60">
              Barchasini ko'rish <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          )}
        </div>
        {nearby.slice(0, 4).map((l, i) => (
          <button
            key={l.id}
            onClick={() => navigate(`/listing/${l.id}`)}
            className="flex items-center gap-3 bg-surface-container-low rounded-2xl p-3 text-left active:scale-[0.98] transition-transform anim-slide-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <Tile type={l.type} size={44} />
            <div className="min-w-0 flex-1">
              <p className="font-headline-sm text-headline-sm text-on-surface truncate">{l.name}</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                {l.landmark?.name || l.category?.name}
                {l.open.status === 'open' ? ' · 🟢 Ochiq' : ''}
              </p>
            </div>
            <span className="w-10 h-10 rounded-full bg-surface-container-lowest text-tertiary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">call</span>
            </span>
          </button>
        ))}
      </>
    )}
  </section>
);
