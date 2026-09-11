import React from 'react';

// Yulduzcha (reyting) o'rniga: admin kategoriya ichida eng ko'pi bilan 3 ta
// yozuvni "1/2/3-o'rin" deb belgilay oladi (kelajakda pullik "top
// joylashuv" xizmati uchun asos) — "Yana ko'rish" tugmasi shu tartibda
// birinchi bo'lib shu yozuvlarni ko'rsatadi.
const PRIORITY_BADGE: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export interface RecordRowProps {
  name: string;
  category: string;
  landmark?: string;
  phone?: string;
  priorityRank?: number | null;
  isVerified?: boolean;
  onEdit?: () => void;
  /** Berilsa, qator o'ngida 1/2/3 tugmalari chiqadi — bosilgan raqam shu
   * yozuvga biriktiriladi (kategoriyadagi boshqa yozuvdan avtomatik olinadi).
   * Xuddi shu raqam qayta bosilsa — belgi olib tashlanadi. */
  onSetPriority?: (rank: number | null) => void;
}

export const RecordRow: React.FC<RecordRowProps> = ({
  name,
  category,
  landmark,
  phone,
  priorityRank = null,
  isVerified = true,
  onEdit,
  onSetPriority,
}) => {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-outline-variant/20 dark:border-slate-800 last:border-0 hover:bg-surface-container-low/50 dark:hover:bg-slate-800/40 px-2 rounded-lg transition-colors">
      <div className="w-10 h-10 rounded-full bg-primary-container/15 dark:bg-sky-900/30 text-primary dark:text-sky-400 flex items-center justify-center font-bold text-sm shrink-0">
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
          {priorityRank && (
            <span className="text-xs font-bold flex items-center gap-0.5" title={`${priorityRank}-o'rin`}>
              {PRIORITY_BADGE[priorityRank]} {priorityRank}-o'rin
            </span>
          )}
        </div>
        <p className="text-xs text-on-surface-variant dark:text-slate-400 truncate">
          {category} {landmark ? `· 📍 ${landmark}` : ''} {phone ? `· 📞 ${phone}` : ''}
        </p>
      </div>
      {onSetPriority && (
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {[1, 2, 3].map((rank) => (
            <button
              key={rank}
              onClick={() => onSetPriority(priorityRank === rank ? null : rank)}
              title={priorityRank === rank ? `${rank}-o'rinni bekor qilish` : `${rank}-o'rin qilib belgilash`}
              className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center transition-all active:scale-90 ${
                priorityRank === rank
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {rank}
            </button>
          ))}
        </div>
      )}
      {onEdit && (
        <button
          onClick={onEdit}
          className="p-1.5 text-on-surface-variant hover:text-primary dark:text-slate-400 dark:hover:text-sky-400 rounded-full hover:bg-surface-container-high dark:hover:bg-slate-700 transition-colors shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
        </button>
      )}
    </div>
  );
};
