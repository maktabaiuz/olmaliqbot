import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Tooltip, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Route } from '../lib/router';
import { navigate } from '../lib/router';
import { api } from '../lib/api';
import type { Landmark, Listing } from '../lib/types';
import { TYPE_META } from '../lib/format';
import { haptic } from '../lib/telegram';
import { useAsync, useToast } from '../components/ui';
import { CloudIntro } from './map/CloudIntro';
import { MapSheet } from './map/MapSheet';
import { AREA_FILLS, PIN_STYLE, landmarkIcon, meIcon, pinIcon } from './map/pins';
import { PixelLayer, loadPixelData, type PixelFeature } from './map/PixelLayer';

/** Pixel-multfilm qatlami (OSM ma'lumotidan chiziladi) + stadion yozuvlari. */
const PixelTiles: React.FC = () => {
  const map = useMap();
  const [stadiums, setStadiums] = useState<PixelFeature[]>([]);
  useEffect(() => {
    let layer: L.GridLayer | null = null;
    let alive = true;
    loadPixelData().then((features) => {
      if (!alive) return;
      layer = new PixelLayer(features, { minZoom: 11, maxZoom: 19, attribution: '&copy; OpenStreetMap' } as L.GridLayerOptions);
      layer.addTo(map);
      setStadiums(features.filter((f) => f.k === 'stadium' && f.name));
    });
    return () => {
      alive = false;
      if (layer) map.removeLayer(layer);
    };
  }, [map]);
  return (
    <>
      {stadiums.map((s) => (
        <Marker key={s.name} position={s.bb.getCenter()} icon={landmarkIcon(`🏟️ ${s.name}`)} interactive={false} />
      ))}
    </>
  );
};

// Olmaliq shahri — butun shahar ko'rinadigan chegaralar.
const CITY_CENTER: [number, number] = [40.8447, 69.5986];
const CITY_BOUNDS = L.latLngBounds([40.795, 69.52], [40.895, 69.68]);
const TILES = {
  // OpenStreetMap ochiq plitkalari (kalitsiz). Pastel ko'rinish CSS filtr bilan
  // (.kb-tiles) beriladi; "detail" — asl rangli xarita.
  pastel: { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; OpenStreetMap' },
  detail: { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; OpenStreetMap' },
};

/** Ochilishda: bulutlar tarqalayotganda shahar tomon "sho'ng'ish". */
const IntroFly: React.FC<{ bounds: L.LatLngBounds }> = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    // Bulutlardan shahar markaziga "sho'ng'ish" — uylar ko'rinadigan masshtabgacha
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => (reduced ? map.setView(bounds.getCenter(), 15, { animate: false }) : map.flyTo(bounds.getCenter(), 15, { duration: 1.4 })), 150);
    return () => clearTimeout(t);
  }, [map, bounds]);
  return null;
};

const Controller: React.FC<{ target: [number, number] | null; onZoom: (z: number) => void; api: (m: L.Map) => void }> = ({ target, onZoom, api: expose }) => {
  const map = useMap();
  useEffect(() => expose(map), [map, expose]);
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 15), { duration: 0.7 });
  }, [target, map]);
  useMapEvents({ zoomend: (e) => onZoom(e.target.getZoom()) });
  return null;
};

const CtrlBtn: React.FC<{ icon: string; label: string; onClick: () => void; active?: boolean }> = ({ icon, label, onClick, active }) => (
  <button
    aria-label={label}
    onClick={() => {
      haptic('light');
      onClick();
    }}
    className={`w-12 h-12 flex items-center justify-center active:scale-90 transition-transform ${active ? 'text-primary' : 'text-on-surface'}`}
  >
    <span className={`material-symbols-outlined text-[24px] ${active ? 'fill' : ''}`}>{icon}</span>
  </button>
);

