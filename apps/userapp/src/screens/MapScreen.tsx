import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Tooltip, Marker, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Route } from '../lib/router';
import { api } from '../lib/api';
import type { Landmark, Listing } from '../lib/types';
import { TYPE_META } from '../lib/format';
import { haptic } from '../lib/telegram';
import { useAsync, useToast } from '../components/ui';
import { BLOB_COLORS, SHAPE_BY_TYPE } from '../components/Blob';
import { MapCard } from './map/MapCard';

const CENTER: [number, number] = [40.8447, 69.5986];
const FILLS = ['#6c5ce7', '#00816a', '#f4bf32', '#E8662B', '#4CC97A', '#8A3FFC'];
const colorOf = (type: string) => BLOB_COLORS[SHAPE_BY_TYPE[type] || 'sphere'];

const iconCache = new Map<string, L.DivIcon>();
function pinIcon(type: string, selected: boolean) {
  const k = type + selected;
  let ic = iconCache.get(k);
  if (!ic) {
    const c = colorOf(type);
    const s = selected ? 30 : 22;
    ic = L.divIcon({
      className: '',
      iconSize: [s, s],
      iconAnchor: [s / 2, s / 2],
      html: `<div style="width:${s}px;height:${s}px;border-radius:46% 54% 50% 50%/55% 48% 52% 45%;background:radial-gradient(circle at 35% 28%,#fff8 0%,${c} 40%);box-shadow:0 4px 10px ${c}66;border:2px solid #fff;display:flex;align-items:center;justify-content:center;gap:3px"><i style="width:3px;height:5px;border-radius:3px;background:#fff"></i><i style="width:3px;height:5px;border-radius:3px;background:#fff"></i></div>`,
    });
    iconCache.set(k, ic);
  }
  return ic;
}

const FlyTo: React.FC<{ to: [number, number] | null }> = ({ to }) => {
  const map = useMap();
  React.useEffect(() => {
    if (to) map.flyTo(to, 16, { duration: 0.8 });
  }, [to, map]);
  return null;
};

