import React, { useMemo, useState } from 'react';
import { BottomSheet } from './shared';

export interface LandmarkLite {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  items: LandmarkLite[];
  selectedId: string | null;
  onClose: () => void;
  onPick: (id: string) => void;
}

export const MahallaPicker: React.FC<Props> = ({ open, items, selectedId, onClose, onPick }) => {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
    return s ? sorted.filter((i) => i.name.toLowerCase().includes(s)) : sorted;
  }, [items, q]);

  return (
    <BottomSheet open={open} onClose={onClose} title="Mahallani tanlang">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Qidirish…"
        className="w-full rounded-[10px] bg-ios-fill/15 px-3 py-2 text-[15px] text-ios-label outline-none mb-3"
      />
      <div className="bg-ios-card rounded-ios overflow-hidden">
        {list.length === 0 && <p className="p-4 text-[15px] text-ios-label-secondary">Topilmadi</p>}
        {list.map((i, idx) => (
          <button
            key={i.id}
            onClick={() => {
              onPick(i.id);
              onClose();
            }}
            className="w-full flex items-center justify-between px-4 py-3 text-left text-[15px] text-ios-label active:bg-ios-fill/10"
            style={idx === list.length - 1 ? undefined : { borderBottom: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}
          >
            {i.name}
            {i.id === selectedId && <span className="material-symbols-outlined text-[18px] text-ios-blue">check</span>}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
};
