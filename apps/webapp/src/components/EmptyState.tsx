import React from 'react';

export interface EmptyStateProps {
  title: string;
  subtitle: string;
  iconName?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  subtitle,
  iconName = 'inbox',
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 my-6 bg-surface dark:bg-[#17212B] rounded-xl border border-outline-variant/20 dark:border-slate-800">
      <div className="w-20 h-20 mb-5 rounded-full bg-surface-container-high dark:bg-slate-800 flex items-center justify-center">
        <span className="material-symbols-outlined text-[40px] text-outline-variant dark:text-slate-400">
          {iconName}
        </span>
      </div>
      <h3 className="font-bold text-base text-on-surface dark:text-slate-100 mb-1">{title}</h3>
      <p className="text-xs text-on-surface-variant dark:text-slate-400 mb-6 max-w-[280px] leading-relaxed">
        {subtitle}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="bg-primary dark:bg-sky-500 text-on-primary font-semibold text-xs px-5 py-2.5 rounded-full hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          {actionText}
        </button>
      )}
    </div>
  );
};
