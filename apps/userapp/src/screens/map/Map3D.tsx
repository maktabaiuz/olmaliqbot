import React, { useEffect, useRef, useState } from 'react';
import maplibregl, { Map as MlMap, Marker, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Landmark, Listing } from '../../lib/types';
import { haptic } from '../../lib/telegram';
import { AREA_FILLS, PIN_STYLE } from './pins';
import { registerTextures, startWind } from './textures';

/**
 * Olmaliq 3D diorama xaritasi (2026-10). Uchinchi tomon xarita xizmati va
 * kalit yo'q: hamma narsa o'zimizning public/olmaliq-3d.json'dan
 * (OpenStreetMap ma'lumoti, scripts/build-3d-map.py) chiziladi —
 * 1 900+ bino haqiqiy joyida, balandligi va rangli tomi bilan.
 */
const DATA_URL = `${import.meta.env.BASE_URL}olmaliq-3d.json`;
const CENTER: [number, number] = [69.5986, 40.8447];
const TILT = 58;

const byKind = (pairs: Record<string, string>, fallback: string): any => ['match', ['get', 'k'], ...Object.entries(pairs).flat(), fallback];

const BUILDING_KINDS = ['house', 'dom', 'tower', 'mosque', 'school', 'health', 'shop', 'civic', 'industry', 'bld'];
const v: any = ['get', 'v'];
const str = (e: any): any => ['to-string', e];
// Hovli uy tomlari: qizil cherepitsa, to'q qizil, yashil va ko'k tunuka, jigarrang
const HOUSE_ROOF: any = ['match', ['%', v, 5], 0, '#b8452f', 1, '#8f3b2c', 2, '#4f8a5a', 3, '#4f7ea8', '#9a6b4a'];
const ROOF: any = ['match', ['get', 'k'],
  'house', HOUSE_ROOF, 'bld', HOUSE_ROOF,
  'dom', ['match', ['%', v, 3], 0, '#8a8f98', 1, '#9b8f84', '#7f8b96'],
  'tower', '#717985', 'mosque', '#eae3cf', 'school', '#d9a128', 'health', '#e6eef5',
  'shop', '#5f8fb3', 'industry', '#8d939c', 'civic', '#b9ad94', '#a8573f'];
const WALL_PATTERN: any = ['match', ['get', 'k'],
  'dom', ['concat', 'dom-', str(v)],
  'tower', ['concat', 'dom-', str(['%', ['+', v, 7], 10])],
  'house', ['concat', 'house-', str(['%', v, 4])],
  'bld', ['concat', 'house-', str(['%', v, 4])],
  'shop', 'glass', 'civic', 'civic', 'mosque', 'civic', 'school', 'school', 'health', 'health', 'industry', 'industry',
  'civic'];

