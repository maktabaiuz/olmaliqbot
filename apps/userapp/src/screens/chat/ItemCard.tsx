import React from 'react';
import type { Listing } from '../../lib/types';
import { navigate } from '../../lib/router';
import { haptic } from '../../lib/telegram';
import { TYPE_META } from '../../lib/format';

export const ChatItemCard: React.FC<{ l: Listing }> = ({ l }) => (
  <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low shadow-[inset_1px_1px_2px_rgba(255,255,255,0.9),0_4px_12px_rgba(0,0,0,0.04)] gap-2">
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-11 h-11 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-headline-sm text-headline-sm shrink-0">
        {l.category?.emoji || <span className="material-symbols-outlined text-[22px]">{TYPE_META[l.type]?.icon || 'storefront'}</span>}
      </div>
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1">
          <h3 className="font-headline-sm text-headline-sm text-on-surface truncate">{l.name}</h3>
          {l.verified && <span className="material-symbols-outlined fill text-[16px] text-tertiary">verified</span>}
        </div>
        <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
          {[l.category?.name, l.landmark?.name].filter(Boolean).join(' · ')}
        </span>
      </div>
    </div>
    <button
      onClick={() => {
        haptic('light');
        navigate('/listing/' + l.id);
      }}
      className="shrink-0 px-3 py-1.5 rounded-full bg-primary text-on-primary font-label-md text-label-md active:scale-95 transition-transform"
    >
      Batafsil
    </button>
  </div>
);
