import { useState } from 'react';
import { api, ApiError } from './api';
import type { Channel } from './types';
import { haptic } from './telegram';

/**
 * Telefon raqamini ochish oqimi: raqam hech qachon oldindan kelmaydi,
 * faqat shu yerda /phone orqali so'raladi (obuna + limit backend'da).
 * Holatlar: idle → loading → shown | subscribe | limit | error.
 */
export type PhoneState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'shown'; phone: string }
  | { kind: 'subscribe'; missing: Channel[] }
  | { kind: 'limit' }
  | { kind: 'error' };

export function usePhoneReveal(listingId: string) {
  const [state, setState] = useState<PhoneState>({ kind: 'idle' });
  const reveal = async () => {
    setState({ kind: 'loading' });
    try {
      const r = await api.phone(listingId);
      haptic('success');
      setState({ kind: 'shown', phone: r.phone });
      return r.phone;
    } catch (e) {
      const err = e as ApiError;
      haptic('warning');
      if (err.status === 403 && err.body?.reason === 'subscribe') setState({ kind: 'subscribe', missing: err.body.missing || [] });
      else if (err.status === 429) setState({ kind: 'limit' });
      else setState({ kind: 'error' });
      return null;
    }
  };
  const reset = () => setState({ kind: 'idle' });
  return { state, reveal, reset };
}
