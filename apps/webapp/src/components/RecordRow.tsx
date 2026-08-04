import React from 'react';

export interface RecordRowProps {
  name: string;
  category: string;
  landmark?: string;
  phone?: string;
  rating?: number;
  isVerified?: boolean;
  onEdit?: () => void;
}

export const RecordRow: React.FC<RecordRowProps> = ({
  name,
  category,
  landmark,
  phone,
  rating = 4.5,
  isVerified = true,
  onEdit,
}) => {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-outline-variant/20 dark:border-slate-800 last:border-0 hover:bg-surface-container-low/50 dark:hover:bg-slate-800/40 px-2 rounded-lg transition-colors">
      <div className="w-10 h-10 rounded-full bg-primary-container/15 dark:bg-sky-900/30 text-primary dark:text-sky-400 flex items-center justify-center font-bold text-sm">
        {name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h4 className="font-semibold text-sm text-on-surface dark:text-slate-100 truncate">{name}</h4>
          {isVerified ? (
            <span className="text-emerald-500 text-xs font-bold" title="Tasdiqlangan">✅</span>
          ) : (
            <span className="text-amber-500 text-xs font-bold" title="Norasmiy">⚠️</span>
          )}
        </div>
        <p className="text-xs text-on-surface-variant dark:text-slate-400 truncate">
          {category} {landmark ? `· 📍 ${landmark}` : ''} {phone ? `· 📞 ${phone}` : ''}
        </p>
      </div>
      {rating && (
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
          ⭐ {rating.toFixed(1)}
        </span>
      )}
      {onEdit && (
        <button
          onClick={onEdit}
          className="p-1.5 text-on-surface-variant hover:text-primary dark:text-slate-400 dark:hover:text-sky-400 rounded-full hover:bg-surface-container-high dark:hover:bg-slate-700 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
        </button>
      )}
    </div>
  );
};
