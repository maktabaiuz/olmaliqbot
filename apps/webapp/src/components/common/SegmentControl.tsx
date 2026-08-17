export interface SegmentOption<T extends string> {
  id: T;
  label: string;
}

export interface SegmentControlProps<T extends string> {
  options: SegmentOption<T>[];
  selectedId: T;
  onChange: (id: T) => void;
}

export function SegmentControl<T extends string>({
  options,
  selectedId,
  onChange,
}: SegmentControlProps<T>) {
  return (
    <div className="bg-ios-separator/60 dark:bg-slate-800/80 p-1 rounded-xl flex items-center w-full relative">
      {options.map((opt) => {
        const isSelected = selectedId === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`flex-1 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-200 text-center ${
              isSelected
                ? 'bg-white dark:bg-[#1C2733] text-tg-textLight dark:text-tg-textDark shadow-sm'
                : 'text-tg-textMuted hover:text-tg-textLight dark:hover:text-tg-textDark'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
