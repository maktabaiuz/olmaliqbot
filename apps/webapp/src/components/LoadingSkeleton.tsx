import React from 'react';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-3 p-4">
      {/* Skeleton Card 1 */}
      <div className="bg-surface dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-lg p-4 flex gap-4 relative overflow-hidden animate-pulse">
        <div className="w-[6px] bg-slate-300 dark:bg-slate-700 absolute left-0 top-0 bottom-0 rounded-l-lg" />
        <div className="flex-1 ml-2 space-y-2">
          <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-3/4" />
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
        </div>
        <div className="h-5 w-14 bg-slate-300 dark:bg-slate-700 rounded-full" />
      </div>

      {/* Skeleton Card 2 */}
      <div className="bg-surface dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-lg p-4 flex gap-4 relative overflow-hidden animate-pulse">
        <div className="w-[6px] bg-slate-300 dark:bg-slate-700 absolute left-0 top-0 bottom-0 rounded-l-lg" />
        <div className="flex-1 ml-2 space-y-2">
          <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-2/3" />
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
        </div>
        <div className="h-5 w-14 bg-slate-300 dark:bg-slate-700 rounded-full" />
      </div>

      {/* Skeleton Record Rows */}
      {[1, 2, 3].map((idx) => (
        <div key={idx} className="flex items-center gap-4 py-3 border-b border-outline-variant/20 dark:border-slate-800 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-700" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-1/2" />
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
          </div>
          <div className="h-4 w-10 bg-slate-300 dark:bg-slate-700 rounded" />
        </div>
      ))}
    </div>
  );
};
