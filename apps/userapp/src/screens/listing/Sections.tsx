import React from 'react';
import { badgeLabel, recommendPercent } from '../../lib/format';
import { haptic, openUrl } from '../../lib/telegram';
import type { Listing, Review } from '../../lib/types';
import { locationUrl, relativeDate, splitServices } from './helpers';

const card = 'bg-surface-container-lowest rounded-lg p-space-lg shadow-sm flex flex-col anim-slide-up';
const delay = (i: number): React.CSSProperties => ({ animationDelay: `${i * 60}ms` });

export const HoursCard: React.FC<{ l: Listing; i: number }> = ({ l, i }) =>
  !l.workFrom && l.open.status === 'unknown' ? null : (
    <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex items-center justify-between anim-slide-up" style={delay(i)}>
      <div className="flex items-center gap-space-md">
        <div className="w-10 h-10 rounded-full bg-tertiary-fixed/40 flex items-center justify-center text-tertiary">
          <span className="material-symbols-outlined text-[20px]">schedule</span>
        </div>
        <div className="flex items-center gap-1.5">
          {l.open.status !== 'unknown' && (
            <>
              <span className={`h-2 w-2 rounded-full ${l.open.status === 'open' ? 'bg-tertiary animate-pulse' : 'bg-error'}`} />
              <span className={`font-label-md text-label-md ${l.open.status === 'open' ? 'text-tertiary' : 'text-error'}`}>{l.open.label}</span>
            </>
          )}
          {l.workFrom && l.workTo && (
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              ({l.workFrom} – {l.workTo})
            </span>
          )}
        </div>
      </div>
    </div>
  );

export const BadgeChips: React.FC<{ l: Listing; i: number }> = ({ l, i }) =>
  l.badges.length === 0 ? null : (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-margin px-margin anim-slide-up" style={delay(i)}>
      {l.badges.map((b) => (
        <div key={b} className="bg-surface-container-low px-3.5 py-2 rounded-full flex items-center gap-1.5 shrink-0 shadow-sm">
          <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
          <span className="font-label-sm text-label-sm text-on-surface">{badgeLabel(b)}</span>
        </div>
      ))}
    </div>
  );

