import React from 'react';
import { avatarColorForName } from '../utils/avatarColor';

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
    <div className="flex items-center gap-3 py-3 px-2 rounded-ios border-b-[0.5px] border-ios-separator/[0.29] last:border-b-0 active:bg-ios-fill/10 transition-colors">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-[14px] text-white shrink-0"
        style={{ backgroundColor: avatarColorForName(name || '?') }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h4 className="font-semibold text-[14px] text-ios-label truncate">{name}</h4>
          {isVerified ? (
            <span className="text-ios-green text-[12px] font-bold" title="Tasdiqlangan">✅</span>
          ) : (
            <span className="text-ios-orange text-[12px] font-bold" title="Norasmiy">⚠️</span>
          )}
          {priorityRank && (
            <span className="text-[12px] font-bold flex items-center gap-0.5" title={`${priorityRank}-o'rin`}>
              {PRIORITY_BADGE[priorityRank]} {priorityRank}-o'rin
            </span>
          )}
        </div>
        <p className="text-[12px] text-ios-label-secondary/70 truncate">
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
                  ? 'bg-ios-green text-white shadow-sm'
                  : 'bg-ios-fill/[0.12] text-ios-label-secondary/70'
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
          className="p-1.5 text-ios-label-secondary/70 active:text-ios-blue rounded-full transition-colors shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
        </button>
      )}
    </div>
  );
};
