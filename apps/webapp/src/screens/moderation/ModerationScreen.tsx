import React, { useCallback, useEffect, useState } from 'react';
import { IosHeader } from '../../components/ios/IosHeader';
import { IosSection, IosRow } from '../../components/ios/IosCard';
import { useFeedback } from '../../context/FeedbackContext';
import { AdminListing, FromUserTag, formatPrice, jsonFetch } from '../rentals/shared';
import { RejectSheet } from './RejectSheet';

interface SuspiciousCandidate {
  id: string;
  name: string;
  phone: string | null;
  moderationReasons: string[];
  createdAt: string;
  category: { name: string } | null;
}

interface Props {
  onBack: () => void;
  onOpenCandidates: () => void;
  onCountChange?: (n: number) => void;
}

const ReasonsBox: React.FC<{ reasons: string[] }> = ({ reasons }) =>
  reasons.length ? (
    <div className="rounded-[10px] bg-ios-orange/15 border border-ios-orange/40 p-3">
      <p className="text-[13px] font-bold text-ios-orange mb-1">⚠️ Nega shubhali:</p>
      <ul className="list-disc pl-5 text-[14px] text-ios-label">
        {reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  ) : null;

/** Avtomatik tekshiruvda shubhali deb belgilangan e'lonlar navbati. */
export const ModerationScreen: React.FC<Props> = ({ onBack, onOpenCandidates, onCountChange }) => {
  const { showToast } = useFeedback();
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [candidates, setCandidates] = useState<SuspiciousCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await jsonFetch('/api/admin/moderation');
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings || []);
        setCandidates(data.candidates || []);
      } else showToast("Ma'lumotni yuklab bo'lmadi", 'error');
    } catch {
      showToast('Aloqa xatoligi', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    onCountChange?.(listings.length);
  }, [listings.length, onCountChange]);

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      const res = await jsonFetch(`/api/admin/moderation/listings/${id}/approve`, 'POST');
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setListings((p) => p.filter((l) => l.id !== id));
        showToast(data.notified ? "E'lon chiqdi, egasiga xabar yuborildi" : "E'lon chiqdi", 'success');
      } else showToast('Xatolik yuz berdi', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (reason: string) => {
    if (!rejectId) return;
    const id = rejectId;
    setBusyId(id);
    try {
      const res = await jsonFetch(`/api/admin/moderation/listings/${id}/reject`, 'POST', { reason });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setListings((p) => p.filter((l) => l.id !== id));
        setRejectId(null);
        showToast(data.notified ? 'Rad etildi, egasiga xabar yuborildi' : 'Rad etildi (egasiga xabar yetmadi)', 'success');
      } else showToast('Xatolik yuz berdi', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const empty = !loading && listings.length === 0 && candidates.length === 0;

  return (
    <div className="flex flex-col gap-4 -mx-4 px-4 pt-1 pb-16">
      <IosHeader title="Shubhali e'lonlar" subtitle={`${listings.length} ta e'lon tekshiruvni kutmoqda`} onBack={onBack} />

      {loading && <p className="text-center text-[15px] text-ios-label-secondary py-8">Yuklanmoqda…</p>}
      {empty && <p className="text-center text-[17px] text-ios-label-secondary py-12">Shubhali e'lon yo'q ✅</p>}

      {listings.map((l) => {
        const price = formatPrice(l.rent);
        return (
          <div key={l.id} className="bg-ios-card rounded-ios shadow-sm overflow-hidden">
            {l.photoUrls.length > 0 && (
              <div className="flex gap-1 overflow-x-auto">
                {l.photoUrls.map((u) => (
                  <img key={u} src={u} alt="" className="h-36 w-48 object-cover shrink-0" />
                ))}
              </div>
            )}
            <div className="p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[17px] font-semibold text-ios-label">
                  {l.category?.emoji} {l.name}
                </span>
                {l.fromUser && <FromUserTag />}
              </div>
              <span className="text-[14px] text-ios-label-secondary">
                📍 {l.landmark?.name || "Mahalla ko'rsatilmagan"}
                {price && <> · <b className="text-ios-label">{price}</b></>}
              </span>
              {l.phone && (
                <a href={`tel:${l.phone}`} className="text-[14px] text-ios-blue">
                  📞 {l.phone}
                </a>
              )}
              {l.description && <p className="text-[14px] text-ios-label/80 whitespace-pre-line">{l.description}</p>}
              <ReasonsBox reasons={l.moderationReasons} />
              <div className="flex gap-2 mt-1">
                <button
                  disabled={busyId === l.id}
                  onClick={() => approve(l.id)}
                  className="flex-1 py-2.5 rounded-[10px] bg-ios-green text-white text-[15px] font-semibold disabled:opacity-50"
                >
                  ✓ Tasdiqlash
                </button>
                <button
                  disabled={busyId === l.id}
                  onClick={() => setRejectId(l.id)}
                  className="flex-1 py-2.5 rounded-[10px] bg-ios-red text-white text-[15px] font-semibold disabled:opacity-50"
                >
                  ✕ Rad etish
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {candidates.length > 0 && (
        <IosSection title="Shubhali yangi ma'lumotlar" footer="Bularni «Yangi ma'lumotlar» bo'limida ko'rib chiqing.">
          {candidates.map((c) => (
            <IosRow key={c.id} className="!items-start">
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <span className="text-[16px] font-semibold text-ios-label truncate">{c.name}</span>
                <span className="text-[13px] text-ios-label-secondary">
                  {c.category?.name || "Soha ko'rsatilmagan"}
                  {c.phone && ` · ${c.phone}`}
                </span>
                <ReasonsBox reasons={c.moderationReasons} />
              </div>
            </IosRow>
          ))}
          <IosRow onClick={onOpenCandidates} last>
            <span className="text-[15px] text-ios-blue">Yangi ma'lumotlarga o'tish</span>
            <span className="material-symbols-outlined text-[18px] text-ios-label-secondary/50">chevron_right</span>
          </IosRow>
        </IosSection>
      )}

      <RejectSheet open={!!rejectId} busy={busyId === rejectId} onClose={() => setRejectId(null)} onSubmit={reject} />
    </div>
  );
};
