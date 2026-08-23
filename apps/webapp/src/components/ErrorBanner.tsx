import React from 'react';

export interface ErrorBannerProps {
  message: string;
  type?: 'warning' | 'error';
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  type = 'warning',
  onRetry,
}) => {
  if (type === 'warning') {
    return (
      <div className="bg-[#FFF8E1] dark:bg-amber-950/40 text-[#F57F17] dark:text-amber-300 px-4 py-2.5 flex items-center gap-2.5 border-b border-[#FFE082] dark:border-amber-800/50 text-xs">
        <span className="material-symbols-outlined text-[18px]">wifi_off</span>
        <span className="font-medium flex-1">{message}</span>
      </div>
    );
  }

  return (
    <div className="bg-ios-red/15 dark:bg-red-950/50 text-ios-red dark:text-red-300 px-4 py-2.5 flex items-center gap-2.5 border-b border-ios-red/20 dark:border-red-900/50 text-xs rounded-btn">
      <span className="material-symbols-outlined text-[18px]">error</span>
      <span className="font-medium flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-ios-red dark:text-red-400 font-bold uppercase tracking-wider text-[11px] hover:underline"
        >
          Qayta
        </button>
      )}
    </div>
  );
};
