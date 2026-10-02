import React from 'react';
import type { Listing } from '../../lib/types';
import { formatRent, recommendPercent } from '../../lib/format';
import { haptic } from '../../lib/telegram';
import { Blob } from '../../components/Blob';

export const RentCard: React.FC<{ listing: Listing; onOpen: () => void; delay?: number }> = ({ listing: l, onOpen, delay = 0 }) => {
  const price = formatRent(l);
  const [amount, term] = price ? (price.includes('/') ? [price.split('/')[0].trim(), '/ ' + price.split('/')[1].trim()] : [price, '']) : [null, ''];
  const pct = recommendPercent(l);
  const place = l.landmark?.name || l.serviceAreas[0]?.name;
  return (
    <button
      type="button"
      onClick={() => {
        haptic('light');
        onOpen();
      }}
      className="anim-slide-up bg-surface-container-lowest rounded-lg overflow-hidden clay-card transition-all text-left active:scale-[0.98]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative w-full h-48 bg-surface-container flex items-center justify-center">
        {l.photoUrls[0] ? <img className="w-full h-full object-cover" src={l.photoUrls[0]} alt={l.name} loading="lazy" /> : <Blob shape="triangle" size={72} mood="still" />}
        {l.verified && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
            <span className="bg-tertiary/90 backdrop-blur-md text-on-tertiary font-label-sm text-label-sm px-2.5 py-1 rounded-full shadow-sm">Tasdiqlangan</span>
          </div>
        )}
        {amount && (
          <div className="absolute bottom-3 left-3 bg-inverse-surface/80 backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-1.5 text-inverse-on-surface shadow-sm">
            <span className="font-headline-sm text-headline-sm font-extrabold text-white">{amount}</span>
            {term && <span className="text-body-sm font-body-sm text-surface-dim">{term}</span>}
          </div>
        )}
      </div>
      <div className="p-space-md space-y-space-sm">
        <div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface truncate">{l.name}</h2>
          {place && (
            <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-primary text-[14px]">location_on</span>
              {place}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {l.category && <span className="bg-surface-container text-on-surface-variant text-label-sm font-label-sm px-2.5 py-1 rounded-full">{l.category.emoji} {l.category.name}</span>}
          {l.rent?.rooms != null && <span className="bg-surface-container text-on-surface-variant text-label-sm font-label-sm px-2.5 py-1 rounded-full">🛏️ {l.rent.rooms} xona</span>}
          <span className="bg-surface-container text-on-surface-variant text-label-sm font-label-sm px-2.5 py-1 rounded-full">{pct === null ? 'Yangi' : `👍 ${pct}%`}</span>
        </div>
      </div>
    </button>
  );
};
