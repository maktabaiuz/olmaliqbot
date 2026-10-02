import React from 'react';
import { Sheet, useToast } from '../../components/ui';
import { Blob, SHAPE_BY_TYPE } from '../../components/Blob';
import { recommendPercent } from '../../lib/format';
import { haptic, shareToTelegram } from '../../lib/telegram';
import type { Listing } from '../../lib/types';
import { shareLink } from './helpers';

export const ShareSheet: React.FC<{ open: boolean; onClose: () => void; listing: Listing }> = ({ open, onClose, listing }) => {
  const toast = useToast();
  const pct = recommendPercent(listing);
  const total = listing.rating.up + listing.rating.down;
  const link = shareLink(listing.id);

  const copy = async () => {
    haptic('light');
    try {
      await navigator.clipboard.writeText(link);
      toast('Nusxalandi', 'success');
    } catch {
      toast("Nusxalab bo'lmadi", 'error');
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Ulashish">
      <div className="px-margin pt-space-xs pb-space-xl flex flex-col gap-space-md">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-primary-fixed/60 via-surface-container-lowest to-surface-container-low p-space-lg clay-card flex flex-col items-center text-center gap-space-sm anim-slide-up">
          <div className="absolute -left-10 top-24 w-40 h-40 rounded-full bg-tertiary-fixed/50 blur-3xl pointer-events-none" />
          <div className="w-full flex items-center justify-between relative">
            <span className="inline-flex items-center gap-1.5 bg-surface-container-lowest/90 px-3 py-1.5 rounded-full shadow-sm">
              <span className="font-label-md text-label-md text-primary font-extrabold">KIM BOR?</span>
              <span className="text-outline">•</span>
              <span className="font-label-sm text-label-sm text-on-surface">Olmaliq</span>
            </span>
            {listing.verified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-tertiary-fixed/60 text-tertiary font-label-sm text-label-sm">
                <span className="material-symbols-outlined text-[15px]">verified</span>
                Tasdiqlangan
              </span>
            )}
          </div>
          <div className="relative w-28 h-28 my-space-xs rounded-full bg-gradient-to-br from-surface-container-lowest to-secondary-fixed/50 shadow-lg flex items-center justify-center">
            <Blob shape={SHAPE_BY_TYPE[listing.type] || 'sphere'} mood="hop" size={76} />
          </div>
          <div className="flex items-center gap-1.5 justify-center">
            <h2 className="font-headline-md text-headline-md text-on-surface">{listing.name}</h2>
            {listing.verified && <span className="material-symbols-outlined text-primary text-[22px]">verified</span>}
          </div>
          {listing.category && (
            <p className="font-body-md text-body-md text-on-surface-variant">
              {listing.category.emoji ? `${listing.category.emoji} ` : ''}
              {listing.category.name}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1 bg-secondary-fixed/60 px-3 py-1.5 rounded-full font-label-md text-label-md text-on-secondary-fixed">
              {pct !== null ? `👍 ${pct}% tavsiya (${total})` : 'Hali baholanmagan'}
            </span>
            {listing.landmark && (
              <span className="inline-flex items-center gap-1 bg-surface-container-lowest px-3 py-1.5 rounded-full font-label-md text-label-md text-on-surface shadow-sm">
                <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                {listing.landmark.name}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            haptic('medium');
            shareToTelegram(link, `${listing.name} — Kim bor? Olmaliq`);
          }}
          className="w-full h-14 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2 clay-fab active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[22px]">send</span>
          Telegramda ulashish
        </button>
        <button onClick={copy} className="w-full p-space-md rounded-[1.5rem] bg-surface-container-lowest shadow-sm flex items-center gap-space-md text-left active:scale-[0.98] transition-transform">
          <span className="w-11 h-11 shrink-0 rounded-full bg-surface-container flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px] text-on-surface">link</span>
          </span>
          <span className="flex flex-col min-w-0 flex-1">
            <span className="font-body-sm text-body-sm text-on-surface-variant">Havolani nusxalash</span>
            <span className="font-label-md text-label-md text-primary truncate">{link.replace('https://', '')}</span>
          </span>
          <span className="w-10 h-10 shrink-0 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[20px]">content_copy</span>
          </span>
        </button>
      </div>
    </Sheet>
  );
};
