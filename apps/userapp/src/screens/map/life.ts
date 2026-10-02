import type { Map as MlMap, GeoJSONSource } from 'maplibre-gl';

/**
 * Shahar "hayoti" (2026-10): haqiqiy ko'chalar (OSM) bo'ylab yuradigan
 * mashinalar va trotuardagi odamchalar. Har bir harakatlanuvchi o'z
 * yo'lagida (o'ng tomonda) yuradi, yo'l oxirida orqaga buriladi.
 * Faqat yaqinlashtirilganda (zoom ≥ 14.5) va sahifa ko'rinib turganda
 * hisoblanadi — telefon quvvati behuda sarflanmaydi.
 */
type LngLat = [number, number];

interface Walker {
  path: LngLat[];
  cum: number[]; // har nuqtagacha masofa (m)
  s: number; // hozirgi masofa
  dir: 1 | -1;
  speed: number; // m/s
  lane: number; // yo'l o'rtasidan siljish (m)
  icon: string;
  car: boolean;
}

const M_PER_DEG_LAT = 111320;
const mPerDegLng = (lat: number) => 111320 * Math.cos((lat * Math.PI) / 180);

function measure(path: LngLat[]) {
  const cum = [0];
  for (let i = 1; i < path.length; i++) {
    const [x1, y1] = path[i - 1];
    const [x2, y2] = path[i];
    cum.push(cum[i - 1] + Math.hypot((x2 - x1) * mPerDegLng(y1), (y2 - y1) * M_PER_DEG_LAT));
  }
  return cum;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Mashina turlari ulushi: Damas, oq Cobalt, kumush, qora, taksi (avtobus alohida)
const CAR_ICONS = ['car-0', 'car-0', 'car-1', 'car-1', 'car-2', 'car-3', 'car-4', 'car-4'];

export function startLife(map: MlMap, features: any[]): () => void {
  const roads = features.filter((f) => f.geometry?.type === 'LineString' && ['road1', 'road2', 'street'].includes(f.properties.k));
  const usable = roads
    .map((f) => ({ k: f.properties.k as string, path: f.geometry.coordinates as LngLat[] }))
    .map((r) => ({ ...r, cum: measure(r.path) }))
    .filter((r) => r.cum[r.cum.length - 1] > 90);
  if (usable.length === 0) return () => {};
  const main = usable.filter((r) => r.k !== 'street');

  const walkers: Walker[] = [];
  const spawn = (car: boolean) => {
    const r = car && main.length && Math.random() < 0.7 ? pick(main) : pick(usable);
    const len = r.cum[r.cum.length - 1];
    const bus = car && r.k !== 'street' && Math.random() < 0.12;
    walkers.push({
      path: r.path,
      cum: r.cum,
      s: Math.random() * len,
      dir: Math.random() < 0.5 ? 1 : -1,
      speed: car ? (bus ? 6 : 7 + Math.random() * 5) : 1.1 + Math.random() * 0.5,
      lane: car ? (r.k === 'street' ? 1.6 : 3) : r.k === 'street' ? 5.5 : 9,
      icon: car ? (bus ? 'car-5' : pick(CAR_ICONS)) : `person-${Math.floor(Math.random() * 5)}`,
      car,
    });
  };
  for (let i = 0; i < 140; i++) spawn(true);
  for (let i = 0; i < 90; i++) spawn(false);

  const position = (w: Walker) => {
    let i = 1;
    while (i < w.cum.length - 1 && w.cum[i] < w.s) i++;
    const seg = w.cum[i] - w.cum[i - 1] || 1;
    const t = (w.s - w.cum[i - 1]) / seg;
    const [x1, y1] = w.path[i - 1];
    const [x2, y2] = w.path[i];
    const lng = x1 + (x2 - x1) * t;
    const lat = y1 + (y2 - y1) * t;
    // harakat yo'nalishi (shimoldan, gradus) va o'ng qatorga siljish
    const dx = (x2 - x1) * mPerDegLng(lat) * w.dir;
    const dy = (y2 - y1) * M_PER_DEG_LAT * w.dir;
    const L = Math.hypot(dx, dy) || 1;
    const rx = dy / L; // o'ng tomonga normal
    const ry = -dx / L;
    const bearing = (Math.atan2(dx, dy) * 180) / Math.PI;
    return {
      lng: lng + (rx * w.lane) / mPerDegLng(lat),
      lat: lat + (ry * w.lane) / M_PER_DEG_LAT,
      bearing,
    };
  };

  let raf = 0;
  let last = performance.now();
  let acc = 0;
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    if (acc < 0.05 || document.hidden || map.getZoom() < 14.5) return; // ~20 kadr/s
    const step = acc;
    acc = 0;
    const out = [];
    for (const w of walkers) {
      const len = w.cum[w.cum.length - 1];
      w.s += w.speed * step * w.dir;
      if (w.s > len) {
        w.s = len;
        w.dir = -1;
      } else if (w.s < 0) {
        w.s = 0;
        w.dir = 1;
      }
      const p = position(w);
      out.push({ type: 'Feature', properties: { i: w.icon, b: p.bearing, c: w.car }, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } });
    }
    (map.getSource('life') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: out } as any);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
