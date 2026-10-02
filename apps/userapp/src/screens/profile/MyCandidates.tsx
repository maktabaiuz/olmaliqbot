import React from 'react';
import { navigate } from '../../lib/router';
import { haptic } from '../../lib/telegram';
import { Skeleton } from '../../components/ui';

type Item = { id: string; name: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; createdAt: string; category: { name: string; emoji: string | null } | null };

const PILL: Record<Item['status'], { cls: string; icon: string; label: string; tint: string }> = {
  PENDING: { cls: 'bg-secondary-fixed-dim/40 text-on-secondary-container', icon: 'hourglass_top', label: 'Kutilmoqda', tint: 'bg-secondary-fixed text-on-secondary-fixed' },
  APPROVED: { cls: 'bg-tertiary-container text-on-tertiary shadow-[0_2px_8px_rgba(0,129,106,0.3)]', icon: 'check_circle', label: "Qo'shildi", tint: 'bg-tertiary-fixed text-on-tertiary-fixed' },
  REJECTED: { cls: 'bg-error-container text-on-error-container', icon: 'cancel', label: 'Rad etildi', tint: 'bg-error-container text-on-error-container' },
};

function when(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  const hm = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `Bugun, ${hm}`;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export const MyCandidates: React.FC<{ items: Item[] | undefined; failed: boolean }> = ({ items, failed }) => (
  <div className="flex flex-col gap-space-md">
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-2">
        <h3 className="font-headline-sm text-headline-sm text-on-surface">Mening qo'shganlarim</h3>
        {items && (
          <span className="min-w-6 h-6 px-1.5 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm flex items-center justify-center shadow-sm">{items.length}</span>
        )}
      </div>
      <button
        onClick={() => {
          haptic('light');
          navigate('/add');
        }}
        className="px-3.5 py-1.5 rounded-full bg-primary-container text-on-primary font-label-md text-label-md flex items-center gap-1 shadow-[0_4px_12px_rgba(108,92,231,0.3)] active:scale-95 transition-transform"
      >
        <span className="material-symbols-outlined text-[16px]">add</span>
        <span>Qo'shish</span>
      </button>
    </div>
    <div className="flex flex-col gap-space-sm">
      {failed && !items && <p className="font-body-sm text-body-sm text-on-surface-variant px-1">Ro'yxatni yuklab bo'lmadi.</p>}
      {!items && !failed && (
        <>
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </>
      )}
      {items && items.length === 0 && (
        <p className="font-body-sm text-body-sm text-on-surface-variant px-1">Siz hali hech narsa qo'shmagansiz. Tanish ustangizni qo'shing — boshqalarga yordam bo'ladi.</p>
      )}
      {items?.map((c, i) => {
        const p = PILL[c.status];
        return (
          <div
            key={c.id}
            className="bg-surface-container-lowest rounded-DEFAULT p-space-md shadow-[0_4px_16px_rgba(108,92,231,0.06),inset_1px_1px_2px_rgba(255,255,255,0.8)] flex items-center justify-between gap-2 anim-slide-up"
            style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-9 h-9 rounded-full ${p.tint} flex items-center justify-center flex-shrink-0 shadow-sm text-[18px]`}>
                {c.category?.emoji || <span className="material-symbols-outlined text-[20px]">storefront</span>}
              </div>
              <div className="min-w-0">
                <h4 className="font-label-lg text-label-lg text-on-surface truncate">{c.name}</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 mt-0.5 truncate">
                  <span className="material-symbols-outlined text-[13px]">schedule</span>
                  {when(c.createdAt)}
                  {c.category && <> · {c.category.name}</>}
                </p>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full ${p.cls} font-label-sm text-label-sm flex items-center gap-1 flex-shrink-0`}>
              <span className="material-symbols-outlined text-[13px]">{p.icon}</span>
              {p.label}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);
