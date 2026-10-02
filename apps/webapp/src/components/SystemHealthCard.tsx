import React from 'react';

export interface SystemHealth {
  gemini: { configured: boolean };
  webhook: { reachable: boolean; urlSet?: boolean; hasCallbackQuery?: boolean; lastErrorMessage?: string | null };
  broadcastQueue: { overdueCount: number; healthy: boolean };
  database: { reachable: boolean };
  responseRate: { last24h: number | null; totalQueries: number; resolvedQueries: number };
  speed?: { medianMs: number | null; p95Ms: number | null; sample: number };
  ai?: { usedPercent: number | null; aiUsed: number; aiFallback: number };
}

type Tone = 'good' | 'warn' | 'bad' | 'neutral';

const TONE_TEXT: Record<Tone, string> = {
  good: 'text-ios-green',
  warn: 'text-[rgb(255_149_0)]',
  bad: 'text-ios-red',
  neutral: 'text-ios-label',
};

function formatSeconds(ms: number | null | undefined): string {
  if (ms == null) return '—';
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

/** Bot javob tezligi: loyiha qoidasi — 3 soniyadan kam. */
function speedTone(ms: number | null | undefined): Tone {
  if (ms == null) return 'neutral';
  if (ms <= 3000) return 'good';
  if (ms <= 6000) return 'warn';
  return 'bad';
}

function percentTone(p: number | null | undefined, good: number, warn: number): Tone {
  if (p == null) return 'neutral';
  if (p >= good) return 'good';
  if (p >= warn) return 'warn';
  return 'bad';
}

const TONE_ICON_BG: Record<Tone, string> = {
  good: 'bg-ios-green/15 text-ios-green',
  warn: 'bg-[rgb(255_149_0)]/15 text-[rgb(255_149_0)]',
  bad: 'bg-ios-red/15 text-ios-red',
  neutral: 'bg-ios-fill/15 text-ios-label-secondary',
};

/** Bitta ko'rsatkich qatori: ikonka, oddiy tildagi savol, qiymat va izoh. */
const Row: React.FC<{ icon: string; title: string; explain: string; value: string; tone: Tone }> = ({
  icon,
  title,
  explain,
  value,
  tone,
}) => (
  <div className="flex items-center gap-3 py-2.5">
    <div className={`w-9 h-9 shrink-0 rounded-[10px] flex items-center justify-center text-[18px] ${TONE_ICON_BG[tone]}`}>{icon}</div>
    <div className="flex flex-col min-w-0 flex-1">
      <span className="text-[14px] font-semibold text-ios-label leading-tight">{title}</span>
      <span className="text-[11px] text-ios-label-secondary/70 leading-snug">{explain}</span>
    </div>
    <span className={`text-[17px] font-bold tabular-nums shrink-0 ${TONE_TEXT[tone]}`}>{value}</span>
  </div>
);

const Service: React.FC<{ ok: boolean; icon: string; label: string; explain: string }> = ({ ok, icon, label, explain }) => (
  <div className="flex items-center gap-2 bg-ios-fill/[0.06] rounded-ios px-2.5 py-2 min-w-0">
    <span className="text-[16px]">{icon}</span>
    <div className="flex flex-col min-w-0 flex-1">
      <span className="text-[12px] font-semibold text-ios-label truncate">{label}</span>
      <span className={`text-[10px] truncate ${ok ? 'text-ios-green' : 'text-ios-red'}`}>{ok ? '● ' : '● '}{explain}</span>
    </div>
  </div>
);

/**
 * "Tizim holati" — admin texnik bilimsiz ham tushunishi uchun har bir
 * ko'rsatkich oddiy savol shaklida va izoh bilan ko'rsatiladi.
 */
export const SystemHealthCard: React.FC<{ health: SystemHealth }> = ({ health }) => {
  const webhookOk = health.webhook.reachable && !!health.webhook.urlSet && !!health.webhook.hasCallbackQuery;
  const servicesOk = webhookOk && health.database.reachable && health.broadcastQueue.healthy && health.gemini.configured;

  const sTone = speedTone(health.speed?.medianMs);
  const rTone = percentTone(health.responseRate.last24h, 50, 25);
  const aTone = percentTone(health.ai?.usedPercent, 80, 50);

  const overall: Tone = !servicesOk || sTone === 'bad' ? 'bad' : [sTone, rTone, aTone].includes('warn') || rTone === 'bad' || aTone === 'bad' ? 'warn' : 'good';
  const overallLabel = overall === 'good' ? '✅ Hammasi joyida' : overall === 'warn' ? '⚠️ Diqqat talab' : '⛔ Muammo bor';
  const overallBg = overall === 'good' ? 'bg-ios-green/12 text-ios-green' : overall === 'warn' ? 'bg-[rgb(255_149_0)]/12 text-[rgb(255_149_0)]' : 'bg-ios-red/12 text-ios-red';

  const rr = health.responseRate;
  const aiTotal = (health.ai?.aiUsed ?? 0) + (health.ai?.aiFallback ?? 0);

  return (
    <div className="bg-ios-card rounded-ios-lg p-3.5 shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h3 className="text-[16px] font-semibold text-ios-label">🩺 Tizim holati</h3>
          <span className="text-[11px] text-ios-label-secondary/60">Oxirgi 24 soat bo'yicha</span>
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${overallBg}`}>{overallLabel}</span>
      </div>

      <div className="flex flex-col divide-y divide-ios-separator/40">
        <Row
          icon="⚡"
          title="Bot qancha tez javob beradi?"
          explain={
            health.speed?.medianMs != null
              ? `Odatda shuncha soniyada. Eng sekin holatda: ${formatSeconds(health.speed.p95Ms)}`
              : "Hali savol bo'lmadi"
          }
          value={formatSeconds(health.speed?.medianMs)}
          tone={sTone}
        />
        <Row
          icon="🎯"
          title="Savollarga javob topildimi?"
          explain={`${rr.totalQueries} ta savoldan ${rr.resolvedQueries} tasiga bazadan javob topildi`}
          value={rr.last24h != null ? `${rr.last24h}%` : '—'}
          tone={rTone}
        />
        <Row
          icon="🤖"
          title="Sun'iy intellekt ishlayaptimi?"
          explain={
            aiTotal > 0
              ? `${health.ai?.aiUsed} ta savolni AI tushundi, ${health.ai?.aiFallback} tasi zaxira lug'at bilan`
              : "Yangi o'lchov — savollar kelishi bilan to'ladi"
          }
          value={health.ai?.usedPercent != null ? `${health.ai.usedPercent}%` : '—'}
          tone={aTone}
        />
      </div>

      <span className="text-[11px] font-semibold text-ios-label-secondary/70 uppercase tracking-wide pt-1">Xizmatlar</span>
      <div className="grid grid-cols-2 gap-2">
        <Service
          ok={webhookOk}
          icon="📡"
          label="Telegram aloqasi"
          explain={webhookOk ? 'Xabarlar kelyapti' : !health.webhook.reachable ? "Aloqa yo'q" : !health.webhook.urlSet ? 'Ulanmagan' : 'Tugmalar ishlamaydi'}
        />
        <Service ok={health.database.reachable} icon="🗄️" label="Ma'lumotlar bazasi" explain={health.database.reachable ? 'Ishlayapti' : 'Ulanmagan'} />
        <Service
          ok={health.broadcastQueue.healthy}
          icon="📨"
          label="Ommaviy xabarlar"
          explain={health.broadcastQueue.healthy ? "O'z vaqtida ketyapti" : `${health.broadcastQueue.overdueCount} ta kechikkan`}
        />
        <Service ok={health.gemini.configured} icon="🔑" label="AI kaliti" explain={health.gemini.configured ? 'Ulangan' : "Kalit yo'q"} />
      </div>
    </div>
  );
};
