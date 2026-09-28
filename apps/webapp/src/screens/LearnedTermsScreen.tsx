import React, { useEffect, useState } from 'react';
import { apiFetch } from '../config';
import { IosHeader } from '../components/ios/IosHeader';
import { IosCard } from '../components/ios/IosCard';

export interface LearnedTermsScreenProps {
  onBack: () => void;
}

interface LearnedTerm {
  term: string;
  occurrenceCount: number;
  sampleMessage: string;
  suggestedCategoryName: string | null;
  suggestedCategoryId: string | null;
  suggestedLandmarkName: string | null;
  suggestedLandmarkId: string | null;
}

/**
 * "Mahalliy so'zlar lug'ati" (2026-09-28) — foydalanuvchi so'radi: bot
 * guruhlardagi HAQIQIY so'zlarni/jargonni doimiy o'qib, o'rganib borsin,
 * va bu o'rgangan so'zlar keyinchalik yangi kategoriya/manzil qo'shishda
 * ishlatilsin. Bu ekran — o'rganilgan (lekin hali lug'atda yo'q) nomzod
 * so'zlarni ko'rsatib, admin bir bosishda "Qo'shish" yoki "Rad etish"
 * qarorini qabul qilishi uchun.
 */
export const LearnedTermsScreen: React.FC<LearnedTermsScreenProps> = ({ onBack }) => {
  const [terms, setTerms] = useState<LearnedTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyTerm, setBusyTerm] = useState<string | null>(null);

  const load = async (fresh = false) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/learned-terms${fresh ? '?fresh=true' : ''}`);
      if (res.ok) setTerms(await res.json());
    } catch (err) {
      console.error('Failed to load learned terms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const dismiss = async (term: string) => {
    setBusyTerm(term);
    try {
      await apiFetch('/api/admin/learned-terms/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term }),
      });
      setTerms((prev) => prev.filter((t) => t.term !== term));
    } finally {
      setBusyTerm(null);
    }
  };

  const accept = async (item: LearnedTerm, targetType: 'category' | 'landmark', targetId: string) => {
    setBusyTerm(item.term);
    try {
      const res = await apiFetch('/api/admin/learned-terms/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: item.term, targetType, targetId }),
      });
      if (res.ok) setTerms((prev) => prev.filter((t) => t.term !== item.term));
    } finally {
      setBusyTerm(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 -mx-4 px-4 pt-1 pb-16">
      <IosHeader
        title="Mahalliy so'zlar"
        subtitle={`${terms.length} ta yangi nomzod so'z`}
        onBack={onBack}
        trailing={
          <button
            onClick={() => load(true)}
            className="text-ios-blue text-[15px] font-normal active:opacity-50"
          >
            Yangilash
          </button>
        }
      />

      <p className="text-[13px] text-[#8E8E93] leading-snug -mt-2 px-0.5">
        Bot guruhlardagi haqiqiy so'rovlarni doimiy o'qib, hali lug'atda yo'q,
        lekin bir necha marta takrorlangan so'zlarni shu yerga chiqaradi.
        Har biri qaysi kategoriya/manzil bilan ko'proq bog'liq ekanini ham
        taxmin qiladi — tasdiqlasangiz, bot shu so'zni kelajakda darhol taniydi.
      </p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 bg-ios-fill/20 rounded-ios animate-pulse" />
          ))}
        </div>
      ) : terms.length === 0 ? (
        <div className="py-16 text-center text-[15px] text-ios-label-secondary/70">
          Hozircha yangi nomzod so'z yo'q — hammasi allaqachon lug'atda yoki
          hali yetarlicha takrorlanmagan.
        </div>
      ) : (
        <div className="space-y-3">
          {terms.map((item) => (
            <IosCard key={item.term} className="p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[17px] font-semibold text-ios-label">{item.term}</p>
                  <p className="text-[12px] text-ios-label-secondary/70 mt-0.5">
                    {item.occurrenceCount} marta uchragan
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-ios-blue bg-ios-blue/10 px-2 py-1 rounded-full">
                  {item.occurrenceCount}×
                </span>
              </div>

              <p className="text-[13px] text-ios-label-secondary/80 mt-2 italic truncate">
                "{item.sampleMessage}"
              </p>

              <div className="flex flex-wrap gap-2 mt-3">
                {item.suggestedCategoryId && (
                  <button
                    disabled={busyTerm === item.term}
                    onClick={() => accept(item, 'category', item.suggestedCategoryId!)}
                    className="flex items-center gap-1 text-[13px] font-medium text-white bg-ios-blue rounded-full px-3 py-1.5 active:opacity-70 disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[15px]">add</span>
                    "{item.suggestedCategoryName}" kategoriyasiga
                  </button>
                )}
                {item.suggestedLandmarkId && (
                  <button
                    disabled={busyTerm === item.term}
                    onClick={() => accept(item, 'landmark', item.suggestedLandmarkId!)}
                    className="flex items-center gap-1 text-[13px] font-medium text-white bg-ios-green rounded-full px-3 py-1.5 active:opacity-70 disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[15px]">add</span>
                    "{item.suggestedLandmarkName}" manziliga
                  </button>
                )}
                <button
                  disabled={busyTerm === item.term}
                  onClick={() => dismiss(item.term)}
                  className="flex items-center gap-1 text-[13px] font-medium text-ios-label-secondary/70 bg-ios-fill/[0.12] rounded-full px-3 py-1.5 active:opacity-70 disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[15px]">close</span>
                  Rad etish
                </button>
              </div>
            </IosCard>
          ))}
        </div>
      )}
    </div>
  );
};
