import React, { useState } from 'react';
import { useFeedback } from '../../context/FeedbackContext';
import { AdminListing, BottomSheet, FromUserTag, ListingStatus, formatPrice, jsonFetch, statusPill } from './shared';

interface Props {
  item: AdminListing | null;
  onClose: () => void;
  onEdit: (id: string) => void;
  onChanged: () => void;
}

export const RentalDetailSheet: React.FC<Props> = ({ item, onClose, onEdit, onChanged }) => {
  const { showToast, confirm } = useFeedback();
  const [busy, setBusy] = useState(false);
  if (!item) return null;
  const pill = statusPill(item);
  const price = formatPrice(item.rent);

  const setStatus = async (status: ListingStatus, msg: string) => {
    setBusy(true);
    try {
      const res = await jsonFetch(`/api/admin/rentals/${item.id}/status`, 'POST', { status });
      if (res.ok) {
        showToast(msg, 'success');
        onChanged();
        onClose();
      } else showToast('Xatolik yuz berdi', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: "E'lonni o'chirish",
      message: "Bu e'lon butunlay o'chiriladi. Qaytarib bo'lmaydi.",
      confirmLabel: "O'chirish",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await jsonFetch(`/api/admin/rentals/${item.id}`, 'DELETE');
      if (res.ok) {
        showToast("E'lon o'chirildi", 'success');
        onChanged();
        onClose();
      } else showToast('Xatolik yuz berdi', 'error');
    } finally {
      setBusy(false);
    }
  };

  const btn = 'w-full py-3 text-[16px] font-medium text-left px-4 active:bg-ios-fill/10 disabled:opacity-50';
  const sep = { borderBottom: '0.5px solid rgb(var(--ios-separator) / 0.29)' };

  return (
    <BottomSheet open onClose={onClose}>
      {item.photoUrls.length > 0 && (
        <div className="flex gap-1 overflow-x-auto rounded-ios mb-3">
          {item.photoUrls.map((u) => (
            <img key={u} src={u} alt="" className="h-40 w-56 object-cover shrink-0 rounded-[8px]" />
          ))}
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-[20px] font-bold text-ios-label">{item.name}</h2>
        <span className={`px-2 py-0.5 rounded-full text-[12px] font-semibold shrink-0 ${pill.cls}`}>{pill.label}</span>
      </div>
      <div className="flex flex-col gap-1 mt-1 mb-3 text-[14px] text-ios-label-secondary">
        <span>📍 {item.landmark?.name || "Mahalla ko'rsatilmagan"}</span>
        {price && <span className="text-ios-label font-semibold">{price}</span>}
        {item.rent?.rooms ? <span>{item.rent.rooms} xona</span> : null}
        {item.phone && (
          <a href={`tel:${item.phone}`} className="text-ios-blue">
            📞 {item.phone}
          </a>
        )}
        {item.fromUser && (
          <span>
            <FromUserTag />
          </span>
        )}
        {item.description && <p className="text-ios-label/80 whitespace-pre-line mt-1">{item.description}</p>}
        {item.rejectionNote && <p className="text-ios-red mt-1">Rad etish sababi: {item.rejectionNote}</p>}
      </div>

      <div className="bg-ios-card rounded-ios overflow-hidden">
        <button className={`${btn} text-ios-blue`} style={sep} disabled={busy} onClick={() => onEdit(item.id)}>
          ✏️ Tahrirlash
        </button>
        {item.status === 'ACTIVE' ? (
          <button className={`${btn} text-ios-orange`} style={sep} disabled={busy} onClick={() => setStatus('PAUSED', "E'lon to'xtatildi")}>
            ⏸ To'xtatish
          </button>
        ) : (
          <button className={`${btn} text-ios-green`} style={sep} disabled={busy} onClick={() => setStatus('ACTIVE', "E'lon faollashtirildi")}>
            ▶️ Faollashtirish
          </button>
        )}
        {item.status !== 'ARCHIVED' && (
          <button className={`${btn} text-ios-label`} style={sep} disabled={busy} onClick={() => setStatus('ARCHIVED', "E'lon yopildi")}>
            📦 Yopish
          </button>
        )}
        <button className={`${btn} text-ios-red`} disabled={busy} onClick={remove}>
          🗑 O'chirish
        </button>
      </div>
    </BottomSheet>
  );
};
