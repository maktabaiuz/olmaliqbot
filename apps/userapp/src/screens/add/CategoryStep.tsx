import React, { useMemo, useState } from 'react';
import type { Category } from '../../lib/types';
import { haptic } from '../../lib/telegram';
import { CLAY_CARD, INPUT, INPUT_WRAP } from './parts';

export const CategoryStep: React.FC<{ categories: Category[]; value: string | null; onChange: (id: string) => void }> = ({ categories, value, onChange }) => {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? categories.filter((c) => c.name.toLowerCase().includes(s)) : categories;
  }, [categories, q]);

  return (
    <div className="flex flex-col gap-4">
      <div className={`${INPUT_WRAP} bg-surface-container-lowest`}>
        <span className="material-symbols-outlined text-[20px] text-outline mr-2">search</span>
        <input className={INPUT} placeholder="Sohani qidiring: gaz, santexnik, dorixona…" value={q} onChange={(e) => setQ(e.target.value)} />
        {q && (
          <button aria-label="Tozalash" onClick={() => setQ('')} className="text-outline active:scale-90">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>
      <div className={`${CLAY_CARD} grid grid-cols-2 gap-2.5`}>
        {list.length === 0 && <p className="col-span-2 text-center font-body-sm text-body-sm text-on-surface-variant py-4">Hech narsa topilmadi</p>}
        {list.map((c, i) => {
          const on = value === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                haptic('select');
                onChange(c.id);
              }}
              style={{ animationDelay: `${Math.min(i, 14) * 25}ms` }}
              className={`anim-slide-up flex items-center gap-2 p-3 rounded-2xl text-left active:scale-95 transition-all ${
                on ? 'bg-primary text-on-primary shadow-[0_6px_16px_-2px_rgba(108,92,231,0.4)]' : 'bg-surface-container-low text-on-surface'
              }`}
            >
              <span className="text-xl leading-none">{c.emoji || '📌'}</span>
              <span className="font-label-md text-label-md leading-tight line-clamp-2 flex-1">{c.name}</span>
              {on && <span className="material-symbols-outlined fill text-[18px]">check_circle</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};
