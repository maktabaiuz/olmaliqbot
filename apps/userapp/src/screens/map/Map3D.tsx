import React, { useEffect, useRef, useState } from 'react';
import maplibregl, { Map as MlMap, Marker, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Landmark, Listing } from '../../lib/types';
import { haptic } from '../../lib/telegram';
import { AREA_FILLS, PIN_STYLE } from './pins';

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

const STYLE: StyleSpecification = {
  version: 8,
  sources: {
    city: { type: 'geojson', data: DATA_URL, attribution: '© OpenStreetMap' },
    areas: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
    me: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#efe4c4' } },
    { id: 'land', type: 'fill', source: 'city', filter: ['in', ['get', 'k'], ['literal', ['grass', 'cemetery', 'park']]], paint: { 'fill-color': byKind({ grass: '#d3e3a6', cemetery: '#cdd8b5', park: '#a9cc82' }, '#d3e3a6') } },
    { id: 'areas-fill', type: 'fill', source: 'areas', paint: { 'fill-color': ['get', 'c'], 'fill-opacity': ['case', ['get', 'sel'], 0.38, 0.2] } },
    { id: 'areas-line', type: 'line', source: 'areas', paint: { 'line-color': ['get', 'c'], 'line-width': ['case', ['get', 'sel'], 3, 1.5], 'line-dasharray': [2, 1.5] } },
    { id: 'water', type: 'fill', source: 'city', filter: ['==', ['get', 'k'], 'water'], paint: { 'fill-color': '#4f9cc9' } },
    { id: 'river', type: 'line', source: 'city', filter: ['==', ['get', 'k'], 'river'], paint: { 'line-color': '#4f9cc9', 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1.5, 18, 8] } },
    { id: 'sport', type: 'fill', source: 'city', filter: ['in', ['get', 'k'], ['literal', ['pitch', 'stadium']]], paint: { 'fill-color': byKind({ pitch: '#6cbf5c', stadium: '#e9a284' }, '#6cbf5c'), 'fill-outline-color': '#ffffff' } },
    { id: 'rail', type: 'line', source: 'city', filter: ['==', ['get', 'k'], 'rail'], paint: { 'line-color': '#8a6a4f', 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1, 18, 4], 'line-dasharray': [3, 1] } },
    {
      id: 'roads-casing', type: 'line', source: 'city', filter: ['in', ['get', 'k'], ['literal', ['street', 'road2', 'road1']]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': byKind({ road1: '#d9a43c' }, '#d8c7a2'), 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 13, ['match', ['get', 'k'], 'street', 1, 3], 18, ['match', ['get', 'k'], 'street', 12, 26]] },
    },
    {
      id: 'roads', type: 'line', source: 'city', filter: ['in', ['get', 'k'], ['literal', ['street', 'road2', 'road1']]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': byKind({ road1: '#ffd36b' }, '#fbf6ea'), 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 13, ['match', ['get', 'k'], 'street', 0.5, 2], 18, ['match', ['get', 'k'], 'street', 9, 21]] },
    },
    {
      id: 'walls', type: 'fill-extrusion', source: 'city', filter: ['in', ['get', 'k'], ['literal', ['house', 'dom', 'school', 'industry', 'bld']]],
      paint: {
        'fill-extrusion-color': byKind({ house: '#f6e7c8', dom: '#e9ecf3', school: '#fbe6a8', industry: '#cfd2d8' }, '#f3dfc6'),
        'fill-extrusion-height': ['get', 'h'],
        'fill-extrusion-opacity': 1,
      },
    },
    {
      id: 'roofs', type: 'fill-extrusion', source: 'city', filter: ['in', ['get', 'k'], ['literal', ['house', 'dom', 'school', 'industry', 'bld']]],
      paint: {
        'fill-extrusion-color': byKind({ house: '#c8553d', dom: '#6f86b5', school: '#e0a526', industry: '#8d939c' }, '#d9774f'),
        'fill-extrusion-base': ['get', 'h'],
        'fill-extrusion-height': ['+', ['get', 'h'], ['match', ['get', 'k'], 'house', 2.4, 1.4]],
        'fill-extrusion-opacity': 1,
      },
    },
    { id: 'trees', type: 'fill-extrusion', source: 'city', filter: ['==', ['get', 'k'], 'tree'], paint: { 'fill-extrusion-color': '#4a8a3f', 'fill-extrusion-base': 1.8, 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-opacity': 1 } },
    { id: 'me-acc', type: 'fill', source: 'me', paint: { 'fill-color': '#5341cd', 'fill-opacity': 0.12 } },
  ],
};

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
    map.on('load', () => {
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
