import React from 'react';
import type { Category } from '../../lib/types';
import { TYPE_META } from '../../lib/format';

/** Stitch: qidiruv_klaviatura_va_avtoto_ldirish (klaviaturasiz — tizimniki ishlatiladi). */
export const FocusView: React.FC<{
  text: string;
  categories: Category[];
  recent: string[];
  popular: string[];
  onPick: (q: string) => void;
  onRemoveRecent: (q: string) => void;
  onClearRecent: () => void;
}> = ({ text, categories, recent, popular, onPick, onRemoveRecent, onClearRecent }) => {
  const t = text.trim().toLowerCase();
  const matches = t ? categories.filter((c) => c.name.toLowerCase().includes(t)).sort((a, b) => b.count - a.count).slice(0, 6) : [];

  return (
    <div className="flex flex-col px-margin pb-6 gap-space-lg">
      {matches.length > 0 && (
        <div className="flex flex-col bg-surface-container-lowest rounded-lg p-space-md shadow-md gap-space-xs anim-slide-up">
          <div className="flex items-center justify-between pb-1 px-1">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[18px]">saved_search</span>
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Tavsiya etilgan qidiruvlar</span>
            </div>
            <span className="font-label-sm text-label-sm text-primary bg-primary-fixed px-2 py-0.5 rounded-full font-bold">Olmaliq</span>
          </div>
          {matches.map((c) => {
            const i = c.name.toLowerCase().indexOf(t);
            return (
              <div key={c.id} onClick={() => onPick(c.name)} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-container-low active:bg-surface-container active:scale-95 transition-all cursor-pointer group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-secondary-container/30 flex items-center justify-center flex-shrink-0 shadow-sm text-secondary text-xl">
                    {c.emoji || <span className="material-symbols-outlined text-[22px]">{TYPE_META[c.objectType || '']?.icon || 'build'}</span>}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-baseline min-w-0 truncate">
                      <span className="font-headline-sm text-headline-sm text-on-surface">{c.name.slice(0, i)}</span>
                      <span className="font-headline-sm text-headline-sm text-primary font-extrabold">{c.name.slice(i, i + t.length)}</span>
                      <span className="font-headline-sm text-headline-sm text-on-surface">{c.name.slice(i + t.length)}</span>
                    </div>
                    {c.group && <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{c.group}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 pl-2">
                  <span className="font-label-sm text-label-sm bg-surface-container-high text-on-surface-variant px-2 py-1 rounded-full font-bold">{c.count} ta</span>
                  <span className="material-symbols-outlined text-outline-variant text-[18px]">chevron_right</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {recent.length > 0 && (
        <div className="flex flex-col gap-space-sm">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">history</span>
              <span className="font-headline-sm text-headline-sm text-on-surface">Oxirgi qidiruvlar</span>
            </div>
            <button onClick={onClearRecent} className="font-label-md text-label-md text-primary hover:underline active:scale-95" type="button">
              Tarixni tozalash
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map((q) => (
              <div key={q} onClick={() => onPick(q)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-lowest text-on-surface shadow-sm active:scale-95 transition-transform cursor-pointer">
                <span className="material-symbols-outlined text-outline text-[16px]">schedule</span>
                <span className="font-body-md text-body-md">{q}</span>
                <button
                  aria-label="O'chirish"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveRecent(q);
                  }}
                  className="text-outline-variant hover:text-on-surface ml-0.5"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {popular.length > 0 && (
        <div className="flex flex-col gap-space-sm">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined fill text-secondary-container text-[20px]">local_fire_department</span>
              <span className="font-headline-sm text-headline-sm text-on-surface">Olmaliqda mashhur</span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Hozirgi talab</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {popular.map((q) => (
              <button key={q} onClick={() => onPick(q)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-container-lowest text-on-surface shadow-sm active:scale-95 transition-transform" type="button">
                <span className="text-base">🔥</span>
                <span className="font-body-md text-body-md font-bold">{q}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
