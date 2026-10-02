/** Stitch xarita dizaynidagi tomchi-pinlar: har tur o'z rangi va ikonkasi. */
export const PIN_STYLE: Record<string, { color: string; icon: string; emoji: string }> = {
  USTA: { color: '#5341cd', icon: 'handyman', emoji: '🔧' },
  DOKON_OBYEKT: { color: '#00816a', icon: 'storefront', emoji: '🛍️' },
  MUASSASA: { color: '#3b82f6', icon: 'account_balance', emoji: '🏛️' },
  TRANSPORT: { color: '#8b7cf6', icon: 'local_shipping', emoji: '🚕' },
  ARENDA: { color: '#e0b020', icon: 'chair', emoji: '🔑' },
  ZAPRAVKA: { color: '#e05555', icon: 'local_gas_station', emoji: '⛽' },
};

/** Mahalla hududlari ranglari (Stitch: lavanda, yalpiz, och sariq, havorang). */
export const AREA_FILLS = ['#8b7cf6', '#38debb', '#f4bf32', '#93c5fd', '#f9a8d4', '#86efac'];

