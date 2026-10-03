import React, { useEffect, useState } from 'react';
import { BottomSheet } from '../rentals/shared';

const CHIPS = [
  'Rasm uyga tegishli emas',
  "Narx noto'g'ri ko'rinadi",
  'Telefon raqam ishlamaydi',
  "Ma'lumot to'liq emas",
  'Takroriy e\'lon',
];

interface Props {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export const RejectSheet: React.FC<Props> = ({ open, busy, onClose, onSubmit }) => {
  const [text, setText] = useState('');
  useEffect(() => {
    if (open) setText('');
  }, [open]);

  const addChip = (c: string) => setText((prev) => (prev.includes(c) ? prev : prev.trim() ? `${prev.trim()}. ${c}` : c));

  return (
    <BottomSheet open={open} onClose={onClose} title="Rad etish sababi">
      <div className="flex flex-wrap gap-2 mb-3">
        {CHIPS.map((c) => (
          <button
            key={c}
            onClick={() => addChip(c)}
            className={`px-3 py-1.5 rounded-full text-[13px] font-medium ${
              text.includes(c) ? 'bg-ios-red text-white' : 'bg-ios-card text-ios-label'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="Sababni yozing…"
        className="w-full rounded-ios bg-ios-card p-3 text-[15px] text-ios-label outline-none"
      />
      <p className="text-[12px] text-ios-label-secondary/70 mt-1.5 px-1">
        Egasiga muloyim xabar boradi va e'lonni tahrirlab qayta yuborish so'raladi
      </p>
      <button
        disabled={busy || !text.trim()}
        onClick={() => onSubmit(text.trim())}
        className="w-full mt-4 py-3 rounded-ios bg-ios-red text-white text-[16px] font-semibold disabled:opacity-50"
      >
        {busy ? 'Yuborilmoqda…' : 'Rad etish'}
      </button>
    </BottomSheet>
  );
};
