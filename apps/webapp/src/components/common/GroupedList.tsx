import React from 'react';

export interface GroupedRowItem {
  id: string;
  icon: string;
  iconBgColor?: string;
  title: string;
  subtitle?: string;
  badge?: string | number;
  badgeColor?: string;
  onClick?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

export interface GroupedListProps {
  header?: string;
  footer?: string;
  items: GroupedRowItem[];
}

export const GroupedList: React.FC<GroupedListProps> = ({ header, footer, items }) => {
  return (
    <div className="flex flex-col gap-1.5 my-3">
      {header && (
        <h3 className="px-4 text-[11px] font-semibold text-tg-textMuted uppercase tracking-wider">
          {header}
        </h3>
      )}

      <div className="bg-white dark:bg-[#16212F] rounded-card overflow-hidden shadow-card border border-ios-separator/50 dark:border-ios-darkSeparator/50">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={item.onClick}
            className={`ios-grouped-item flex items-center justify-between p-3.5 ${
              item.onClick ? 'cursor-pointer' : ''
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 pr-2">
              {/* Rangli ikonka kvadrat (iOS Settings Icon) */}
              <div
                className="w-8 h-8 rounded-icon flex items-center justify-center text-white shrink-0 shadow-sm"
                style={{ backgroundColor: item.iconBgColor || '#007AFF' }}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              </div>

              <div className="flex flex-col min-w-0">
                <span
                  className={`text-[14px] font-semibold truncate ${
                    item.danger ? 'text-ios-red' : 'text-tg-textLight dark:text-tg-textDark'
                  }`}
                >
                  {item.title}
                </span>
                {item.subtitle && (
                  <span className="text-[12px] text-tg-textMuted truncate">{item.subtitle}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {item.badge !== undefined && (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    item.badgeColor || 'bg-ios-separator dark:bg-slate-800 text-tg-textMuted'
                  }`}
                >
                  {item.badge}
                </span>
              )}
              {item.rightElement}
              {item.onClick && !item.rightElement && (
                <span className="material-symbols-outlined text-[18px] text-ios-gray">
                  chevron_right
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {footer && <p className="px-4 text-[11px] text-tg-textMuted mt-1">{footer}</p>}
    </div>
  );
};
