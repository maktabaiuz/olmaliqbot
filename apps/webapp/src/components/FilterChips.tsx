import React from 'react';

export interface FilterChipOption {
  id: string;
  label: string;
  count?: number;
}

export interface FilterChipsProps {
  options: FilterChipOption[];
  activeId: string;
  onSelect: (id: string) => void;
}

export const FilterChips: React.FC<FilterChipsProps> = ({ options, activeId, onSelect }) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-1">
      {options.map((opt) => {
        const isActive = opt.id === activeId;
        return (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              isActive
                ? 'bg-primary dark:bg-sky-500 text-on-primary shadow-sm'
                : 'bg-surface-container-high dark:bg-slate-800 text-on-surface-variant dark:text-slate-300 hover:bg-surface-container-highest dark:hover:bg-slate-700'
            }`}
          >
            {opt.label} {opt.count !== undefined && <span className="ml-1 opacity-75">({opt.count})</span>}
          </button>
        );
      })}
    </div>
  );
};
