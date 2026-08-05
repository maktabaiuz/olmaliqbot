import React from 'react';

export interface GridOption {
  id: string;
  label: string;
  flag?: string;
  sublabel?: string;
}

export interface ColoredGridSelectorProps {
  title?: string;
  topRowOptions?: GridOption[];
  bottomRowOptions?: GridOption[];
  onSelect?: (option: GridOption) => void;
  selectedId?: string;
}

export const ColoredGridSelector: React.FC<ColoredGridSelectorProps> = ({
  title,
  topRowOptions = [
    { id: 'uz', label: "O'zbekcha", flag: '🇺🇿' },
    { id: 'kz', label: 'Қазақша', flag: '🇰🇿' },
  ],
  bottomRowOptions = [
    { id: 'tj', label: 'Тоҷикӣ', flag: '🇹🇯' },
    { id: 'kg', label: 'Кыргызча', flag: '🇰🇬' },
  ],
  onSelect,
  selectedId,
}) => {
  return (
    <div className="w-full space-y-2 font-sans">
      {title && (
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
          {title}
        </h3>
      )}

      {/* Styled Card Outer Frame matching exact screenshot */}
      <div className="w-full bg-[#0F172A] border-2 border-slate-900 rounded-[28px] p-1.5 shadow-2xl overflow-hidden">
        <div className="grid grid-cols-2 gap-1 rounded-[22px] overflow-hidden border border-slate-950">
          {/* Top Row: Vibrant Blue (#2AABEE / #38BDF8) */}
          {topRowOptions.map((opt) => {
            const isSelected = selectedId === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => onSelect && onSelect(opt)}
                className={`py-4 px-3 flex items-center justify-center gap-2.5 font-bold text-sm text-white transition-all active:scale-[0.98] ${
                  isSelected ? 'brightness-125 ring-2 ring-white z-10' : ''
                }`}
                style={{ backgroundColor: '#2AABEE' }}
              >
                {opt.flag && <span className="text-lg leading-none">{opt.flag}</span>}
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}

          {/* Bottom Row: Vibrant Green (#10B981 / #22C55E) */}
          {bottomRowOptions.map((opt) => {
            const isSelected = selectedId === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => onSelect && onSelect(opt)}
                className={`py-4 px-3 flex items-center justify-center gap-2.5 font-bold text-sm text-white transition-all active:scale-[0.98] ${
                  isSelected ? 'brightness-125 ring-2 ring-white z-10' : ''
                }`}
                style={{ backgroundColor: '#10B981' }}
              >
                {opt.flag && <span className="text-lg leading-none">{opt.flag}</span>}
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