const STYLE: StyleSpecification = {
  version: 8,
  sources: {
    city: { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, attribution: '© OpenStreetMap' },
    areas: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
    me: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#e9e3cf' } },
    { id: 'land', type: 'fill', source: 'city', filter: ['in', ['get', 'k'], ['literal', ['grass', 'cemetery', 'park']]], paint: { 'fill-color': byKind({ grass: '#c9dd98', cemetery: '#c7d3ae', park: '#9dc77a' }, '#c9dd98') } },
    { id: 'areas-fill', type: 'fill', source: 'areas', paint: { 'fill-color': ['get', 'c'], 'fill-opacity': ['case', ['get', 'sel'], 0.32, 0.16] } },
    { id: 'areas-line', type: 'line', source: 'areas', paint: { 'line-color': ['get', 'c'], 'line-width': ['case', ['get', 'sel'], 3, 1.5], 'line-dasharray': [2, 1.5] } },
    { id: 'water', type: 'fill', source: 'city', filter: ['==', ['get', 'k'], 'water'], paint: { 'fill-color': '#4f9cc9' } },
    { id: 'river', type: 'line', source: 'city', filter: ['==', ['get', 'k'], 'river'], paint: { 'line-color': '#4f9cc9', 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1.5, 18, 8] } },
    { id: 'sport', type: 'fill', source: 'city', filter: ['in', ['get', 'k'], ['literal', ['pitch', 'stadium']]], paint: { 'fill-color': byKind({ pitch: '#5fb35a', stadium: '#e6c09c' }, '#5fb35a'), 'fill-outline-color': '#ffffff' } },
    { id: 'rail', type: 'line', source: 'city', filter: ['==', ['get', 'k'], 'rail'], paint: { 'line-color': '#7a6450', 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1, 18, 4], 'line-dasharray': [3, 1] } },
    // Yo'llar: trotuar → asfalt → oq o'rta chiziq
    {
      id: 'sidewalk', type: 'line', source: 'city', filter: ['in', ['get', 'k'], ['literal', ['street', 'road2', 'road1']]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#f3efe4', 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 13, ['match', ['get', 'k'], 'street', 1.2, 3.5], 18, ['match', ['get', 'k'], 'street', 15, 30]] },
    },
    {
      id: 'asphalt', type: 'line', source: 'city', filter: ['in', ['get', 'k'], ['literal', ['street', 'road2', 'road1']]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': byKind({ road1: '#454a52', road2: '#50565e' }, '#5d636b'), 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 13, ['match', ['get', 'k'], 'street', 0.6, 2.2], 18, ['match', ['get', 'k'], 'street', 10, 23]] },
    },
    {
      id: 'lane', type: 'line', source: 'city', minzoom: 15, filter: ['in', ['get', 'k'], ['literal', ['road2', 'road1']]],
      paint: { 'line-color': '#f5f1e6', 'line-width': ['interpolate', ['linear'], ['zoom'], 15, 0.6, 18, 2], 'line-dasharray': [4, 4] },
    },
    {
      id: 'walls', type: 'fill-extrusion', source: 'city', filter: ['in', ['get', 'k'], ['literal', BUILDING_KINDS]],
      paint: { 'fill-extrusion-pattern': WALL_PATTERN, 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-opacity': 1 },
    },
    {
      id: 'roofs', type: 'fill-extrusion', source: 'city', filter: ['in', ['get', 'k'], ['literal', BUILDING_KINDS]],
      paint: { 'fill-extrusion-color': ROOF, 'fill-extrusion-base': ['get', 'h'], 'fill-extrusion-height': ['+', ['get', 'h'], 0.9], 'fill-extrusion-opacity': 1 },
    },
    // Qiya tom qirrasi (hovli uylar)
    { id: 'ridges', type: 'fill-extrusion', source: 'city', filter: ['==', ['get', 'k'], 'ridge'], paint: { 'fill-extrusion-color': HOUSE_ROOF, 'fill-extrusion-base': ['get', 'b'], 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-opacity': 1 } },
    // Masjid: firuza gumbaz va minora
    { id: 'domes', type: 'fill-extrusion', source: 'city', filter: ['==', ['get', 'k'], 'dome'], paint: { 'fill-extrusion-color': '#2a9d8f', 'fill-extrusion-base': ['get', 'b'], 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-opacity': 1 } },
    { id: 'minarets', type: 'fill-extrusion', source: 'city', filter: ['==', ['get', 'k'], 'minaret'], paint: { 'fill-extrusion-color': '#e8d9b8', 'fill-extrusion-base': 0, 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-opacity': 1 } },
    // Daraxtlar — shamolda tebranadi (textures.ts startWind)
    {
      id: 'trees', type: 'symbol', source: 'city', minzoom: 13.5, filter: ['==', ['get', 'k'], 'tree'],
      layout: {
        'icon-image': ['concat', 'tree-', str(['get', 't']), '-', str(['get', 'p'])],
        'icon-anchor': 'bottom',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-pitch-alignment': 'viewport',
        'icon-rotation-alignment': 'viewport',
        'icon-size': ['interpolate', ['linear'], ['zoom'], 14, ['*', 0.35, ['get', 's']], 16, ['*', 0.8, ['get', 's']], 18, ['*', 1.9, ['get', 's']]],
      },
    },
    { id: 'me-acc', type: 'fill', source: 'me', paint: { 'fill-color': '#5341cd', 'fill-opacity': 0.12 } },
  ],
};

const LABEL_EMOJI: Record<string, string> = { mosque: '🕌', school: '🏫', health: '🏥', shop: '🛍️', civic: '🏛️', stadium: '🏟️', industry: '🏭', dom: '🏢', tower: '🏢' };

function circlePolygon(lng: number, lat: number, r: number) {
  const dLat = r / 111320;
  const dLng = r / (111320 * Math.cos((lat * Math.PI) / 180));
  const ring = Array.from({ length: 33 }, (_, i) => {
    const a = (i / 32) * 2 * Math.PI;
    return [lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)];
  });
  return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } }] };
}

function pinEl(l: Listing, selected: boolean, delay: number) {
  const st = PIN_STYLE[l.type] || PIN_STYLE.USTA;
  const s = selected ? 52 : 40;
  const el = document.createElement('div');
  el.className = 'kb-pin-wrap';
  el.style.cssText = `width:${s}px;height:${s + 8}px;position:relative;cursor:pointer`;
  el.innerHTML = `${selected ? `<div class="kb-pin-label">${l.name.replace(/</g, '&lt;')}${l.open.status === 'open' ? ' · Ochiq' : ''}</div>` : ''}<div class="kb-pin ${selected ? 'kb-pin-selected' : ''}" style="--c:${st.color};width:${s}px;height:${s}px;animation-delay:${delay}ms"><span class="material-symbols-outlined fill" style="font-size:${selected ? 24 : 19}px">${st.icon}</span></div><div class="kb-pin-shadow" style="animation-delay:${delay}ms"></div>`;
  return el;
}

function labelEl(text: string) {
  const el = document.createElement('div');
  el.innerHTML = `<div class="kb-lm">${text.replace(/</g, '&lt;')}</div>`;
  return el;
}

export interface Map3DHandle {
  zoomIn(): void;
  zoomOut(): void;
  toggleTilt(): boolean;
  flyTo(lng: number, lat: number): void;
}

export const Map3D: React.FC<{
  listings: Listing[];
  areas: Landmark[];
  selectedListingId: string | null;
  selectedAreaId: string | null;
  me: { lng: number; lat: number; acc: number; heading: number | null } | null;
  onSelectListing: (l: Listing) => void;
  onSelectArea: (a: Landmark) => void;
  onReady: (h: Map3DHandle) => void;
  onUserMove: () => void;
}> = ({ listings, areas, selectedListingId, selectedAreaId, me, onSelectListing, onSelectArea, onReady, onUserMove }) => {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [loaded, setLoaded] = useState(false);
  const pinMarkers = useRef<Marker[]>([]);
  const labelMarkers = useRef<Marker[]>([]);
  const meMarker = useRef<Marker | null>(null);
  const cb = useRef({ onSelectListing, onSelectArea, onUserMove });
  cb.current = { onSelectListing, onSelectArea, onUserMove };

  // Xaritani yaratish + "bulutdan sho'ng'ish"
  useEffect(() => {
    if (!box.current) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const map = new maplibregl.Map({
      container: box.current,
      style: STYLE,
      center: CENTER,
      zoom: 12.6,
      pitch: 0,
      bearing: 0,
      maxPitch: 70,
      minZoom: 12,
      maxZoom: 18.5,
      maxBounds: [[69.47, 40.76], [69.73, 40.93]],
      attributionControl: { compact: true },
      dragRotate: true,
    });
    mapRef.current = map;
    let stopWind = () => {};
    const nameMarkers: Marker[] = [];
    map.on('load', () => {
      registerTextures(map);
      stopWind = startWind(map);
      fetch(DATA_URL)
        .then((r) => r.json())
        .then((fc) => {
          if (!mapRef.current) return;
          (map.getSource('city') as maplibregl.GeoJSONSource).setData(fc);
          for (const f of fc.features as any[]) {
            if (f.properties.k !== 'label') continue;
            const el = document.createElement('div');
            el.className = 'kb-name';
            el.textContent = `${LABEL_EMOJI[f.properties.c] || '📍'} ${f.properties.name}`;
            nameMarkers.push(new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -10] }).setLngLat(f.geometry.coordinates).addTo(map));
          }
        })
        .catch(() => console.error('3D xarita ma\'lumoti yuklanmadi'));
      // Nomlar: faqat yaqinlashtirilganda va ekranning pastki (yaqin) qismida —
      // ufqdagi uzoq binolar nomlari bir-biriga to'planib qolmasin.
      const updateNames = () => {
        const show = map.getZoom() >= 15.8;
        box.current?.classList.toggle('kb-show-names', show);
        if (!show) return;
        const { clientWidth: w, clientHeight: h } = map.getContainer();
        const center = map.getCenter();
        const radius = map.getZoom() >= 17 ? 450 : 700;
        for (const m of nameMarkers) {
          const ll = m.getLngLat();
          const p = map.project(ll);
          const ok = center.distanceTo(ll) < radius && p.x > 40 && p.x < w - 40 && p.y > h * 0.3 && p.y < h * 0.98;
          m.getElement().style.visibility = ok ? 'visible' : 'hidden';
        }
      };
      map.on('move', updateNames);
      map.on('idle', updateNames);
      setLoaded(true);
      const sky: any = { 'sky-color': '#bfe3ff', 'horizon-color': '#fff1d6', 'fog-color': '#f4e9cf', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.7, 'fog-ground-blend': 0.75 };
      (map as any).setSky?.(sky);
      map.setLight({ anchor: 'map', color: '#fff1d0', intensity: 0.42, position: [1.3, 210, 40] });
      const target = { center: CENTER, zoom: 15.4, pitch: TILT, bearing: -18 };
      if (reduced) map.jumpTo(target);
      else setTimeout(() => map.flyTo({ ...target, duration: 2200, essential: true }), 250);
    });
    map.on('error', (e) => console.error('maplibre', e.error?.message));
    map.on('click', 'areas-fill', (e) => {
      const id = e.features?.[0]?.properties?.id;
      const a = areasRef.current.find((x) => x.id === id);
      if (a) {
        haptic('light');
        cb.current.onSelectArea(a);
      }
    });
    map.on('dragstart', () => cb.current.onUserMove());
    onReady({
      zoomIn: () => map.zoomIn(),
      zoomOut: () => map.zoomOut(),
      toggleTilt: () => {
        const flat = map.getPitch() > 10;
        map.easeTo({ pitch: flat ? 0 : TILT, bearing: flat ? 0 : -18, duration: 700 });
        return !flat;
      },
      flyTo: (lng, lat) => map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 16.2), duration: 900 }),
    });
    return () => {
      stopWind();
      nameMarkers.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mahallalar
  const areasRef = useRef(areas);
  areasRef.current = areas;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const fc = {
      type: 'FeatureCollection',
      features: areas.map((a, i) => ({
        type: 'Feature',
        properties: { id: a.id, c: AREA_FILLS[i % AREA_FILLS.length], sel: a.id === selectedAreaId },
        geometry: { type: 'Polygon', coordinates: [[...(a.boundary as [number, number][]).map(([lat, lng]) => [lng, lat]), [a.boundary![0][1], a.boundary![0][0]]]] },
      })),
    };
    (map.getSource('areas') as maplibregl.GeoJSONSource).setData(fc as any);
    labelMarkers.current.forEach((m) => m.remove());
    labelMarkers.current = areas.map((a) => {
      const pts = a.boundary as [number, number][];
      const lat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const lng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      return new maplibregl.Marker({ element: labelEl(a.name) }).setLngLat([lng, lat]).addTo(map);
    });
  }, [areas, selectedAreaId, loaded]);

  // Pinlar
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    pinMarkers.current.forEach((m) => m.remove());
    pinMarkers.current = listings.map((l, i) => {
      const sel = l.id === selectedListingId;
      const el = pinEl(l, sel, sel ? 0 : 1600 + i * 80);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        haptic('light');
        cb.current.onSelectListing(l);
      });
      return new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([l.location!.lng, l.location!.lat]).addTo(map);
    });
  }, [listings, selectedListingId, loaded]);

  // Jonli joylashuv
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const src = map.getSource('me') as maplibregl.GeoJSONSource;
    if (!me) {
      src.setData({ type: 'FeatureCollection', features: [] });
      meMarker.current?.remove();
      meMarker.current = null;
      return;
    }
    src.setData(circlePolygon(me.lng, me.lat, Math.min(me.acc, 300)) as any);
    if (!meMarker.current) {
      const el = document.createElement('div');
      el.className = 'kb-me3d';
      el.innerHTML = '<div class="kb-me3d-cone"></div><div class="kb-me"><span></span></div>';
      meMarker.current = new maplibregl.Marker({ element: el, rotationAlignment: 'map' }).setLngLat([me.lng, me.lat]).addTo(map);
    } else {
      meMarker.current.setLngLat([me.lng, me.lat]);
    }
    const cone = meMarker.current.getElement().querySelector('.kb-me3d-cone') as HTMLElement;
    cone.style.display = me.heading == null ? 'none' : 'block';
    if (me.heading != null) meMarker.current.setRotation(me.heading);
  }, [me, loaded]);

  // MapLibre CSS konteynerga position:relative beradi — shuning uchun o'lcham
  // tashqi o'ramdan olinadi (aks holda balandlik 0 bo'lib, xarita ko'rinmaydi).
  return (
    <div className="absolute inset-0">
      <div ref={box} className="w-full h-full" />
    </div>
  );
};
