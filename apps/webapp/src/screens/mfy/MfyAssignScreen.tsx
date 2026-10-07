import React, { useCallback, useEffect, useState } from 'react';
import { IosHeader } from '../../components/ios/IosHeader';
import { useFeedback } from '../../context/FeedbackContext';
import { jsonFetch } from '../rentals/shared';

interface Item {
  listingId: string;
  listingName: string;
  category: string;
  suggestion: { id: string; name: string; evidence: string[] } | null;
  alternatives: { id: string; name: string }[];
}

/**
 * "MFY biriktirish" (2026-10-08) — MFY tanlanmagan yozuvlar uchun tizim
 * mahalliy jargon asosida MFY taklif qiladi; admin bir bosishda tasdiqlaydi
 * yoki ro'yxatdan boshqasini tanlaydi.
 */
export const MfyAssignScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { showToast } = useFeedback();
  const [items, setItems] = useState<Item[]>([]);
  const [mfys, setMfys] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [pick, setPick] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jsonFetch('/api/admin/mfy-suggestions');
      const data = await res.json();
      if (res.ok && data.success) {
        setItems(data.items);
        setMfys(data.mfys);
      } else showToast(data.message || "Yuklab bo'lmadi", 'error');
    } catch {
      showToast('Aloqa xatosi', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);
  useEffect(() => {
    load();
  }, [load]);

  const apply = async (listingId: string, landmarkId: string, name: string) => {
    setBusy(listingId);
    try {
      const res = await jsonFetch('/api/admin/mfy-suggestions/apply', 'POST', { listingId, landmarkId });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setItems((prev) => prev.filter((i) => i.listingId !== listingId));
        showToast(`✓ ${name}`, 'success');
      } else showToast(data.message || "Saqlab bo'lmadi", 'error');
    } finally {
      setBusy(null);
    }
  };

  const withSuggestion = items.filter((i) => i.suggestion).length;

  return (
    <div className="flex flex-col gap-4 pb-8">
      <IosHeader title="MFY biriktirish" subtitle={loading ? 'Yuklanmoqda…' : `${items.length} ta yozuvda MFY yo'q · ${withSuggestion} tasiga taklif bor`} onBack={onBack} />
      <p className="px-2 text-[13px] text-ios-label-secondary">
        Taklif yozuvning jargoni va MFY'larga siz kiritgan mahalliy so'zlar asosida chiqadi. To'g'ri bo'lsa ✅ bosing, bo'lmasa ro'yxatdan tanlang.
      </p>
      {!loading && items.length === 0 && <p className="text-center text-[15px] text-ios-label-secondary py-10">Hamma yozuvga MFY biriktirilgan ✅</p>}
      {items.map((i) => {
        const chosen = pick[i.listingId] || i.suggestion?.id || '';
        const chosenName = mfys.find((m) => m.id === chosen)?.name || '';
        return (
          <div key={i.listingId} className="bg-ios-card rounded-[12px] p-3.5 flex flex-col gap-2.5 shadow-sm">
            <div>
              <p className="text-[16px] font-semibold text-ios-label">{i.listingName}</p>
              <p className="text-[13px] text-ios-label-secondary">{i.category}</p>
            </div>
            {i.suggestion ? (
              <div className="rounded-[10px] bg-ios-green/10 px-3 py-2 text-[14px]">
                💡 Taklif: <b>{i.suggestion.name}</b>
                <span className="text-ios-label-secondary"> — sabab: {i.suggestion.evidence.map((e) => `"${e}"`).join(', ')}</span>
              </div>
            ) : (
              <div className="rounded-[10px] bg-ios-fill/10 px-3 py-2 text-[13px] text-ios-label-secondary">Avtomatik taklif yo'q — MFY'ni o'zingiz tanlang</div>
            )}
            <div className="flex gap-2">
              <select
                value={chosen}
                onChange={(e) => setPick((p) => ({ ...p, [i.listingId]: e.target.value }))}
                className="flex-1 min-w-0 h-10 rounded-[10px] bg-ios-fill/10 px-2 text-[14px] text-ios-label"
              >
                <option value="">MFY tanlang…</option>
                {mfys.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <button
                disabled={!chosen || busy === i.listingId}
                onClick={() => apply(i.listingId, chosen, chosenName)}
                className="h-10 px-4 rounded-[10px] bg-ios-green text-white text-[14px] font-semibold disabled:opacity-40 active:opacity-70"
              >
                {busy === i.listingId ? '…' : '✅ Saqlash'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
