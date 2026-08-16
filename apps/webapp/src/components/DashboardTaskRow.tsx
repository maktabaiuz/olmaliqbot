import React from 'react';

export interface DashboardTaskRowProps {
  title: string;
  subtitle: string;
  count: number;
  type: 'urgent' | 'later';
  onClick: () => void;
}

export const DashboardTaskRow: React.FC<DashboardTaskRowProps> = ({
  title,
  subtitle,
  count,
  type,
  onClick,
}) => {
  if (count <= 0) return null;

  const isUrgent = type === 'urgent';
  const barColorClass = isUrgent ? 'bg-error' : 'bg-outline-variant';
  const badgeBgClass = isUrgent ? 'bg-error text-on-error' : 'bg-surface-high text-on-surface-variant dark:bg-slate-800 dark:text-slate-300';

  return (
    <div
      onClick={onClick}
      className="relative flex items-center justify-between p-3.5 bg-surface-container-low dark:bg-[#1C2733] rounded-[14px] border border-outline-variant/30 dark:border-slate-800/80 hover:bg-surface-container-high dark:hover:bg-slate-800/60 transition-all cursor-pointer overflow-hidden shadow-sm active:scale-98"
    >
      {/* 6px Left Accent Bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-[6px] ${barColorClass}`} />

      <div className="pl-3 flex-1">
        <h4 className="text-body-main font-bold text-on-surface dark:text-slate-100">
          {title}
        </h4>
        <p className="text-body-secondary text-outline dark:text-slate-400">
          {subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-caption font-bold px-2.5 py-1 rounded-full ${badgeBgClass}`}>
          {count}
        </span>
        <span className="material-symbols-outlined text-[20px] text-outline">
          chevron_right
        </span>
      </div>
    </div>
  );
};
