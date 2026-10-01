import React, { useEffect, useState } from 'react';
import { apiFetch } from '../config';
import { IosHeader } from '../components/ios/IosHeader';
import { IosSection, IosRow } from '../components/ios/IosCard';

export interface CandidatesScreenProps {
  onBack: () => void;
  /** "Bazaga qo'shish" bosilganda — qo'shish sahifasini shu kategoriya bilan ochadi. */
  onAddToDatabase: (categoryName: string | undefined) => void;
}

interface Candidate {
  id: string;
  name: string;
  phone: string | null;
  categoryName: string | null;
  landmarkName: string | null;
  source: string;
  submittedBy: string | null;
  mentionCount: number;
  createdAt: string;
}

const SOURCE_LABEL: Record<string, string> = {
  ai_chat: '🤖 AI suhbat',
  lichka: '💬 Botda qo\'shildi',
  group: '👥 Guruhdan',
  archive: '🗂 Arxivdan',
  photo: '📷 Rasmdan',
};

/**
 * Foydalanuvchilar yuborgan, hali tekshirilmagan ma'lumotlar (2026-10).
 * Manbalar: AI suhbatda "menda ma'lumot bor" deb yuborilganlar va botdagi
 * "O'zimni qo'shish" oqimi. Admin tekshirib, bazaga qo'shadi yoki rad etadi.
 */
export const CandidatesScreen: React.FC<CandidatesScreenProps> = ({ onBack, onAddToDatabase }) => {
  const [items, setItems] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/admin/candidates');
        if (res.ok) setItems(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setBusyId(id);
    try {
      const res = await apiFetch(`/api/admin/candidates/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 -mx-4 px-4 pt-1 pb-16">
      <IosHeader title="Yangi ma'lumotlar" subtitle={`${items.length} ta tekshirilmagan`} onBack={onBack} />

      <IosSection footer="Foydalanuvchilar botda yuborgan ma'lumotlar. Tekshirib, «Bazaga qo'shish» orqali yozuv yarating, so'ng «Qo'shildi» deb belgilang.">
        {loading && (
          <IosRow last>
            <span className="text-[15px] text-ios-label-secondary">Yuklanmoqda…</span>
          </IosRow>
        )}
        {!loading && items.length === 0 && (
          <IosRow last>
            <span className="text-[15px] text-ios-label-secondary">Hozircha yangi ma'lumot yo'q 🎉</span>
          </IosRow>
        )}
        {items.map((c, idx) => (
          <IosRow key={c.id} last={idx === items.length - 1} className="!items-start">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <span className="text-[16px] font-semibold text-ios-label truncate">{c.name}</span>
              <span className="text-[14px] text-ios-label-secondary">
                {[c.categoryName, c.landmarkName].filter(Boolean).join(' · ') || 'Soha ko\'rsatilmagan'}
              </span>
              {c.phone && (
                <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`} className="text-[14px] text-ios-blue">
                  📞 {c.phone}
                </a>
              )}
              <span className="text-[12px] text-ios-label-secondary/70">
                {SOURCE_LABEL[c.source] || c.source} · {new Date(c.createdAt).toLocaleDateString('uz-UZ')}
              </span>
              <div className="flex gap-2 mt-2">
                <button
                  className="px-3 py-1.5 rounded-[8px] bg-ios-blue text-white text-[13px] font-semibold"
                  onClick={() => onAddToDatabase(c.categoryName || undefined)}
                >
                  ➕ Bazaga qo'shish
                </button>
                <button
                  disabled={busyId === c.id}
                  className="px-3 py-1.5 rounded-[8px] bg-ios-green/15 text-ios-green text-[13px] font-semibold disabled:opacity-50"
                  onClick={() => setStatus(c.id, 'APPROVED')}
                >
                  ✓ Qo'shildi
                </button>
                <button
                  disabled={busyId === c.id}
                  className="px-3 py-1.5 rounded-[8px] bg-ios-red/10 text-ios-red text-[13px] font-semibold disabled:opacity-50"
                  onClick={() => setStatus(c.id, 'REJECTED')}
                >
                  ✕ Rad etish
                </button>
              </div>
            </div>
          </IosRow>
        ))}
      </IosSection>
    </div>
  );
};
