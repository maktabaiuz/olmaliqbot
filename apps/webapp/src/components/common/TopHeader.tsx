import React from 'react';

export interface TopHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  onBackClick?: () => void;
  rightAction?: React.ReactNode;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  onBackClick,
  rightAction,
}) => {
  const handleBack = () => {
    if (onBack) onBack();
    else if (onBackClick) onBackClick();
  };

  return (
    <header className="pt-3 pb-2 px-4 flex items-center justify-between bg-transparent">
      <div className="flex items-center gap-2 min-w-0">
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            className="w-11 h-11 rounded-full flex items-center justify-center text-ios-blue hover:bg-ios-blue/10 active:bg-ios-blue/15 transition-colors -ml-2.5 shrink-0"
            title="Orqaga"
            aria-label="Orqaga"
          >
            <span className="material-symbols-outlined text-[26px]">chevron_left</span>
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-[24px] font-extrabold tracking-tight text-tg-textLight dark:text-tg-textDark truncate leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[12px] text-tg-textMuted truncate mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {rightAction && <div className="shrink-0 ml-2">{rightAction}</div>}
    </header>
  );
};
