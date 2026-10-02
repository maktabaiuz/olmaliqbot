import React, { useState } from 'react';
import { haptic } from '../../lib/telegram';

/**
 * "Olmaliq — shahar xaritasi" jonli posteri (2026-10, egasi ChatGPT'da
 * chizdirgan diorama illyustratsiyasi). Rasm sekin "nafas oladi", ustidan
 * bulutlar suzadi, har bir mashhur joyda yonib-o'chuvchi nuqta bor.
 * Joy bosilsa — haqiqiy 3D xaritada aynan o'sha koordinataga uchiladi
 * (koordinatalar OpenStreetMap'dan).
 */
export interface Place {
  id: string;
  emoji: string;
  name: string;
  /** postterdagi joy (% — chapdan, tepadan) */
  x: number;
  y: number;
  /** haqiqiy joylashuv */
  lng: number;
  lat: number;
  zoom: number;
}

export const PLACES: Place[] = [
  { id: 'qurama', emoji: '⛰️', name: "Qurama tog'lari", x: 54, y: 16, lng: 69.655, lat: 40.795, zoom: 12.6 },
  { id: 'agmk', emoji: '🏭', name: 'AGMK — mis koni va zavodi', x: 83, y: 19, lng: 69.6187, lat: 40.8286, zoom: 14.2 },
  { id: 'masjid', emoji: '🕌', name: 'Ramazoni Sharif masjidi', x: 15, y: 30, lng: 69.61126, lat: 40.85756, zoom: 17.4 },
  { id: 'stadion', emoji: '🏟️', name: 'Metallurg stadioni', x: 56, y: 31, lng: 69.60093, lat: 40.84491, zoom: 16.6 },
  { id: 'hokimiyat', emoji: '🏛️', name: 'Hokimiyat', x: 83, y: 37.5, lng: 69.60803, lat: 40.845, zoom: 17.4 },
  { id: 'saroy', emoji: '🎭', name: 'Madaniyat saroyi', x: 18, y: 45, lng: 69.60366, lat: 40.84604, zoom: 17.4 },
  { id: 'korzinka', emoji: '🛒', name: 'Korzinka', x: 53, y: 49.5, lng: 69.59662, lat: 40.85189, zoom: 17.6 },
  { id: 'vokzal', emoji: '🚌', name: 'Avtovokzal', x: 85, y: 54, lng: 69.59269, lat: 40.86409, zoom: 17.2 },
  { id: 'bozor', emoji: '🍉', name: 'Oydin dehqon bozori', x: 14, y: 78, lng: 69.59287, lat: 40.86498, zoom: 17.2 },
];

const POSTER = `${import.meta.env.BASE_URL}olmaliq-poster.webp`;

const Cloud: React.FC<{ top: string; size: number; dur: number; delay: number; opacity: number }> = ({ top, size, dur, delay, opacity }) => (
  <svg
    viewBox="0 0 120 70"
    width={size}
    className="absolute kb-drift pointer-events-none"
    style={{ top, animationDuration: `${dur}s`, animationDelay: `${delay}s`, opacity, filter: 'drop-shadow(0 8px 14px rgba(83,65,205,.18))' }}
  >
    <path d="M26 64C12 64 4 55 4 44c0-10 7-18 17-19 2-13 14-22 28-22 11 0 21 6 26 15 3-1 6-2 9-2 15 0 27 11 27 25 0 13-11 23-25 23H26z" fill="#fff" />
  </svg>
);

export const PosterIntro: React.FC<{ onPick: (p: Place) => void; onClose: () => void }> = ({ onPick, onClose }) => {
  const [loaded, setLoaded] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-[1000] bg-[#bfe3ff] flex flex-col kb-poster-in" role="dialog" aria-label="Olmaliq shahar posteri">
      <div className="relative flex-1 overflow-hidden">
        {/* Rasm — sekin "Ken Burns" harakati */}
        <div className="absolute inset-0 flex items-start justify-center overflow-y-auto no-scrollbar">
          <div className="relative w-full max-w-md my-auto">
            {!loaded && <div className="absolute inset-0 skeleton !rounded-none" style={{ aspectRatio: '2 / 3' }} />}
            <div className="kb-kenburns origin-center">
              <img src={POSTER} alt="Olmaliq — shahar xaritasi" className="w-full block select-none" draggable={false} onLoad={() => setLoaded(true)} />
              {loaded &&
                PLACES.map((p, i) => (
                  <button
                    key={p.id}
                    aria-label={p.name}
                    onClick={() => {
                      haptic('medium');
                      setHint(p.id);
                      setTimeout(() => onPick(p), 380);
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  >
                    <span className="absolute w-9 h-9 rounded-full bg-white/50 kb-hotspot-ring" style={{ animationDelay: `${i * 0.25}s` }} />
                    <span
                      className={`relative w-7 h-7 rounded-full bg-white shadow-lg flex items-center justify-center text-[15px] transition-transform ${hint === p.id ? 'scale-150' : 'kb-hotspot-bob'}`}
                      style={{ animationDelay: `${i * 0.18}s` }}
                    >
                      {p.emoji}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
        {/* Suzuvchi bulutlar */}
        <Cloud top="4%" size={120} dur={38} delay={-6} opacity={0.85} />
        <Cloud top="12%" size={80} dur={52} delay={-30} opacity={0.7} />
        <Cloud top="58%" size={100} dur={46} delay={-14} opacity={0.55} />
        <Cloud top="84%" size={70} dur={60} delay={-40} opacity={0.5} />
      </div>

      {/* Pastki panel */}
      <div className="bg-surface-container-lowest rounded-t-[2rem] -mt-6 relative z-[2] px-margin pt-4 pb-safe clay-sheet">
        <p className="text-center font-label-md text-label-md text-on-surface-variant">👆 Joyni bosing — 3D xaritada o'sha yerga uchamiz</p>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-margin px-margin py-3">
          {PLACES.filter((p) => p.id !== 'qurama').map((p) => (
            <button
              key={p.id}
              onClick={() => {
                haptic('light');
                onPick(p);
              }}
              className="shrink-0 h-10 px-3 rounded-full bg-surface-container-low font-label-md text-label-md text-on-surface flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <span>{p.emoji}</span>
              {p.name}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            haptic('medium');
            onClose();
          }}
          className="w-full h-14 mb-3 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline-sm text-headline-sm clay-fab flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[22px]">view_in_ar</span>
          3D xaritaga o'tish
        </button>
      </div>
    </div>
  );
};
