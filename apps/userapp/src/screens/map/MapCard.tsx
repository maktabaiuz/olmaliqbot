import React from 'react';
import type { Landmark, Listing } from '../../lib/types';
import { navigate } from '../../lib/router';
import { recommendPercent } from '../../lib/format';
import { haptic } from '../../lib/telegram';
import { Blob, SHAPE_BY_TYPE } from '../../components/Blob';

type Props = ({ kind: 'listing'; listing: Listing } | { kind: 'area'; landmark: Landmark; count: number }) & { onClose: () => void };

/** Xaritada tanlangan belgi yoki mahalla haqida pastki karta. */
export const MapCard: React.FC<Props> = (p) => {
  const go = (to: string) => {
    haptic('medium');
    navigate(to);
  };
  const shell = 'anim-slide-up bg-surface-container-lowest rounded-lg p-space-md clay-card flex flex-col gap-space-md relative';
  const close = (
    <button aria-label="Yopish" type="button" onClick={p.onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant active:scale-95">
      <span className="material-symbols-outlined text-[18px]">close</span>
    </button>
  );

  if (p.kind === 'area') {
    const { landmark: lm, count } = p;
    return (
      <div className={shell}>
        {close}
        <div className="flex items-center gap-space-sm pr-10">
          <span className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px] fill">location_city</span>
          </span>
          <div className="flex flex-col min-w-0">
            <span className="font-headline-sm text-headline-sm text-on-surface truncate">{lm.name}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Bu hududda: <strong className="text-primary">{count} ta</strong>
            </span>
          </div>
        </div>
        {count > 0 && (
          <button type="button" onClick={() => go('/category/ALL?landmarkId=' + lm.id)} className="h-12 rounded-full bg-primary text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2 clay-fab active:scale-95 transition-transform">
            <span className="material-symbols-outlined text-[20px]">list</span>
            Ro'yxatni ko'rish
          </button>
        )}
      </div>
    );
  }

  const l = p.listing;
  const pct = recommendPercent(l);
  return (
    <div className={shell}>
      {close}
      <div className="flex items-center gap-space-sm pr-10">
        <Blob shape={SHAPE_BY_TYPE[l.type] || 'sphere'} size={44} mood="still" />
        <div className="flex flex-col min-w-0">
          <span className="font-headline-sm text-headline-sm text-on-surface truncate">{l.name}</span>
          <div className="flex items-center gap-2 font-label-md text-label-md flex-wrap">
            {l.open.status !== 'unknown' && (
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${l.open.status === 'open' ? 'bg-tertiary' : 'bg-outline'}`} />
                <span className={l.open.status === 'open' ? 'text-tertiary font-bold' : 'text-on-surface-variant'}>{l.open.label}</span>
              </span>
            )}
            <span className="text-on-surface-variant">{pct === null ? 'Yangi' : `👍 ${pct}%`}</span>
          </div>
        </div>
      </div>
      <button type="button" onClick={() => go('/listing/' + l.id)} className="h-12 rounded-full bg-primary text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2 clay-fab active:scale-95 transition-transform">
        Batafsil
        <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
      </button>
    </div>
  );
};
