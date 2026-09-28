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

interface CategoryCandidate {
  term: string;
  occurrenceCount: number;
  sampleMessage: string;
  aiConfirmed: boolean | null;
}

interface CategoryGroup {
  categoryId: string;
  categoryName: string;
  existingSynonyms: string[];
  candidates: CategoryCandidate[];
}

/**
 * "Mahalliy so'zlar lug'ati" (2026-09-28, keyin "kategoriya bo'yicha
 * uyg'unlashtirib yig'ish" so'roviga ko'ra kengaytirildi) — bot
 * guruhlardagi HAQIQIY so'zlarni doimiy o'qib, o'rganib boradi. Standart
 * ko'rinish — HAR BIR kategoriya (kasb/soha) uchun: hozirgi sinonimlari +
 * yangi nomzod so'zlar BIR JOYDA, shu orqali "bu soha mahalliy tilda
 * to'liq qamrab olinganmi" savoliga bir qarashda javob beriladi. Eng ko'p
 * nomzodli, eng ko'p e'tibor kerak bo'lgan kategoriyalar tepada. Ba'zi
 * so'zlar uchun ✨ belgisi — Gemini AI ham "bu haqiqiy mahalliy nom" deb
 * tasdiqlagani (faqat KO'RSATMA, qat'iy filtr emas — admin baribir o'zi
 * qaror qiladi).
 */
