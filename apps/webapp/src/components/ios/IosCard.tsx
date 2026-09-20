import React from 'react';

interface IosCardProps {
  children: React.ReactNode;
  className?: string;
}

/** Grouped inset list card — bg-ios-card, rounded-ios, subtle shadow. */
export const IosCard: React.FC<IosCardProps> = ({ children, className = '' }) => (
  <div className={`bg-ios-card rounded-ios shadow-sm overflow-hidden ${className}`}>{children}</div>
);

interface IosRowProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  last?: boolean;
}

/** One row inside an IosCard, with a real iOS hairline separator (not the last row). */
export const IosRow: React.FC<IosRowProps> = ({ children, onClick, className = '', last = false }) => (
  <div
    onClick={onClick}
    className={`flex items-center justify-between px-4 py-3 ${onClick ? 'active:bg-ios-fill/10 cursor-pointer' : ''} ${className}`}
    style={last ? undefined : { borderBottom: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}
  >
    {children}
  </div>
);

interface IosSectionProps {
  title?: string;
  footer?: string;
  children: React.ReactNode;
}

/** iOS Settings-style section: optional uppercase caption, grouped card, optional footer note. */
export const IosSection: React.FC<IosSectionProps> = ({ title, footer, children }) => (
  <section className="flex flex-col gap-1.5">
    {title && <h3 className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide px-4">{title}</h3>}
    <IosCard>{children}</IosCard>
    {footer && <p className="text-[13px] text-ios-label-secondary/70 px-4">{footer}</p>}
  </section>
);
