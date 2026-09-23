import React, { useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Leaflet'ning standart marker ikonkasi Vite bundling bilan to'g'ri
// yuklanmaydi (webpack-uslub asset yo'li kutadi) — Vite asset-import
// orqali to'g'ridan-to'g'ri paket ichidan olinadi (tashqi tarmoqqa
// bog'liq bo'lmasin uchun), aks holda xaritada marker ko'rinmay qoladi.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Olmaliq shahri markazi — xarita boshlang'ich holatda shu atrofda ochiladi.
const OLMALIQ_CENTER: [number, number] = [40.8457, 69.6072];

/**
 * Qayta ishlatiladigan xarita komponenti (2026-09, "Mahalla chegaralari"
 * xususiyati uchun) — Leaflet + OpenStreetMap (bepul, kalitsiz). ATAYLAB
 * mustaqil, izolyatsiyalangan komponent: kelajakda boshqa xarita
 * provayderiga (masalan Yandex, agar kerak bo'lib qolsa) o'tish kerak
 * bo'lsa, FAQAT shu fayl ichidagi `<TileLayer>` manbasi almashtiriladi —
 * qolgan barcha kod (poligon chizish, nuqta bosish) o'zgarishsiz qoladi.
 */
export interface MapViewProps {
  polygons?: { id: string; name: string; points: [number, number][]; color?: string }[];
  /** Chizish rejimida qo'lda belgilangan, hali saqlanmagan nuqtalar. */
  drawingPoints?: [number, number][];
  marker?: [number, number] | null;
  onMapClick?: (lat: number, lng: number) => void;
  height?: number;
  center?: [number, number];
}

function ClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export const MapView: React.FC<MapViewProps> = ({
  polygons = [],
  drawingPoints = [],
  marker = null,
  onMapClick,
  height = 320,
  center = OLMALIQ_CENTER,
}) => {
  const [mapKey] = useState(() => Math.random().toString(36).slice(2));

  return (
    <div style={{ height, borderRadius: 10, overflow: 'hidden' }}>
      <MapContainer key={mapKey} center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {polygons.map((p) => (
          <Polygon key={p.id} positions={p.points} pathOptions={{ color: p.color || 'red', weight: 2, fillOpacity: 0.12 }} />
        ))}
        {drawingPoints.length >= 2 && (
          <Polygon positions={drawingPoints} pathOptions={{ color: '#007AFF', weight: 2, dashArray: '6 4', fillOpacity: 0.08 }} />
        )}
        {marker && <Marker position={marker} />}
        <ClickHandler onMapClick={onMapClick} />
      </MapContainer>
    </div>
  );
};