export const LearnedTermsScreen: React.FC<LearnedTermsScreenProps> = ({ onBack }) => {
  const [viewMode, setViewMode] = useState<'byCategory' | 'flat'>('byCategory');
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [flatTerms, setFlatTerms] = useState<LearnedTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyTerm, setBusyTerm] = useState<string | null>(null);

  const load = async (fresh = false) => {
    setLoading(true);
    try {
      const [byCategoryRes, flatRes] = await Promise.all([
        apiFetch(`/api/admin/learned-terms/by-category${fresh ? '?fresh=true' : ''}`),
        apiFetch(`/api/admin/learned-terms${fresh ? '?fresh=true' : ''}`),
      ]);
      if (byCategoryRes.ok) setGroups(await byCategoryRes.json());
      if (flatRes.ok) setFlatTerms(await flatRes.json());
    } catch (err) {
      console.error('Failed to load learned terms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totalCandidates = groups.reduce((sum, g) => sum + g.candidates.length, 0);
  // Kategoriyaga bog'lanmagan so'zlar — faqat "Hammasi" ko'rinishida
  // ko'rinadi (chunki bir bosishda qo'shish uchun manzil taklifi kerak).
  const unlinkedCount = flatTerms.filter((t) => !t.suggestedCategoryId).length;

  const dismiss = async (term: string) => {
    setBusyTerm(term);
    try {
      await apiFetch('/api/admin/learned-terms/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term }),
      });
      setGroups((prev) =>
        prev.map((g) => ({ ...g, candidates: g.candidates.filter((c) => c.term !== term) })).filter((g) => g.candidates.length > 0)
      );
      setFlatTerms((prev) => prev.filter((t) => t.term !== term));
    } finally {
      setBusyTerm(null);
    }
  };

  const acceptToCategory = async (term: string, categoryId: string) => {
    setBusyTerm(term);
    try {
      const res = await apiFetch('/api/admin/learned-terms/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term, targetType: 'category', targetId: categoryId }),
      });
      if (res.ok) {
        setGroups((prev) =>
          prev
            .map((g) =>
              g.categoryId === categoryId
                ? { ...g, existingSynonyms: [...g.existingSynonyms, term], candidates: g.candidates.filter((c) => c.term !== term) }
                : g
            )
            .filter((g) => g.candidates.length > 0)
        );
        setFlatTerms((prev) => prev.filter((t) => t.term !== term));
      }
    } finally {
      setBusyTerm(null);
    }
  };

  const acceptFlat = async (item: LearnedTerm, targetType: 'category' | 'landmark', targetId: string) => {
    setBusyTerm(item.term);
    try {
      const res = await apiFetch('/api/admin/learned-terms/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: item.term, targetType, targetId }),
      });
      if (res.ok) setFlatTerms((prev) => prev.filter((t) => t.term !== item.term));
    } finally {
      setBusyTerm(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 -mx-4 px-4 pt-1 pb-16">
      <IosHeader
        title="Mahalliy so'zlar"
        subtitle={viewMode === 'byCategory' ? `${groups.length} ta soha, ${totalCandidates} ta yangi so'z` : `${flatTerms.length} ta yangi nomzod`}
        onBack={onBack}
        trailing={
          <button onClick={() => load(true)} className="text-ios-blue text-[15px] font-normal active:opacity-50">
            Yangilash
          </button>
        }
      />

      <p className="text-[13px] text-[#8E8E93] leading-snug -mt-2 px-0.5">
        Bot guruhlardagi haqiqiy so'rovlarni doimiy o'qib, har bir soha
        (kasb/kategoriya) mahalliy tilda qanday so'zlar bilan atalishini
        yig'ib boradi. ✨ belgisi — sun'iy intellekt ham shu so'zni
        haqiqiy mahalliy nom deb tasdiqlagan (faqat ko'rsatma, qaror
        baribir sizniki).
      </p>

      <div className="flex bg-ios-fill/[0.12] rounded-ios p-[2px]">
        {([
          { key: 'byCategory', label: 'Soha bo\'yicha' },
          { key: 'flat', label: `Hammasi${unlinkedCount > 0 ? ` (+${unlinkedCount})` : ''}` },
        ] as const).map((opt) => (
          <button
            key={opt.key}
            onClick={() => setViewMode(opt.key)}
            className={`flex-1 py-1.5 rounded-[8px] text-[13px] font-medium transition-colors ${
              viewMode === opt.key ? 'bg-ios-card text-ios-label shadow-sm' : 'text-ios-label-secondary/70'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 bg-ios-fill/20 rounded-ios animate-pulse" />
          ))}
        </div>
      ) : viewMode === 'byCategory' ? (
        groups.length === 0 ? (
          <div className="py-16 text-center text-[15px] text-ios-label-secondary/70">
            Hozircha kategoriyaga bog'langan yangi so'z yo'q.
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g.categoryId}>
                <div className="flex items-center justify-between px-1 mb-1.5">
                  <span className="text-[15px] font-semibold text-ios-label">{g.categoryName}</span>
                  <span className="text-[12px] text-ios-label-secondary/70">
                    {g.existingSynonyms.length} sinonim · +{g.candidates.length} yangi
                  </span>
                </div>
                <IosCard className="p-3.5">
                  {g.existingSynonyms.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[11px] text-ios-label-secondary/60 mb-1">Hozirgi sinonimlar:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {g.existingSynonyms.map((s) => (
                          <span key={s} className="bg-ios-fill/[0.12] text-ios-label-secondary/80 px-2.5 py-1 rounded-full text-[12px]">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-[11px] text-ios-label-secondary/60 mb-1">Yangi taklif etilgan so'zlar:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[...g.candidates]
                      .sort((a, b) => (b.aiConfirmed === true ? 1 : 0) - (a.aiConfirmed === true ? 1 : 0) || b.occurrenceCount - a.occurrenceCount)
                      .map((c) => (
                        <span
                          key={c.term}
                          className="bg-ios-green/10 text-ios-label pl-2.5 pr-1.5 py-1 rounded-full text-[13px] font-medium flex items-center gap-1"
                        >
                          <button
                            type="button"
                            disabled={busyTerm === c.term}
                            onClick={() => acceptToCategory(c.term, g.categoryId)}
                            title={c.sampleMessage}
                            className="flex items-center gap-1 active:opacity-60 disabled:opacity-40"
                          >
                            {c.aiConfirmed === true && <span title="AI ham tasdiqladi">✨</span>}
                            {c.term}
                            <span className="text-ios-label-secondary/60 text-[11px]">×{c.occurrenceCount}</span>
                          </button>
                          <button
                            type="button"
                            disabled={busyTerm === c.term}
                            onClick={() => dismiss(c.term)}
                            title="Rad etish"
                            className="w-4 h-4 rounded-full bg-ios-fill/20 flex items-center justify-center text-[11px] leading-none active:opacity-60 disabled:opacity-40"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                  </div>
                </IosCard>
              </div>
            ))}
          </div>
        )
      ) : flatTerms.length === 0 ? (
        <div className="py-16 text-center text-[15px] text-ios-label-secondary/70">
          Hozircha yangi nomzod so'z yo'q.
        </div>
      ) : (
        <div className="space-y-3">
          {flatTerms.map((item) => (
            <IosCard key={item.term} className="p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[17px] font-semibold text-ios-label">{item.term}</p>
                  <p className="text-[12px] text-ios-label-secondary/70 mt-0.5">{item.occurrenceCount} marta uchragan</p>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-ios-blue bg-ios-blue/10 px-2 py-1 rounded-full">
                  {item.occurrenceCount}×
                </span>
              </div>

              <p className="text-[13px] text-ios-label-secondary/80 mt-2 italic truncate">"{item.sampleMessage}"</p>

              <div className="flex flex-wrap gap-2 mt-3">
                {item.suggestedCategoryId && (
                  <button
                    disabled={busyTerm === item.term}
                    onClick={() => acceptFlat(item, 'category', item.suggestedCategoryId!)}
                    className="flex items-center gap-1 text-[13px] font-medium text-white bg-ios-blue rounded-full px-3 py-1.5 active:opacity-70 disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[15px]">add</span>
                    "{item.suggestedCategoryName}" kategoriyasiga
                  </button>
                )}
                {item.suggestedLandmarkId && (
                  <button
                    disabled={busyTerm === item.term}
                    onClick={() => acceptFlat(item, 'landmark', item.suggestedLandmarkId!)}
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