export const LocationCard: React.FC<{ l: Listing; i: number }> = ({ l, i }) => {
  const url = locationUrl(l);
  if (!l.landmark && !url) return null;
  return (
    <div className={`${card} gap-space-md`} style={delay(i)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">pin_drop</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Manzil va Mo'ljal</h3>
        </div>
        {url && (
          <button
            className="font-label-md text-label-md text-primary flex items-center gap-0.5 active:scale-95"
            onClick={() => {
              haptic('light');
              openUrl(url);
            }}
          >
            Ochish <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        )}
      </div>
      {l.landmark && (
        <span className="font-body-md text-body-md text-on-surface flex items-center gap-1">
          <span className="material-symbols-outlined text-[18px] text-secondary">storefront</span>
          {l.landmark.name}
        </span>
      )}
    </div>
  );
};

export const AreasCard: React.FC<{ l: Listing; i: number }> = ({ l, i }) =>
  l.serviceAreas.length === 0 ? null : (
    <div className={`${card} gap-space-sm`} style={delay(i)}>
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-secondary text-[20px]">explore</span>
        <h3 className="font-headline-sm text-headline-sm text-on-surface">Qamrov hududlari</h3>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        {l.serviceAreas.map((a) => (
          <span key={a.id} className="bg-surface-container px-3 py-1.5 rounded-full font-label-md text-label-md text-on-surface">
            {a.name}
          </span>
        ))}
      </div>
    </div>
  );

export const ServicesCard: React.FC<{ l: Listing; i: number }> = ({ l, i }) => {
  const items = splitServices(l.services);
  if (items.length === 0 && !l.price) return null;
  return (
    <div className={`${card} gap-space-md`} style={delay(i)}>
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
        <h3 className="font-headline-sm text-headline-sm text-on-surface">Xizmatlar va narxlar</h3>
      </div>
      <div className="flex flex-col gap-space-sm">
        {items.map((s) => (
          <div key={s} className="flex items-center p-space-sm rounded-DEFAULT bg-surface-container-low">
            <span className="font-body-md text-body-md text-on-surface font-semibold">{s}</span>
          </div>
        ))}
        {l.price && (
          <div className="flex items-center justify-between p-space-sm rounded-DEFAULT bg-tertiary-fixed/20">
            <span className="font-body-md text-body-md text-on-surface font-semibold">Narx</span>
            <span className="font-label-lg text-label-lg text-primary shrink-0">{l.price}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const DescriptionCard: React.FC<{ l: Listing; i: number; title?: string }> = ({ l, i, title = "Ma'lumot" }) =>
  !l.description ? null : (
    <div className={`${card} gap-space-sm`} style={delay(i)}>
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[20px]">description</span>
        <h3 className="font-headline-sm text-headline-sm text-on-surface">{title}</h3>
      </div>
      <p className="font-body-md text-body-md text-on-surface-variant whitespace-pre-line">{l.description}</p>
    </div>
  );

export const ReviewsCard: React.FC<{ l: Listing; reviews: Review[]; canReview: boolean; onReview: () => void; i: number }> = ({ l, reviews, canReview, onReview, i }) => {
  const pct = recommendPercent(l);
  const total = l.rating.up + l.rating.down;
  return (
    <div className={`${card} gap-space-md`} style={delay(i)}>
      <div className="flex items-center justify-between">
        <h3 className="font-headline-sm text-headline-sm text-on-surface">Mahalladoshlar fikri</h3>
        {reviews.length > 0 && (
          <span className="font-label-md text-label-md text-on-secondary-container bg-secondary-fixed/50 px-2 py-0.5 rounded-full font-bold">{reviews.length} ta sharh</span>
        )}
      </div>
      <div className="flex items-center gap-space-lg p-space-md rounded-DEFAULT bg-surface-container-low">
        {pct !== null ? (
          <>
            <span className="font-headline-xl text-headline-xl text-primary font-extrabold leading-none shrink-0">{pct}%</span>
            <div className="flex flex-col justify-center gap-1 border-l border-surface-variant pl-space-md">
              <span className="font-label-md text-label-md text-on-surface">
                👍 {pct}% tavsiya qiladi ({total})
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                👍 {l.rating.up} · 👎 {l.rating.down}
              </span>
            </div>
          </>
        ) : (
          <span className="font-label-md text-label-md text-on-surface-variant">Hali baholanmagan</span>
        )}
      </div>
      <button
        disabled={!canReview}
        onClick={onReview}
        className="w-full py-3 px-4 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center gap-2 font-label-md text-label-md shadow-sm active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
        type="button"
      >
        <span className="material-symbols-outlined text-[18px]">rate_review</span>
        Fikr bildirish yoki baholash
      </button>
      {!canReview && <p className="-mt-2 text-center font-body-sm text-body-sm text-on-surface-variant">Bog'langaningizdan keyin baholay olasiz</p>}
      {reviews.map((r, k) => (
        <div key={k} className="flex flex-col gap-2 p-space-md rounded-DEFAULT bg-surface-container-lowest shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[16px] ${r.isPositive ? 'bg-tertiary-fixed/60' : 'bg-error-container'}`}>
                {r.isPositive ? '👍' : '👎'}
              </div>
              <span className="font-label-md text-label-md text-on-surface">{r.isPositive ? 'Tavsiya qiladi' : 'Tavsiya qilmaydi'}</span>
            </div>
            <span className="font-body-sm text-[11px] text-on-surface-variant">{relativeDate(r.createdAt)}</span>
          </div>
          {r.comment && <p className="font-body-md text-body-md text-on-surface-variant">{r.comment}</p>}
        </div>
      ))}
    </div>
  );
};
