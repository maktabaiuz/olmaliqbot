import React from 'react';

export interface WorkRowCardProps {
  title: string;
  subtitle: string;
  statusBadge?: string;
  edgeColor?: 'blue' | 'amber' | 'red' | 'green';
  onClick?: () => void;
}

export const WorkRowCard: React.FC<WorkRowCardProps> = ({
  title,
  subtitle,
  statusBadge,
  edgeColor = 'blue',
  onClick,
}) => {
  const edgeColorMap = {
    blue: 'bg-primary-container',
    amber: 'bg-tertiary-container',
    red: 'bg-error',
    green: 'bg-emerald-500',
  };

  return (
    <div
      onClick={onClick}
      className="bg-surface dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-lg p-4 mb-3 flex items-center justify-between relative overflow-hidden shadow-sm hover:shadow transition-shadow cursor-pointer"
    >
      <div className={`absolute left-0 top-0 bottom-0 w-[6px] ${edgeColorMap[edgeColor]} rounded-l-lg`} />
      <div className="flex-1 ml-3 pr-2">
        <h4 className="font-semibold text-on-surface dark:text-slate-100 text-sm leading-snug">{title}</h4>
        <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-0.5">{subtitle}</p>
      </div>
      {statusBadge && (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-container-high dark:bg-slate-800 text-on-surface-variant dark:text-slate-300">
          {statusBadge}
        </span>
      )}
    </div>
  );
};
