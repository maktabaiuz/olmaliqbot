import React from 'react';
import type { Listing } from '../lib/types';
import { badgeLabel, recommendPercent, TYPE_META } from '../lib/format';
import { haptic } from '../lib/telegram';

const BADGE_EMOJI: Record<string, string> = { uyga_boradi: '🚗', '24_7': '⏰', kafolat: '🛡️', karta_qabul_qiladi: '💳', zudlik_bilan: '⚡' };

const Rating: React.FC<{ l: Listing }> = ({ l }) => {
  const p = recommendPercent(l);
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary-fixed/30 text-on-secondary-container font-label-md text-label-md shrink-0">
      {p === null ? 'Yangi' : <>👍 {p}%</>}
      {l.rating.up > 0 && <span className="font-body-sm text-body-sm opacity-70">({l.rating.up})</span>}
    </div>
  );
};

const Icon: React.FC<{ l: Listing; small?: boolean }> = ({ l, small }) =>
  l.category?.emoji ? (
    <>{l.category.emoji}</>
  ) : (
    <span className={`material-symbols-outlined ${small ? 'text-[20px]' : 'text-[24px]'}`}>{TYPE_META[l.type]?.icon || 'storefront'}</span>
  );

/** Qidiruv natijasi kartasi (Stitch: qidiruv_natijalari_*). Telefon ro'yxatda yo'q — qo'ng'iroq listing sahifasiga olib boradi. */
export const ListingCard: React.FC<{ listing: Listing; dim?: boolean; reason?: string | null; onOpen: () => void }> = ({ listing: l, dim, reason, onOpen }) => {
  const open = () => {
    haptic('light');
    onOpen();
  };
  const place = l.landmark?.name || l.serviceAreas[0]?.name || null;

  if (dim) {
    const p = recommendPercent(l);
    return (
      <div onClick={open} className="p-3.5 bg-surface-container-low rounded-2xl flex items-center justify-between gap-space-sm transition-all hover:bg-surface-container active:scale-95 cursor-pointer">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center text-lg shrink-0 shadow-sm text-primary">
            <Icon l={l} small />
          </div>
          <div className="flex flex-col min-w-0">
            <h4 className="font-label-lg text-label-lg text-on-surface truncate">{l.name}</h4>
            <div className="flex items-center gap-1 text-on-surface-variant font-body-sm text-body-sm truncate">
              {place && (
                <>
                  <span className="truncate">📍 {place}</span>
                  <span className="opacity-40">•</span>
                </>
              )}
              <span>{p === null ? 'Yangi' : `👍 ${p}%`}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
          className="px-3 py-1.5 rounded-full bg-surface-container-lowest text-primary font-label-md text-label-md shrink-0 shadow-sm hover:bg-primary hover:text-on-primary transition-colors flex items-center gap-1 active:scale-95"
        >
          <span className="material-symbols-outlined text-[15px]">call</span>
          <span>Bog‘lanish</span>
        </button>
      </div>
    );
  }

  return (
    <article className="bg-surface-container-lowest rounded-lg p-space-lg clay-card transition-all duration-200 flex flex-col space-y-space-md">
      <div className="flex items-start justify-between gap-space-sm" onClick={open}>
        <div className="flex items-start gap-space-sm min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-secondary-fixed/50 flex items-center justify-center text-secondary text-2xl shrink-0 clay-card">
            <Icon l={l} />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <h4 className="font-headline-sm text-headline-sm text-on-surface truncate">{l.name}</h4>
              {l.verified && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-tertiary-container/15 text-tertiary font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-[13px]">verified</span> Tasdiqlangan
                </span>
              )}
            </div>
            {(l.category?.name || l.services) && (
              <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{l.services || l.category?.name}</p>
            )}
          </div>
        </div>
        <Rating l={l} />
      </div>

      {place && (
        <div className="flex items-center gap-1.5 text-on-surface-variant font-body-sm text-body-sm bg-surface-container-low px-3 py-1.5 rounded-full w-fit max-w-full">
          <span className="material-symbols-outlined text-primary text-[16px]">near_me</span>
          <span className="font-bold text-on-surface truncate">📍 {place}</span>
          {l.rating.up > 0 && (
            <>
              <span className="opacity-40">•</span>
              <span className="text-primary font-label-md text-label-md shrink-0">{l.rating.up} ta tavsiya</span>
            </>
          )}
        </div>
      )}

      {(l.open.status !== 'unknown' || l.badges.length > 0) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {l.open.status === 'open' && <span className="px-2.5 py-1 rounded-full bg-tertiary-fixed-dim/25 text-tertiary font-label-sm text-label-sm">🟢 {l.open.label}</span>}
          {l.open.status === 'closed' && <span className="px-2.5 py-1 rounded-full bg-error-container/40 text-error font-label-sm text-label-sm">🔴 {l.open.label}</span>}
          {l.badges.map((b) => (
            <span key={b} className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
              {BADGE_EMOJI[b] ? `${BADGE_EMOJI[b]} ` : ''}
              {badgeLabel(b)}
            </span>
          ))}
        </div>
      )}

      {reason && (
        <div className="p-2.5 rounded-2xl bg-surface-container-low flex items-start gap-2 text-on-surface-variant">
          <span className="text-base leading-none">💡</span>
          <p className="font-body-sm text-body-sm leading-snug">
            <strong className="text-on-surface">Nega shu?</strong> {reason}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-space-sm pt-1">
        <button type="button" onClick={open} className="h-11 rounded-full bg-tertiary-fixed-dim text-on-tertiary-fixed flex items-center justify-center gap-1.5 font-label-lg text-label-lg shadow-sm hover:opacity-95 active:scale-95 transition-all">
          <span className="material-symbols-outlined text-[18px]">call</span>
          <span>Qo‘ng‘iroq</span>
        </button>
        <button type="button" onClick={open} className="h-11 rounded-full bg-primary-fixed text-on-primary-fixed font-label-lg text-label-lg flex items-center justify-center hover:bg-primary-fixed-dim active:scale-95 transition-all">
          Batafsil
        </button>
      </div>
    </article>
  );
};
