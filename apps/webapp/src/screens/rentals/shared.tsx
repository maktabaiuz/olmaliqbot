import React from 'react';
import { shrinkImage } from '../../shrinkImage';

export type ListingStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export interface AdminListing {
  id: string;
  name: string;
  type: string;
  category: { name: string; emoji: string };
  landmark: { id: string; name: string } | null;
  verified: boolean;
  rent: { price: number | null; currency: string | null; term: string | null; rooms: number | null } | null;
  photoUrls: string[];
  description: string | null;
  status: ListingStatus;
  moderationStatus: null | 'pending' | 'rejected';
  moderationReasons: string[];
  rejectionNote: string | null;
  phone: string | null;
  fromUser: boolean;
  createdAt: string;
}

const TERM_LABEL: Record<string, string> = { OYLIK: 'oyiga', KUNLIK: 'kuniga', YILLIK: 'yiliga' };

export function formatPrice(rent: AdminListing['rent']): string | null {
  if (!rent || rent.price == null) return null;
  const n = rent.price.toLocaleString('ru-RU').replace(/,/g, ' ');
  const money = rent.currency === 'USD' ? `$${n}` : `${n} so'm`;
  const term = rent.term ? ` / ${TERM_LABEL[rent.term] || rent.term.toLowerCase()}` : '';
  return money + term;
}

export const FromUserTag: React.FC = () => (
  <span className="inline-block px-1.5 py-0.5 rounded-[6px] bg-ios-purple/15 text-ios-purple text-[11px] font-semibold">
    Foydalanuvchidan
  </span>
);

export function statusPill(l: AdminListing): { label: string; cls: string } {
  if (l.moderationStatus === 'pending') return { label: 'Kutilmoqda', cls: 'bg-ios-orange/15 text-ios-orange' };
  if (l.moderationStatus === 'rejected') return { label: 'Rad etilgan', cls: 'bg-ios-red/10 text-ios-red' };
  if (l.status === 'ACTIVE') return { label: 'Faol', cls: 'bg-ios-green/15 text-ios-green' };
  if (l.status === 'PAUSED') return { label: "To'xtatilgan", cls: 'bg-ios-fill/20 text-ios-label-secondary' };
  return { label: 'Yopilgan', cls: 'bg-ios-fill/20 text-ios-label-secondary' };
}

/** Pastdan chiquvchi iOS sheet. */
export const BottomSheet: React.FC<{ open: boolean; onClose: () => void; title?: string; children: React.ReactNode }> = ({
  open,
  onClose,
  title,
  children,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-[600px] max-h-[88vh] overflow-y-auto bg-ios-bg rounded-t-[16px] px-4 pt-2 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 rounded-full bg-ios-fill/40 mx-auto mb-3" />
        {title && <h2 className="text-[20px] font-bold text-ios-label mb-3">{title}</h2>}
        {children}
      </div>
    </div>
  );
};

export async function uploadPhoto(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', await shrinkImage(file));
  const res = await fetch('/api/admin/listings/upload-photo', {
    method: 'POST',
    headers: { 'x-init-data': window.Telegram?.WebApp?.initData || '' },
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || 'Rasm yuklanmadi');
  return data.url as string;
}

export async function jsonFetch(path: string, method = 'GET', body?: unknown): Promise<Response> {
  return fetch(path, {
    method,
    headers: {
      'x-init-data': window.Telegram?.WebApp?.initData || '',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
