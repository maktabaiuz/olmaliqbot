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

/**
 * Umumiy (bir o'lchamli) tendensiya grafigi — a'zolar soni kabi bitta
 * qiymatli qatorlar uchun. TrendAreaChart bilan bir xil chizish mantig'i,
 * lekin ma'lumot shakli umumiy ({date, value}) va tooltip matni tashqaridan
 * beriladi.
 */
export const GenericTrendChart: React.FC<{
  data: { date: string; value: number }[];
  tooltipSuffix?: string;
}> = ({ data, tooltipSuffix = '' }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const W = 320;
  const H = 90;
  const PAD_L = 4;
  const PAD_R = 4;
  const PAD_T = 12;
  const PAD_B = 18;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  if (data.length < 2) {
    return (
      <p className="text-[13px] text-ios-label-secondary/70 text-center py-4">
        Tendensiya uchun kamida 2 kunlik ma'lumot kerak — kuzatuv boshlandi, kuting.
      </p>
    );
  }
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(1, ...values);
  const range = Math.max(1, max - min);
  const stepX = plotW / (data.length - 1);

  const pointFor = (i: number) => {
    const x = PAD_L + i * stepX;
    const y = PAD_T + plotH - ((values[i] - min) / range) * plotH;
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
  const showEveryNth = Math.max(1, Math.ceil(data.length / 5));

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
          <linearGradient id="genericTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={IOS_BLUE} stopOpacity={0.18} />
            <stop offset="100%" stopColor={IOS_BLUE} stopOpacity={0} />
          </linearGradient>
        </defs>
        <line x1={PAD_L} y1={PAD_T + plotH} x2={W - PAD_R} y2={PAD_T + plotH} stroke="rgb(var(--ios-separator) / 0.29)" strokeWidth={1} />
        <path d={areaPath} fill="url(#genericTrendFill)" />
        <path d={linePath} fill="none" stroke={IOS_BLUE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {activePoint && (
          <>
            <line x1={activePoint[0]} y1={PAD_T} x2={activePoint[0]} y2={PAD_T + plotH} stroke="rgb(var(--ios-separator) / 0.5)" strokeWidth={1} strokeDasharray="2,2" />
            <circle cx={activePoint[0]} cy={activePoint[1]} r={4} fill={IOS_BLUE} stroke="rgb(var(--ios-card))" strokeWidth={2} />
          </>
        )}
        {data.map((d, i) =>
          i % showEveryNth === 0 || i === data.length - 1 ? (
            <text key={d.date} x={points[i][0]} y={H - 4} fontSize={9} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} fill="rgb(var(--ios-label) / 0.4)">
              {formatDayLabel(d.date)}
            </text>
          ) : null
        )}
      </svg>
      {active && (
        <div
          className="absolute top-0 pointer-events-none bg-ios-card shadow-md rounded-[8px] px-2.5 py-1.5 text-[11px] leading-snug border border-ios-separator/20"
          style={{ left: `${Math.min(Math.max((activePoint![0] / W) * 100, 16), 84)}%`, transform: 'translate(-50%, 0)' }}
        >
          <div className="font-semibold text-ios-label">{formatDayLabel(active.date)}</div>
          <div className="text-ios-label-secondary/70">{active.value}{tooltipSuffix}</div>
        </div>
      )}
    </div>
  );
};

/**
 * Yotiq ustunli reyting ro'yxati — "eng faol odamlar", "eng ko'p so'ralgan
 * kategoriyalar/mo'ljallar" kabi bir xil shakldagi "yorliq + son + nisbiy
 * ustun" ro'yxatlari uchun umumiy komponent. O'zi karta o'rab olmaydi —
 * mavjud `bg-ios-card rounded-ios shadow-sm` konteyneri ichida ishlatiladi.
 */
export const HorizontalBarList: React.FC<{
  items: { label: string; count: number }[];
  emptyText: string;
}> = ({ items, emptyText }) => {
  if (items.length === 0) {
    return <div className="p-3.5 text-[13px] text-ios-label-secondary/70 text-center">{emptyText}</div>;
  }
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <>
      {items.map((item, idx) => (
        <div
          key={`${item.label}-${idx}`}
          className="px-3.5 py-2.5"
          style={idx === 0 ? undefined : { borderTop: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[14px] text-ios-label truncate">{item.label}</span>
            <span className="text-[13px] text-ios-label-secondary/70 shrink-0 ml-2">{item.count}</span>
          </div>
          <div className="h-1.5 rounded-full bg-ios-fill/[0.12] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(4, (item.count / max) * 100)}%`, backgroundColor: IOS_BLUE }}
            />
          </div>
        </div>
      ))}
    </>
  );
};

/**
 * Ikki/uch bo'lakli segmentlangan nisbat chizig'i — "sodiq vs bir martalik
 * foydalanuvchi", "til taqsimoti" kabi ulushlarni bitta chiziqda ko'rsatish
 * uchun.
 */
export const RatioBar: React.FC<{
  segments: { label: string; value: number; color: string }[];
}> = ({ segments }) => {
  const total = Math.max(1, segments.reduce((s, seg) => s + seg.value, 0));
  return (
    <div>
      <div className="flex h-2.5 rounded-full overflow-hidden gap-[2px]">
        {segments.map((seg, i) => (
          <div
            key={i}
            style={{ width: `${(seg.value / total) * 100}%`, backgroundColor: seg.color }}
            className="h-full first:rounded-l-full last:rounded-r-full"
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[12px] text-ios-label-secondary/80">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            {seg.label}: <span className="font-medium text-ios-label">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Dumaloq "salomatlik balli" o'lchagichi (0-100) — bir nechta ko'rsatkichni
 * yagona, bir qarashda tushunarli raqamga birlashtiradi. Rang bosqichlari:
 * qizil (<50) / sariq (50-79) / yashil (80+).
 */
export const HealthScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 96 }) => {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);
  const color = score >= 80 ? 'rgb(var(--ios-green))' : score >= 50 ? 'rgb(var(--ios-orange))' : 'rgb(var(--ios-red))';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--ios-fill) / 0.12)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size * 0.28} fontWeight={700} fill="rgb(var(--ios-label))">
        {score}
      </text>
    </svg>
  );
};
