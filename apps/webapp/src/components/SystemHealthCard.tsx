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

const Metric: React.FC<{ icon: string; label: string; value: string; tone: Tone; hint: string }> = ({
  icon,
  label,
  value,
  tone,
  hint,
}) => (
  <div className="flex flex-col gap-0.5 bg-ios-fill/[0.06] rounded-ios px-2.5 py-2.5 min-w-0">
    <span className="text-[11px] font-medium text-ios-label-secondary/80 truncate">
      {icon} {label}
    </span>
    <span className={`text-[22px] font-bold leading-tight tabular-nums ${TONE_TEXT[tone]}`}>{value}</span>
    <span className="text-[10px] text-ios-label-secondary/60 leading-snug">{hint}</span>
  </div>
);

const ServiceDot: React.FC<{ ok: boolean; label: string; badLabel?: string }> = ({ ok, label, badLabel }) => (
  <span className={`flex items-center gap-1.5 text-[11px] font-medium ${ok ? 'text-ios-label-secondary' : 'text-ios-red'}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-ios-green' : 'bg-ios-red'}`} />
    {ok ? label : badLabel || label}
  </span>
);

/**
 * "Tizim holati" (2026-10-02 qayta loyihalangan). Avvalgi kartada
 * "Javob darajasi (24s)" yozuvi "24 soniya" deb tushunilgan, aslida
 * "24 soat ichida javob topilgan so'rovlar ulushi" edi, va "Gemini:
 * ishlayapti" faqat kalit borligini bildirardi. Endi uchta aniq, haqiqiy
 * ko'rsatkich — tezlik, javob topilgani, AI ulushi — va xizmatlar holati.
 */
export const SystemHealthCard: React.FC<{ health: SystemHealth }> = ({ health }) => {
  const webhookOk = health.webhook.reachable && !!health.webhook.urlSet && !!health.webhook.hasCallbackQuery;
  const servicesOk = webhookOk && health.database.reachable && health.broadcastQueue.healthy && health.gemini.configured;

  const sTone = speedTone(health.speed?.medianMs);
  const rTone = percentTone(health.responseRate.last24h, 50, 25);
  const aTone = percentTone(health.ai?.usedPercent, 80, 50);

  const overall: Tone = !servicesOk || sTone === 'bad' ? 'bad' : [sTone, rTone, aTone].includes('warn') || rTone === 'bad' || aTone === 'bad' ? 'warn' : 'good';
  const overallLabel = overall === 'good' ? 'Hammasi joyida' : overall === 'warn' ? 'Diqqat talab' : 'Muammo bor';
  const overallBg = overall === 'good' ? 'bg-ios-green/12 text-ios-green' : overall === 'warn' ? 'bg-[rgb(255_149_0)]/12 text-[rgb(255_149_0)]' : 'bg-ios-red/12 text-ios-red';

  const webhookBad = !health.webhook.reachable
    ? "Webhook: aloqa yo'q"
    : !health.webhook.urlSet
      ? 'Webhook: sozlanmagan'
      : 'Webhook: tugmalar ishlamaydi';

  return (
    <div className="bg-ios-card rounded-ios-lg p-3.5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h3 className="text-[15px] font-semibold text-ios-label">Tizim holati</h3>
          <span className="text-[11px] text-ios-label-secondary/60">Oxirgi 24 soat</span>
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${overallBg}`}>{overallLabel}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric
          icon="⚡"
          label="Javob tezligi"
          value={formatSeconds(health.speed?.medianMs)}
          tone={sTone}
          hint={health.speed?.p95Ms != null ? `Eng sekini: ${formatSeconds(health.speed.p95Ms)}` : "Ma'lumot yo'q"}
        />
        <Metric
          icon="🎯"
          label="Javob topildi"
          value={health.responseRate.last24h != null ? `${health.responseRate.last24h}%` : '—'}
          tone={rTone}
          hint={`${health.responseRate.resolvedQueries} / ${health.responseRate.totalQueries} savol`}
        />
        <Metric
          icon="🤖"
          label="AI tushundi"
          value={health.ai?.usedPercent != null ? `${health.ai.usedPercent}%` : '—'}
          tone={aTone}
          hint={health.ai ? `Zaxirada: ${health.ai.aiFallback} ta` : "Ma'lumot yo'q"}
        />
      </div>

      <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 pt-0.5">
        <ServiceDot ok={webhookOk} label="Webhook" badLabel={webhookBad} />
        <ServiceDot ok={health.database.reachable} label="Baza" badLabel="Baza ulanmagan" />
        <ServiceDot
          ok={health.broadcastQueue.healthy}
          label="Xabar navbati"
          badLabel={`Navbat: ${health.broadcastQueue.overdueCount} ta kechikkan`}
        />
        <ServiceDot ok={health.gemini.configured} label="AI kaliti" badLabel="AI kaliti yo'q" />
      </div>
    </div>
  );
};