export const MapScreen: React.FC<{ route: Route }> = () => {
  const toast = useToast();
  const lms = useAsync(() => api.landmarks(), []);
  const lst = useAsync(() => api.listings({}), []);
  const [type, setType] = useState<string | null>(null);
  const [sel, setSel] = useState<{ kind: 'listing'; l: Listing } | { kind: 'area'; lm: Landmark } | null>(null);
  const [me, setMe] = useState<[number, number] | null>(null);

  const located = useMemo(() => (lst.data?.items || []).filter((l) => l.location), [lst.data]);
  const pins = type ? located.filter((l) => l.type === type) : located;
  const areas = (lms.data || []).filter((l) => Array.isArray(l.boundary) && l.boundary.length > 2);
  const types = Object.keys(TYPE_META).filter((t) => located.some((l) => l.type === t));

  const areaCount = (id: string) => (lst.data?.items || []).filter((l) => l.landmark?.id === id || l.serviceAreas.some((a) => a.id === id)).length;

  const locate = () => {
    haptic('light');
    if (!navigator.geolocation) return toast("Joylashuvni aniqlab bo'lmadi", 'error');
    navigator.geolocation.getCurrentPosition(
      (p) => setMe([p.coords.latitude, p.coords.longitude]),
      () => toast('Joylashuvga ruxsat berilmadi', 'error'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const chip = (key: string | null, label: string, n: number, dot?: string) => {
    const a = type === key;
    return (
      <button
        key={key || 'all'}
        type="button"
        onClick={() => {
          haptic('select');
          setType(key);
          setSel(null);
        }}
        className={`shrink-0 h-9 px-3.5 rounded-full flex items-center gap-1.5 font-label-md text-label-md shadow-sm transition-transform active:scale-95 ${a ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-on-surface'}`}
      >
        {dot && <span className="w-3.5 h-3.5 rounded-full" style={{ background: dot }} />}
        <span>{label}</span>
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${a ? 'bg-white/20' : 'bg-surface-container text-on-surface-variant'}`}>{n}</span>
      </button>
    );
  };

  return (
    <main className="flex-1 flex flex-col relative w-full px-margin pt-safe pb-28 bg-surface min-h-screen">
      <div className="flex flex-col gap-space-sm mb-3 pt-4">
        <div className="flex items-center justify-between gap-space-sm bg-surface-container-lowest p-2 pl-3 rounded-full shadow-sm">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[19px]">explore</span>
            </span>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Jonli Olmaliq</span>
              <span className="font-label-lg text-label-lg text-on-surface truncate">{areas.length > 0 ? `${areas.length} ta mahalla` : 'Olmaliq shahri'}</span>
            </div>
          </div>
          <button type="button" onClick={locate} className="px-3 py-1.5 rounded-full bg-primary text-on-primary font-label-md text-label-md flex items-center gap-1 active:scale-95 transition-transform shrink-0">
            <span className="material-symbols-outlined text-[18px]">my_location</span>
            <span>Men qayerdaman</span>
          </button>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-margin px-margin no-scrollbar">
          {chip(null, 'Barchasi', located.length)}
          {types.map((t) => chip(t, TYPE_META[t].label, located.filter((l) => l.type === t).length, colorOf(t)))}
        </div>
      </div>

      <div className="relative w-full h-[60vh] min-h-[370px] rounded-lg overflow-hidden bg-surface-container shadow-inner mb-4 z-0">
        <MapContainer center={CENTER} zoom={13} className="w-full h-full" zoomControl={false} attributionControl>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
          {areas.map((a, i) => {
            const c = FILLS[i % FILLS.length];
            const active = sel?.kind === 'area' && sel.lm.id === a.id;
            return (
              <Polygon
                key={a.id}
                positions={a.boundary as [number, number][]}
                pathOptions={{ color: c, weight: active ? 3 : 1.5, fillColor: c, fillOpacity: active ? 0.3 : 0.14 }}
                eventHandlers={{
                  click: () => {
                    haptic('light');
                    setSel({ kind: 'area', lm: a });
                  },
                }}
              >
                <Tooltip direction="center" permanent className="!bg-white/80 !border-0 !shadow-none !rounded-full !px-2 !py-0 !text-[11px] !font-bold">
                  {a.name}
                </Tooltip>
              </Polygon>
            );
          })}
          {pins.map((l) => (
            <Marker
              key={l.id}
              position={[l.location!.lat, l.location!.lng]}
              icon={pinIcon(l.type, sel?.kind === 'listing' && sel.l.id === l.id)}
              eventHandlers={{
                click: () => {
                  haptic('light');
                  setSel({ kind: 'listing', l });
                },
              }}
            />
          ))}
          {me && <CircleMarker center={me} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#5341cd', fillOpacity: 1 }} />}
          <FlyTo to={me} />
        </MapContainer>
        {lst.error && (
          <div className="absolute top-3 inset-x-3 z-[500] bg-surface-container-lowest/95 rounded-full px-3 py-2 font-label-md text-label-md text-error text-center shadow-sm">Ma'lumot yuklanmadi</div>
        )}
      </div>

      {sel?.kind === 'listing' && <MapCard kind="listing" listing={sel.l} onClose={() => setSel(null)} />}
      {sel?.kind === 'area' && <MapCard kind="area" landmark={sel.lm} count={areaCount(sel.lm.id)} onClose={() => setSel(null)} />}
      {!sel && lst.data && located.length === 0 && (
        <p className="font-body-sm text-body-sm text-on-surface-variant text-center px-4">Hozircha xaritada joylashuvi ko'rsatilgan e'lonlar yo'q.</p>
      )}
      {!sel && located.length > 0 && <p className="font-body-sm text-body-sm text-on-surface-variant text-center px-4">Belgi yoki mahallani bosing — tafsilotlar shu yerda chiqadi.</p>}
    </main>
  );
};
