import React, { useState } from 'react';

// Ushbu fayl "Guruhlar" jonli statistikasi uchun (2026-09-28) — mavjud
// dizayn tizimidagi CSS-rang o'zgaruvchilaridan (--ios-blue va h.k., qarang
// index.css) foydalanadi, shunda diagrammalar Tailwind sinflaridagi barcha
// boshqa elementlar kabi qorong'u mavzuga avtomatik moslashadi. Yangi
// tashqi kutubxona (recharts va h.k.) QO'SHILMAYDI — loyihaning texnik
// steki (AGENTS.md) buni cheklamaydi, lekin bu yerdagi ehtiyoj (bitta
// qator trend/sparkline) hajmli kutubxonani oqlamaydi; mavjud qo'lda-SVG
// naqshi (GroupDetailScreen'dagi soatlik ustunlar) davom ettiriladi.

const IOS_BLUE = 'rgb(var(--ios-blue))';

/**
 * Kichik, interaktiv bo'lmagan chiziq-diagramma — guruh ro'yxatidagi har
 * bir qatorda "so'nggi 7 kun" tendensiyasini bir qarashda ko'rsatish uchun
 * (Apple Health/Aksiyalar ilovasidagi mini-grafik naqshi).
 */
export const Sparkline: React.FC<{ values: number[]; width?: number; height?: number }> = ({
  values,
  width = 52,
  height = 22,
}) => {
  if (values.length === 0) return null;
  const max = Math.max(1, ...values);
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - (v / max) * (height - 3) - 1.5;
    return [x, y] as const;
  });
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  const allZero = max <= 1 && values.every((v) => v === 0);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0" aria-hidden="true">
      <path
        d={path}
        fill="none"
        stroke={allZero ? 'rgb(var(--ios-fill) / 0.4)' : IOS_BLUE}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {!allZero && <circle cx={last[0]} cy={last[1]} r={2.5} fill={IOS_BLUE} />}
    </svg>
  );
};

interface TrendPoint {
  date: string; // "YYYY-MM-DD"
  total: number;
  resolved: number;
  users: number;
}

function formatDayLabel(dateKey: string): string {
  const [, m, d] = dateKey.split('-');
  return `${d}.${m}`;
}

/**
 * Kunlik trend maydon-diagrammasi (area chart) — sichqoncha/barmoq bilan
 * ustidan yurganda sana va aniq sonlarni ko'rsatuvchi tooltip bilan.
 * Dataviz ko'rsatmalariga muvofiq: yupqa (2px) chiziq, aylana-uchli,
 * baza chizig'iga tekislangan maydon to'ldirish, faqat boshi/o'rtasi/
 * oxiri sanalari yorliqlanadi (har bir nuqta emas).
 */
export const TrendAreaChart: React.FC<{ data: TrendPoint[]; metric?: 'total' | 'users' }> = ({
  data,
  metric = 'total',
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const W = 320;
  const H = 120;
  const PAD_L = 4;
  const PAD_R = 4;
  const PAD_T = 14;
  const PAD_B = 20;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  if (data.length === 0) return null;
  const values = data.map((d) => d[metric]);
  const max = Math.max(1, ...values);
  const stepX = data.length > 1 ? plotW / (data.length - 1) : 0;

  const pointFor = (i: number) => {
    const x = PAD_L + i * stepX;
    const y = PAD_T + plotH - (values[i] / max) * plotH;
    return [x, y] as const;
  };
  const points = data.map((_, i) => pointFor(i));
  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(1)},${(PAD_T + plotH).toFixed(1)} L${points[0][0].toFixed(1)},${(PAD_T + plotH).toFixed(1)} Z`;

  const handleMove = (clientX: number, svg: SVGSVGElement) => {
    const rect = svg.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach(([x], i) => {
      const dist = Math.abs(x - relX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIdx(nearest);
  };

  const active = hoverIdx !== null ? data[hoverIdx] : null;
  const activePoint = hoverIdx !== null ? points[hoverIdx] : null;
  const showEveryNth = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div className="relative select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        className="block touch-none"
        onMouseMove={(e) => handleMove(e.clientX, e.currentTarget)}
        onMouseLeave={() => setHoverIdx(null)}
        onTouchStart={(e) => handleMove(e.touches[0].clientX, e.currentTarget)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX, e.currentTarget)}
        onTouchEnd={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={IOS_BLUE} stopOpacity={0.22} />
            <stop offset="100%" stopColor={IOS_BLUE} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Bazaviy chiziq — juda past kontrast (retsessiv panjara) */}
        <line
          x1={PAD_L}
          y1={PAD_T + plotH}
          x2={W - PAD_R}
          y2={PAD_T + plotH}
          stroke="rgb(var(--ios-separator) / 0.29)"
          strokeWidth={1}
        />

        <path d={areaPath} fill="url(#trendFill)" />
        <path d={linePath} fill="none" stroke={IOS_BLUE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {activePoint && (
          <>
            <line
              x1={activePoint[0]}
              y1={PAD_T}
              x2={activePoint[0]}
              y2={PAD_T + plotH}
              stroke="rgb(var(--ios-separator) / 0.5)"
              strokeWidth={1}
              strokeDasharray="2,2"
            />
            <circle cx={activePoint[0]} cy={activePoint[1]} r={4} fill={IOS_BLUE} stroke="rgb(var(--ios-card))" strokeWidth={2} />
          </>
        )}

        {/* Sana yorliqlari — faqat bir nechtasi, to'qnashuvning oldini olish uchun */}
        {data.map((d, i) =>
          i % showEveryNth === 0 || i === data.length - 1 ? (
            <text
              key={d.date}
              x={points[i][0]}
              y={H - 4}
              fontSize={9}
              textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
              fill="rgb(var(--ios-label) / 0.4)"
            >
              {formatDayLabel(d.date)}
            </text>
          ) : null
        )}
      </svg>

      {active && (
        <div
          className="absolute top-0 pointer-events-none bg-ios-card shadow-md rounded-[8px] px-2.5 py-1.5 text-[11px] leading-snug border border-ios-separator/20"
          style={{
            left: `${Math.min(Math.max((activePoint![0] / W) * 100, 16), 84)}%`,
            transform: 'translate(-50%, 0)',
          }}
        >
          <div className="font-semibold text-ios-label">{formatDayLabel(active.date)}</div>
          <div className="text-ios-label-secondary/70">{active.total} so'rov · {active.users} kishi</div>
        </div>
      )}
    </div>
  );
};