export const MapScreen: React.FC<{ route: Route }> = () => {
  const toast = useToast();
  const lms = useAsync(() => api.landmarks(), []);
  const lst = useAsync(() => api.listings({}), []);
  const [type, setType] = useState<string | null>(null);
  const [openOnly, setOpenOnly] = useState(false);
  const [selListing, setSelListing] = useState<Listing | null>(null);
  const [selArea, setSelArea] = useState<Landmark | null>(null);
  const [me, setMe] = useState<[number, number] | null>(null);
  const [target, setTarget] = useState<[number, number] | null>(null);
  const [zoom, setZoom] = useState(11);
  const [layer, setLayer] = useState<'pixel' | 'pastel' | 'detail'>('pixel');
  const [map, setMap] = useState<L.Map | null>(null);

  const all = lst.data?.items || [];
  const located = useMemo(() => all.filter((l) => l.location), [all]);
  const visible = located.filter((l) => (!type || l.type === type) && (!openOnly || l.open.status === 'open'));
  const areas = (lms.data || []).filter((l) => Array.isArray(l.boundary) && l.boundary.length > 2);
  const points = (lms.data || []).filter((l) => l.latitude != null && l.longitude != null && !(Array.isArray(l.boundary) && l.boundary.length > 2));
  // Ochilishda shahar markaziy qismiga (mahallalar + e'lonlar) yaqinlashadi.
  const dataBounds = useMemo(() => {
    const pts: [number, number][] = [
      ...areas.flatMap((a) => a.boundary as [number, number][]),
      ...located.map((l) => [l.location!.lat, l.location!.lng] as [number, number]),
    ];
    return pts.length > 1 ? L.latLngBounds(pts) : CITY_BOUNDS;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lms.data, lst.data]);
  const types = Object.keys(TYPE_META).filter((t) => located.some((l) => l.type === t));

  const inArea = (l: Listing, id: string) => l.landmark?.id === id || l.serviceAreas.some((a) => a.id === id);
  const area = selArea || (selListing?.landmark ? (lms.data || []).find((x) => x.id === selListing.landmark!.id) || null : null);
  const areaListings = area ? all.filter((l) => inArea(l, area.id)) : all.filter((l) => l.open.status === 'open');
  const featured = selListing || areaListings.find((l) => l.location) || areaListings[0] || null;
  const nearby = areaListings.filter((l) => l.id !== featured?.id);

  const locate = () => {
    if (!navigator.geolocation) return toast("Joylashuvni aniqlab bo'lmadi", 'error');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos: [number, number] = [p.coords.latitude, p.coords.longitude];
        setMe(pos);
        setTarget(pos);
      },
      () => toast('Joylashuvga ruxsat berilmadi', 'error'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const chip = (key: string | null, label: string, n: number) => {
    const a = type === key;
    const st = key ? PIN_STYLE[key] : null;
    return (
      <button
        key={key || 'all'}
        onClick={() => {
          haptic('select');
          setType(key);
          setSelListing(null);
        }}
        className={`shrink-0 h-11 pl-2 pr-3 rounded-full flex items-center gap-2 font-label-lg text-label-lg transition-all active:scale-95 ${
          a ? 'bg-primary text-on-primary clay-fab' : 'bg-surface-container-lowest text-on-surface clay-card'
        }`}
      >
        {st ? (
          <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${st.color}22`, color: st.color }}>
            <span className="material-symbols-outlined fill text-[16px]">{st.icon}</span>
          </span>
        ) : (
          <span className="w-1" />
        )}
        {label}
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${a ? 'bg-white/25' : 'bg-surface-container text-on-surface-variant'}`}>{n}</span>
      </button>
    );
  };

  return (
    <main className={`flex flex-col w-full pb-28 bg-surface min-h-screen kb-map ${layer === 'pixel' ? 'kb-pixel-mode' : ''}`}>
      {/* Jonli Olmaliq sarlavhasi */}
      <div className="px-margin pt-safe">
        <div className="mt-3 flex items-center justify-between gap-2 bg-surface-container-lowest rounded-full pl-2 pr-1.5 py-1.5 clay-card">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-11 h-11 rounded-full bg-primary-fixed text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">explore</span>
            </span>
            <div className="min-w-0">
              <p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Jonli Olmaliq</p>
              <p className="font-headline-sm text-headline-sm text-on-surface truncate">{area ? area.name : 'Butun shahar'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="flex items-center gap-1.5 px-3 h-9 rounded-full bg-surface-container-low font-label-md text-label-md text-on-surface">
              <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse" /> Jonli
            </span>
            <button
              aria-label="Faqat hozir ochiqlar"
              onClick={() => {
                haptic('select');
                setOpenOnly((v) => !v);
              }}
              className={`w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-all ${openOnly ? 'bg-tertiary text-white' : 'bg-primary text-on-primary'} clay-fab`}
            >
              <span className="material-symbols-outlined text-[22px]">{openOnly ? 'schedule' : 'tune'}</span>
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-margin px-margin py-3">
          {chip(null, 'Barchasi', located.length)}
          {types.map((t) => chip(t, TYPE_META[t].label, located.filter((l) => l.type === t).length))}
        </div>
      </div>

      {/* Xarita */}
      <div className="relative isolate w-full h-[50vh] min-h-[340px]">
        <MapContainer center={CITY_CENTER} zoom={11} minZoom={11} maxZoom={18} maxBounds={CITY_BOUNDS.pad(0.6)} className="w-full h-full" zoomControl={false} attributionControl>
          {layer === 'pixel' ? (
            <PixelTiles />
          ) : (
            <TileLayer key={layer} url={TILES[layer].url} attribution={TILES[layer].attr} className={layer === 'pastel' ? 'kb-tiles' : ''} />
          )}
          <IntroFly bounds={dataBounds} />
          <Controller target={target} onZoom={setZoom} api={setMap} />
          {areas.map((a, i) => {
            const c = AREA_FILLS[i % AREA_FILLS.length];
            const active = area?.id === a.id;
            return (
              <Polygon
                key={a.id}
                positions={a.boundary as [number, number][]}
                pathOptions={{ color: c, weight: active ? 3 : 0, fillColor: c, fillOpacity: active ? 0.55 : 0.38 }}
                eventHandlers={{
                  click: () => {
                    haptic('light');
                    setSelArea(a);
                    setSelListing(null);
                  },
                }}
              >
                <Tooltip direction="center" permanent className="kb-area-label">
                  {a.name}
                </Tooltip>
              </Polygon>
            );
          })}
          {zoom >= 14 && points.map((p) => <Marker key={p.id} position={[p.latitude!, p.longitude!]} icon={landmarkIcon(p.name)} interactive={false} />)}
          {visible.map((l, i) => {
            const sel = selListing?.id === l.id;
            return (
              <Marker
                key={l.id}
                position={[l.location!.lat, l.location!.lng]}
                zIndexOffset={sel ? 1000 : 0}
                icon={pinIcon(l.type, sel, sel ? `${l.name}${l.open.status === 'open' ? ' · Ochiq' : ''}` : null, 900 + i * 70)}
                eventHandlers={{
                  click: () => {
                    haptic('light');
                    setSelListing(l);
                    setSelArea(null);
                    setTarget([l.location!.lat, l.location!.lng]);
                  },
                }}
              />
            );
          })}
          {me && <Marker position={me} icon={meIcon} />}
        </MapContainer>

        {/* O'ng tomondagi boshqaruv (Stitch) */}
        <div className="absolute right-3 top-3 z-[500] flex flex-col gap-3">
          <div className="rounded-full bg-surface-container-lowest clay-card">
            <CtrlBtn icon="my_location" label="Men qayerdaman" onClick={locate} />
          </div>
          <div className="rounded-full bg-surface-container-lowest clay-card flex flex-col">
            <CtrlBtn icon="add" label="Yaqinlashtirish" onClick={() => map?.zoomIn()} />
            <CtrlBtn icon="remove" label="Uzoqlashtirish" onClick={() => map?.zoomOut()} />
          </div>
          <div className="rounded-full bg-surface-container-lowest clay-card">
            <CtrlBtn
              icon="layers"
              label="Xarita turi"
              active={layer !== 'pixel'}
              onClick={() => {
                const next = layer === 'pixel' ? 'pastel' : layer === 'pastel' ? 'detail' : 'pixel';
                setLayer(next);
                toast(next === 'pixel' ? '🎮 Pixel shahar' : next === 'pastel' ? '🎨 Pastel xarita' : "🗺️ Batafsil xarita");
              }}
            />
          </div>
        </div>

        {lst.error && (
          <div className="absolute top-3 left-3 right-20 z-[500] bg-surface-container-lowest/95 rounded-full px-3 py-2 font-label-md text-label-md text-error text-center shadow-sm">
            Ma'lumot yuklanmadi
          </div>
        )}
        <CloudIntro />
      </div>

      {/* Pastki karta */}
      <div className="px-margin">
        <MapSheet
          areaTitle={area ? area.name : 'Olmaliq shahri'}
          areaSubtitle={area ? 'Olmaliq' : openOnly ? 'Hozir ochiq' : 'Hozir ochiqlar'}
          featured={featured}
          nearby={nearby}
          nearbyTitle={area ? 'Yana shu mahallada' : 'Hozir ochiq'}
          onSeeAll={area ? () => navigate(`/category/ALL?landmarkId=${area.id}`) : undefined}
        />
      </div>
    </main>
  );
};
