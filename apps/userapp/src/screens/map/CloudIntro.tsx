import React, { useEffect, useState } from 'react';

/**
 * Xarita ochilganda "bulut ichidan chiqish" animatsiyasi: xaritani yopib
 * turgan yumshoq bulutlar har tomonga tarqaladi, xarita esa bir vaqtda
 * yaqinlashadi (MapScreen'da flyTo). ~1.6 s, keyin o'zi yo'qoladi.
 */
const CLOUDS = [
  { x: -8, y: 6, s: 1.5, dx: -140, dy: -40, d: 0 },
  { x: 40, y: -6, s: 1.3, dx: 30, dy: -160, d: 60 },
  { x: 72, y: 12, s: 1.6, dx: 160, dy: -50, d: 30 },
  { x: -12, y: 46, s: 1.4, dx: -170, dy: 10, d: 90 },
  { x: 30, y: 38, s: 1.9, dx: -20, dy: 40, d: 0 },
  { x: 68, y: 52, s: 1.5, dx: 170, dy: 30, d: 120 },
  { x: 4, y: 80, s: 1.6, dx: -130, dy: 140, d: 60 },
  { x: 50, y: 84, s: 1.4, dx: 60, dy: 170, d: 150 },
  { x: 80, y: 88, s: 1.3, dx: 150, dy: 140, d: 30 },
];

const CloudShape: React.FC<{ scale: number }> = ({ scale }) => (
  <svg viewBox="0 0 120 70" width={150 * scale} height={88 * scale} style={{ filter: 'drop-shadow(0 10px 18px rgba(83,65,205,0.14))' }}>
    <path
      d="M26 64C12 64 4 55 4 44c0-10 7-18 17-19 2-13 14-22 28-22 11 0 21 6 26 15 3-1 6-2 9-2 15 0 27 11 27 25 0 13-11 23-25 23H26z"
      fill="#ffffff"
    />
    <ellipse cx="44" cy="22" rx="16" ry="7" fill="#fff" opacity="0.9" />
  </svg>
);

export const CloudIntro: React.FC = () => {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGone(true), 1700);
    return () => clearTimeout(t);
  }, []);
  if (gone) return null;
  return (
    <div className="absolute inset-0 z-[600] pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#eef0ff] to-[#f4fafd] kb-cloud-veil" />
      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="absolute kb-cloud"
          style={{ left: `${c.x}%`, top: `${c.y}%`, ['--dx' as string]: `${c.dx}%`, ['--dy' as string]: `${c.dy}%`, animationDelay: `${c.d}ms` }}
        >
          <CloudShape scale={c.s} />
        </div>
      ))}
    </div>
  );
};
