import React from 'react';

/**
 * "Kim bor?" jonli shakllari — Stitch'dagi "Borvoy" maskoti o'rniga (egasining
 * talabi bilan). Yaltiroq yumshoq 3D shakllar, faqat ikki kichik oq ko'z.
 * SVG + CSS animatsiya: rasm yuklanmaydi, ilova yengil qoladi.
 */
export type BlobShape = 'cloud' | 'drop' | 'pill' | 'sphere' | 'square' | 'bean' | 'triangle';
export type BlobMood = 'idle' | 'hop' | 'scan' | 'sad' | 'listen' | 'sleepy' | 'still';

export const BLOB_COLORS: Record<BlobShape, string> = {
  cloud: '#F2A33A',
  drop: '#E8662B',
  pill: '#4CC97A',
  sphere: '#8A3FFC',
  square: '#5F5F5F',
  bean: '#E66A2C',
  triangle: '#4FB39A',
};

/** Yozuv turi → shakl (har bir kategoriyaning doimiy shakli). */
export const SHAPE_BY_TYPE: Record<string, BlobShape> = {
  USTA: 'cloud',
  DOKON_OBYEKT: 'pill',
  MUASSASA: 'square',
  TRANSPORT: 'bean',
  ARENDA: 'triangle',
  ZAPRAVKA: 'drop',
};

const PATHS: Record<BlobShape, string> = {
  cloud: 'M22 70c-11 0-18-8-18-18 0-9 6-16 15-17 2-13 13-23 27-23 11 0 20 6 24 15 3-1 5-1 8-1 11 0 20 9 20 20 0 13-9 24-22 24H22z',
  drop: 'M50 6C50 6 18 42 18 64c0 18 14 30 32 30s32-12 32-30C82 42 50 6 50 6z',
  pill: 'M30 24h40c14 0 24 11 24 26s-10 26-24 26H30C16 76 6 65 6 50s10-26 24-26z',
  sphere: 'M50 8c23 0 42 19 42 42S73 92 50 92 8 73 8 50 27 8 50 8z',
  square: 'M28 10h44c10 0 18 8 18 18v44c0 10-8 18-18 18H28c-10 0-18-8-18-18V28c0-10 8-18 18-18z',
  bean: 'M30 18c14-6 26 4 40 2 14-2 24 10 24 26 0 20-16 32-42 32S6 70 6 52c0-16 10-28 24-34z',
  triangle: 'M44 14c3-5 9-5 12 0l34 60c3 6-1 12-7 12H17c-6 0-10-6-7-12l34-60z',
};

const EYE_Y: Record<BlobShape, number> = { cloud: 40, drop: 52, pill: 44, sphere: 38, square: 36, bean: 40, triangle: 54 };

const MOOD_CLASS: Record<BlobMood, string> = {
  idle: 'blob-breathe',
  hop: 'blob-hop',
  scan: 'blob-breathe',
  sad: 'blob-tilt',
  listen: 'blob-breathe',
  sleepy: 'blob-breathe',
  still: '',
};

export const Blob: React.FC<{
  shape?: BlobShape;
  mood?: BlobMood;
  size?: number;
  color?: string;
  className?: string;
  label?: string;
  delay?: number;
}> = ({ shape = 'sphere', mood = 'idle', size = 64, color, className = '', label, delay = 0 }) => {
  const fill = color || BLOB_COLORS[shape];
  const id = React.useId().replace(/:/g, '');
  const ey = EYE_Y[shape] + (mood === 'sad' ? 6 : 0);
  const eyeRy = mood === 'sleepy' ? 2 : 6;
  return (
    <span className={`relative inline-flex blob-tap ${className}`} style={{ width: size, height: size }} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {mood === 'listen' && (
        <>
          <span className="absolute inset-0 rounded-full blob-ring" style={{ border: `3px solid ${fill}` }} />
          <span className="absolute inset-0 rounded-full blob-ring" style={{ border: `3px solid ${fill}`, animationDelay: '.9s' }} />
        </>
      )}
      <svg viewBox="0 0 100 100" width={size} height={size} className={MOOD_CLASS[mood]} style={{ overflow: 'visible', animationDelay: `${delay}s` }}>
        <defs>
          <radialGradient id={`g${id}`} cx="35%" cy="28%" r="80%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="35%" stopColor={fill} stopOpacity="1" />
            <stop offset="100%" stopColor={fill} stopOpacity="1" />
          </radialGradient>
          <filter id={`s${id}`} x="-30%" y="-30%" width="160%" height="170%">
            <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor={fill} floodOpacity="0.35" />
          </filter>
        </defs>
        <path d={PATHS[shape]} fill={`url(#g${id})`} filter={`url(#s${id})`} />
        <path d={PATHS[shape]} fill="none" stroke="#000" strokeOpacity="0.06" strokeWidth="2" />
        <g className={mood === 'scan' ? 'blob-scan' : undefined}>
          <g className="blob-eyes">
            <ellipse cx="41" cy={ey} rx="4.2" ry={eyeRy} fill="#fff" />
            <ellipse cx="59" cy={ey} rx="4.2" ry={eyeRy} fill="#fff" />
          </g>
        </g>
      </svg>
    </span>
  );
};

/** Bir nechta shakl birga sakraydi (muvaffaqiyat, onboarding). */
export const BlobFamily: React.FC<{ size?: number; shapes?: BlobShape[] }> = ({ size = 48, shapes = ['cloud', 'pill', 'sphere', 'triangle', 'drop'] }) => (
  <div className="flex items-end justify-center gap-2">
    {shapes.map((s, i) => (
      <Blob key={s} shape={s} size={s === 'sphere' ? size * 1.3 : size} mood="hop" delay={i * 0.12} />
    ))}
  </div>
);
