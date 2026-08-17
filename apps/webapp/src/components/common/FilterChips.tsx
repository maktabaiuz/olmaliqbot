export interface FilterChipOption<T extends string> {
  id: T;
  label: string;
}

export interface FilterChipsProps<T extends string> {
  chips: FilterChipOption<T>[];
  selectedId: T;
  onChange: (id: T) => void;
}

export function FilterChips<T extends string>({
  chips,
  selectedId,
  onChange,
}: FilterChipsProps<T>) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
      {chips.map((chip) => {
        const isActive = selectedId === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onChange(chip.id)}
            className={`px-3 py-1.5 rounded-pill text-[12px] font-semibold whitespace-nowrap transition-all ${
              isActive
                ? 'bg-tg-blue text-white shadow-sm font-bold'
                : 'bg-white dark:bg-[#16212F] text-tg-textMuted border border-ios-separator dark:border-ios-darkSeparator hover:text-tg-textLight dark:hover:text-tg-textDark'
            }`}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
