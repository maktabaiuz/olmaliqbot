import React from 'react';

interface IosHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  trailing?: React.ReactNode;
}

/**
 * iOS Large Title header — bold 28px title, optional "‹ Orqaga" text back
 * link (not a circular icon button) and an optional trailing action
 * (button/icon) on the right, matching the confirmed Manzillar style.
 */
export const IosHeader: React.FC<IosHeaderProps> = ({ title, subtitle, onBack, backLabel = 'Orqaga', trailing }) => {
  return (
    <div className="flex flex-col gap-1 px-1">
      <div className="flex items-center justify-between">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-0.5 text-ios-blue text-[15px] font-normal active:opacity-50 transition-opacity -ml-1"
          >
            <span className="material-symbols-outlined text-[22px]">chevron_left</span>
            {backLabel}
          </button>
        ) : (
          <span />
        )}
        {trailing}
      </div>
      <h1 className="text-[28px] font-bold tracking-[-0.02em] text-ios-label">{title}</h1>
      {subtitle && <p className="text-[13px] text-ios-label-secondary/70 -mt-0.5">{subtitle}</p>}
    </div>
  );
};
