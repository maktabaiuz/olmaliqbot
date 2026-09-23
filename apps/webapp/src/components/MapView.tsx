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
 * xususiyati uchun) — Leaflet, ikkita bepul-kalitsiz fon qatlami bilan:
 * sun'iy yo'ldosh (Esri, aniq chegara chizish uchun tavsiya) va
 * ko'cha-xarita (OpenStreetMap, nom/yozuvlar kerak bo'lsa). Xaritadagi
 * tugma orqali almashtiriladi. ATAYLAB mustaqil, izolyatsiyalangan
 * komponent: kelajakda boshqa provayderga (masalan Yandex, agar kerak
 * bo'lib qolsa) o'tish kerak bo'lsa, FAQAT shu fayldagi LAYER_SOURCES
 * o'zgartiriladi — qolgan barcha kod (poligon chizish, nuqta bosish)
 * o'zgarishsiz qoladi.
 */
export interface MapViewProps {
  polygons?: { id: string; name: string; points: [number, number][]; color?: string }[];
  /** Chizish rejimida qo'lda belgilangan, hali saqlanmagan nuqtalar. */
  drawingPoints?: [number, number][];
  marker?: [number, number] | null;
  onMapClick?: (lat: number, lng: number) => void;
  height?: number;
  center?: [number, number];
  /** Boshlang'ich fon qatlami — "satellite" chegara chizishda tavsiya
   * etiladi (binolar/ko'chalar ko'rinadi), "streets" esa nom/yozuvlar
   * kerak bo'lganda. Foydalanuvchi xaritadagi tugma orqali istalgan
   * vaqtda almashtira oladi. */
  defaultLayer?: 'satellite' | 'streets';
}

// Sun'iy yo'ldosh fotosurat (2026-09) — Esri World Imagery, bepul,
// KALITSIZ. Esri shartlarida ANIQ ruxsat berilgan: "the non-exclusive
// right to use the World Imagery map to trace features... in the
// creation of vector data" — bu aynan bizning holatimiz (mahalla
// chegarasini ko'zga ko'rinib chizish). OpenStreetMap'da esa Olmaliq
// mahallalarining ALOHIDA chegarasi umuman yo'q (faqat butun shahar
// chegarasi bor) — shu sabab chizishda haqiqiy fotosuratga tayanish
// eng aniq variant.
const LAYER_SOURCES = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  },
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
};

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
  defaultLayer = 'satellite',
}) => {
  const [mapKey] = useState(() => Math.random().toString(36).slice(2));
  const [layer, setLayer] = useState<'satellite' | 'streets'>(defaultLayer);
  const source = LAYER_SOURCES[layer];

  return (
    <div style={{ height, borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
      <button
        type="button"
        onClick={() => setLayer((l) => (l === 'satellite' ? 'streets' : 'satellite'))}
        style={{
          position: 'absolute', top: 8, right: 8, zIndex: 1000,
          background: 'white', border: 'none', borderRadius: 8, padding: '6px 10px',
          fontSize: 12, fontWeight: 600, color: '#007AFF', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', cursor: 'pointer',
        }}
      >
        {layer === 'satellite' ? '🗺️ Ko\'cha xaritasi' : '🛰️ Sun\'iy yo\'ldosh'}
      </button>
      <MapContainer key={mapKey} center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
        <TileLayer key={layer} attribution={source.attribution} url={source.url} maxZoom={19} />
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
