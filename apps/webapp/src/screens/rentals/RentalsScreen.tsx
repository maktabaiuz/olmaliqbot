import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IosHeader } from '../../components/ios/IosHeader';
import { IosSection, IosRow } from '../../components/ios/IosCard';
import { useFeedback } from '../../context/FeedbackContext';
import { AdminListing, FromUserTag, formatPrice, jsonFetch, statusPill } from './shared';
import { RentalDetailSheet } from './RentalDetailSheet';
import { RentalForm } from './RentalForm';

type Filter = 'all' | 'active' | 'pending' | 'rejected' | 'closed';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Hammasi' },
  { id: 'active', label: 'Faol' },
  { id: 'pending', label: 'Kutilmoqda' },
  { id: 'rejected', label: 'Rad etilgan' },
  { id: 'closed', label: 'Yopilgan' },
];

function matches(l: AdminListing, f: Filter): boolean {
  switch (f) {
    case 'active':
      return l.status === 'ACTIVE' && !l.moderationStatus;
    case 'pending':
      return l.moderationStatus === 'pending';
    case 'rejected':
      return l.moderationStatus === 'rejected';
    case 'closed':
      return l.status === 'ARCHIVED' || l.status === 'PAUSED';
    default:
      return true;
  }
}

export const RentalsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { showToast } = useFeedback();
  const [items, setItems] = useState<AdminListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<AdminListing | null>(null);
  const [form, setForm] = useState<{ editId: string | null } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await jsonFetch('/api/admin/rentals');
      if (res.ok) setItems((await res.json()).items || []);
      else showToast("E'lonlarni yuklab bo'lmadi", 'error');
    } catch {
      showToast('Aloqa xatoligi', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter(
      (l) =>
        matches(l, filter) &&
        (!s || [l.name, l.landmark?.name, l.phone, l.description].some((v) => v && v.toLowerCase().includes(s))),
    );
  }, [items, filter, q]);

  if (form) {
    return (
      <RentalForm
        editId={form.editId}
        onBack={() => setForm(null)}
        onSaved={() => {
          setForm(null);
          load();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 -mx-4 px-4 pt-1 pb-16">
      <IosHeader
        title="Ijara e'lonlari"
        subtitle={`${items.length} ta e'lon`}
        onBack={onBack}
        trailing={
          <button onClick={() => setForm({ editId: null })} className="text-ios-blue text-[15px] font-semibold active:opacity-50">
            + Yangi e'lon
          </button>
        }
      />

      <div className="flex rounded-[9px] bg-ios-fill/15 p-0.5 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-1 whitespace-nowrap px-2 py-1.5 rounded-[7px] text-[13px] font-medium ${
              filter === f.id ? 'bg-ios-card text-ios-label shadow-sm' : 'text-ios-label-secondary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="🔍 Nom, mahalla yoki telefon bo'yicha qidirish"
        className="w-full rounded-[10px] bg-ios-fill/15 px-3 py-2 text-[15px] text-ios-label outline-none"
      />

      <IosSection>
        {loading && (
          <IosRow last>
            <span className="text-[15px] text-ios-label-secondary">Yuklanmoqda…</span>
          </IosRow>
        )}
        {!loading && visible.length === 0 && (
          <IosRow last>
            <span className="text-[15px] text-ios-label-secondary">E'lon topilmadi</span>
          </IosRow>
        )}
        {visible.map((l, idx) => {
          const pill = statusPill(l);
          const price = formatPrice(l.rent);
          return (
            <IosRow key={l.id} onClick={() => setSelected(l)} last={idx === visible.length - 1} className="gap-3">
              {l.photoUrls[0] ? (
                <img src={l.photoUrls[0]} alt="" className="w-14 h-14 rounded-[8px] object-cover shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-[8px] bg-ios-fill/15 flex items-center justify-center text-[24px] shrink-0">
                  {l.category?.emoji || '🏠'}
                </div>
              )}
              <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                <span className="text-[15px] font-semibold text-ios-label truncate">{l.name}</span>
                <span className="text-[13px] text-ios-label-secondary truncate">
                  📍 {l.landmark?.name || '—'}
                  {price && ` · ${price}`}
                </span>
                <span className="flex gap-1.5 flex-wrap">
                  <span className={`px-1.5 py-0.5 rounded-[6px] text-[11px] font-semibold ${pill.cls}`}>{pill.label}</span>
                  {l.fromUser && <FromUserTag />}
                </span>
              </div>
            </IosRow>
          );
        })}
      </IosSection>

      <RentalDetailSheet
        item={selected}
        onClose={() => setSelected(null)}
        onEdit={(id) => {
          setSelected(null);
          setForm({ editId: id });
        }}
        onChanged={load}
      />
    </div>
  );
};
