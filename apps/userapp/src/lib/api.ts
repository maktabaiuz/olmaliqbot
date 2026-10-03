import { initData } from './telegram';
import type { Category, Channel, Landmark, Listing, Review, SearchResponse } from './types';

export class ApiError extends Error {
  constructor(public status: number, public body: any) {
    super(body?.message || `HTTP ${status}`);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/public${path}`, {
      ...init,
      // content-type faqat tana bo'lsa — aks holda Fastify bo'sh JSON tanani rad etadi (400).
      headers: { ...(init?.body ? { 'content-type': 'application/json' } : {}), 'x-init-data': initData(), ...(init?.headers || {}) },
    });
  } catch {
    throw new ApiError(0, { message: 'offline' });
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

const post = <T>(path: string, data?: unknown) => call<T>(path, { method: 'POST', body: JSON.stringify(data ?? {}) });

/** Rasm yuklash — multipart (content-type'ni brauzer o'zi qo'yadi). */
async function uploadPhoto(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  let res: Response;
  try {
    res = await fetch('/api/public/upload-photo', { method: 'POST', body: fd, headers: { 'x-init-data': initData() } });
  } catch {
    throw new ApiError(0, { message: 'offline' });
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body);
  return body.url as string;
}

export type MyRental = Listing & { status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' };

export const api = {
  uploadPhoto,
  addRental: (data: Record<string, unknown>) => post<{ id: string }>('/rentals', data),
  myRentals: () => call<{ items: MyRental[] }>('/me/rentals'),
  closeRental: (id: string) => post(`/rentals/${id}/close`),
  home: () => call<{ countsByType: Record<string, number>; popular: string[]; openNow: Listing[] }>('/home'),
  categories: () => call<Category[]>('/categories'),
  landmarks: () => call<Landmark[]>('/landmarks'),
  listings: (q: Record<string, string | undefined>) => {
    const qs = new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][]).toString();
    return call<{ items: Listing[] }>(`/listings${qs ? `?${qs}` : ''}`);
  },
  search: (q: string) => call<SearchResponse>(`/search?q=${encodeURIComponent(q)}`),
  listing: (id: string) => call<{ listing: Listing; reviews: Review[]; isFavorite: boolean; canReview: boolean }>(`/listings/${id}`),
  phone: (id: string) => post<{ phone: string }>(`/listings/${id}/phone`),
  favorites: () => call<{ items: Listing[] }>('/favorites'),
  addFavorite: (id: string) => post(`/favorites/${id}`),
  removeFavorite: (id: string) => call(`/favorites/${id}`, { method: 'DELETE' }),
  review: (id: string, isPositive: boolean, comment: string) => post(`/listings/${id}/review`, { isPositive, comment }),
  report: (id: string, reason: string, comment: string) => post(`/listings/${id}/report`, { reason, comment }),
  searchFeedback: (query: string, listingId?: string) => post('/search-feedback', { query, listingId }),
  addCandidate: (data: Record<string, unknown>) => post('/candidates', data),
  myCandidates: () => call<{ items: { id: string; name: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; createdAt: string; category: { name: string; emoji: string | null } | null }[] }>('/me/candidates'),
  subscription: () => call<{ ok: boolean; missing: Channel[] }>('/me/subscription'),
  emergency: () => call<{ national: { key: string; label: string; phone: string }[]; local: { key: string; label: string; phone: string }[] }>('/emergency'),
  assistant: (message: string) => post<{ reply: string; items: Listing[] }>('/assistant', { message }),
};
