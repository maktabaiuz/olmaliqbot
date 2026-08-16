import React from 'react';

export interface AiInsightData {
  message: string;
  suggestedCategory?: string;
}

export interface AiInsightCardProps {
  insight: AiInsightData | null;
  onDismiss: () => void;
  onAddCategory: (category: string) => void;
}

export const AiInsightCard: React.FC<AiInsightCardProps> = ({
  insight,
  onDismiss,
  onAddCategory,
}) => {
  if (!insight || !insight.message) {
    return null;
  }

  return (
    <section className="bg-surface-container-low dark:bg-[#1C2733] rounded-[14px] p-4 flex flex-col gap-3 relative overflow-hidden border border-outline-variant/30 dark:border-slate-800/80 shadow-sm">
      <div className="flex gap-3 relative z-10">
        <div className="w-10 h-10 rounded-full bg-primary-container/20 text-primary dark:text-sky-400 flex items-center justify-center shrink-0">
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            smart_toy
          </span>
        </div>
        <div className="flex-1">
          <p className="text-body-main text-on-surface dark:text-slate-200 leading-snug">
            {insight.message}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 mt-1 relative z-10 ml-13">
        {insight.suggestedCategory && (
          <button
            type="button"
            onClick={() => onAddCategory(insight.suggestedCategory!)}
            className="bg-primary dark:bg-sky-500 text-on-primary text-body-secondary font-semibold px-4 py-2 rounded-[15px] hover:bg-primary/90 transition-colors shadow-sm active:scale-95"
          >
            {insight.suggestedCategory} qo'shish
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="border border-outline-variant/60 dark:border-slate-700 text-on-surface-variant dark:text-slate-400 text-body-secondary font-semibold px-4 py-2 rounded-[15px] hover:bg-surface-container-high dark:hover:bg-slate-800 transition-colors active:scale-95"
        >
          Keyinroq
        </button>
      </div>
    </section>
  );
};
