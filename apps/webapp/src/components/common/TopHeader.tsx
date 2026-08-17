import React from 'react';
import { useNavigate } from 'react-router-dom';

export interface TopHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBackClick?: () => void;
  rightAction?: React.ReactNode;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBackClick,
  rightAction,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBackClick) onBackClick();
    else navigate(-1);
  };

  return (
    <header className="pt-3 pb-2 px-4 flex items-center justify-between bg-transparent">
      <div className="flex items-center gap-2 min-w-0">
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            className="w-8 h-8 rounded-full flex items-center justify-center text-ios-blue active:bg-ios-blue/10 transition-colors -ml-1.5 shrink-0"
            title="Orqaga"
          >
            <span className="material-symbols-outlined text-[24px]">chevron_left</span>
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
