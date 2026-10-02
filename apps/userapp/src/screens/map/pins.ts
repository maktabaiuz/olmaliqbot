import L from 'leaflet';

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

const cache = new Map<string, L.DivIcon>();

export function pinIcon(type: string, selected: boolean, label: string | null, delayMs: number): L.DivIcon {
  const key = `${type}|${selected}|${label}|${delayMs}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const st = PIN_STYLE[type] || PIN_STYLE.USTA;
  const s = selected ? 52 : 40;
  const bubble = selected && label
    ? `<div class="kb-pin-label">${label.replace(/</g, '&lt;')}</div>`
    : '';
  const icon = L.divIcon({
    className: 'kb-pin-wrap',
    iconSize: [s, s + 8],
    iconAnchor: [s / 2, s + 6],
    html: `${bubble}<div class="kb-pin ${selected ? 'kb-pin-selected' : ''}" style="--c:${st.color};width:${s}px;height:${s}px;animation-delay:${delayMs}ms">
      <span class="material-symbols-outlined fill" style="font-size:${selected ? 24 : 19}px">${st.icon}</span>
    </div><div class="kb-pin-shadow" style="animation-delay:${delayMs}ms"></div>`,
  });
  cache.set(key, icon);
  return icon;
}

export function landmarkIcon(name: string): L.DivIcon {
  const key = `lm|${name}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const icon = L.divIcon({ className: 'kb-pin-wrap', iconSize: [0, 0], html: `<div class="kb-lm">${name.replace(/</g, '&lt;')}</div>` });
  cache.set(key, icon);
  return icon;
}

export const meIcon = L.divIcon({ className: 'kb-pin-wrap', iconSize: [28, 28], iconAnchor: [14, 14], html: '<div class="kb-me"><span></span></div>' });
