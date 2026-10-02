import React, { useState } from 'react';
import type { Landmark } from '../../lib/types';
import { haptic } from '../../lib/telegram';
import { Sheet } from '../../components/ui';

export const MAHALLA_KEY = 'kimbor_mahalla';

export function readMahalla(): string | null {
  try {
    return localStorage.getItem(MAHALLA_KEY);
  } catch {
    return null;
  }
}

export function saveMahalla(id: string) {
  try {
    localStorage.setItem(MAHALLA_KEY, id);
  } catch {
    /* saqlab bo'lmadi */
  }
}

/** "Butun shahar" kabi umumiy yozuvlarsiz mahallalar. */
export const realAreas = (l: Landmark[] | undefined) => (l || []).filter((x) => !x.name.toLowerCase().includes('butun shahar'));

export const MahallaSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  landmarks: Landmark[];
  value: string | null;
  onPick: (id: string) => void;
  title?: string;
}> = ({ open, onClose, landmarks, value, onPick, title = 'Mahallani tanlang' }) => {
  const [q, setQ] = useState('');
  const s = q.trim().toLowerCase();
  const list = s ? landmarks.filter((l) => l.name.toLowerCase().includes(s)) : landmarks;
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="px-margin pb-6">
        <h3 className="font-headline-sm text-headline-sm text-on-surface mb-3">{title}</h3>
        <div className="flex items-center bg-surface-container-low rounded-full px-4 py-2.5 mb-3">
          <span className="material-symbols-outlined text-[20px] text-outline mr-2">search</span>
          <input
            className="w-full bg-transparent border-0 outline-none focus:ring-0 p-0 font-body-md text-body-md text-on-surface placeholder:text-outline"
            placeholder="Qidirish…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          {list.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                haptic('select');
                onPick(l.id);
                onClose();
              }}
              className={`flex items-center justify-between px-4 py-3 rounded-2xl text-left active:scale-[0.98] transition-all ${
                value === l.id ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container-low text-on-surface'
              }`}
            >
              <span className="flex items-center gap-2 font-label-lg text-label-lg">
                <span className="material-symbols-outlined text-[18px] text-primary">location_on</span>
                {l.name}
              </span>
              {value === l.id && <span className="material-symbols-outlined fill text-primary text-[20px]">check_circle</span>}
            </button>
          ))}
          {list.length === 0 && <p className="text-center font-body-sm text-body-sm text-on-surface-variant py-6">Topilmadi</p>}
        </div>
      </div>
    </Sheet>
  );
};
