import { useEffect, useState } from 'react';
import { useAsync, useToast } from '../../components/ui';
import { api } from '../../lib/api';
import { usePhoneReveal } from '../../lib/phone';
import { haptic } from '../../lib/telegram';

export type SheetKind = 'review' | 'report' | 'share' | null;

/** Listing sahifalari uchun umumiy holat: ma'lumot, telefon oqimi, sevimli, sheet'lar. */
export function useListingPage(id: string) {
  const data = useAsync(() => api.listing(id), [id]);
  const phone = usePhoneReveal(id);
  const toast = useToast();
  const [fav, setFav] = useState(false);
  const [sheet, setSheet] = useState<SheetKind>(null);

  useEffect(() => {
    if (data.data) setFav(data.data.isFavorite);
  }, [data.data]);

  const toggleFav = async () => {
    const next = !fav;
    haptic(next ? 'success' : 'light');
    setFav(next);
    try {
      if (next) await api.addFavorite(id);
      else await api.removeFavorite(id);
      toast(next ? 'Saqlandi' : "Saqlanganlardan o'chirildi", next ? 'success' : 'info');
    } catch {
      setFav(!next);
      toast("Saqlab bo'lmadi", 'error');
    }
  };

  const call = () => {
    if (phone.state.kind === 'loading') return;
    haptic('medium');
    void phone.reveal();
  };

  const open = (k: SheetKind) => {
    haptic('light');
    setSheet(k);
  };

  return { data, phone, fav, toggleFav, call, sheet, open, close: () => setSheet(null) };
}
