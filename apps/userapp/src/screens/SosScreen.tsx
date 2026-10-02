import React from 'react';
import type { Route } from '../lib/router';
import { goBack } from '../lib/router';
import { api } from '../lib/api';
import { callPhone, haptic } from '../lib/telegram';
import { formatPhone } from '../lib/format';
import { useAsync, Skeleton } from '../components/ui';

type Row = { key: string; label: string; phone: string };

const FALLBACK: Row[] = [
  { key: '112', label: 'Yagona qutqaruv xizmati', phone: '112' },
  { key: '103', label: 'Tez yordam', phone: '103' },
  { key: '101', label: "Yong'in xizmati", phone: '101' },
  { key: '102', label: 'Militsiya', phone: '102' },
  { key: '104', label: 'Gaz avariya xizmati', phone: '104' },
];

const STYLE: Record<string, { icon: string; num: string; box: string; border: string; btn: string }> = {
  '103': { icon: 'medical_services', num: 'text-emerald-800', box: 'bg-emerald-500', border: 'border-emerald-100', btn: 'bg-emerald-500' },
  '101': { icon: 'local_fire_department', num: 'text-orange-800', box: 'bg-orange-500', border: 'border-orange-100', btn: 'bg-orange-500' },
  '102': { icon: 'local_police', num: 'text-blue-800', box: 'bg-blue-500', border: 'border-blue-100', btn: 'bg-blue-500' },
  '104': { icon: 'gas_meter', num: 'text-amber-800', box: 'bg-amber-500', border: 'border-amber-100', btn: 'bg-amber-500' },
};
const DEFAULT_STYLE = { icon: 'emergency', num: 'text-primary', box: 'bg-primary', border: 'border-surface-container-high', btn: 'bg-primary' };

const dial = (phone: string) => {
  haptic('heavy');
  callPhone(phone);
};

const CallBtn: React.FC<{ phone: string; label: string; className: string }> = ({ phone, label, className }) => (
  <button
    type="button"
    aria-label={`${label} — qo'ng'iroq`}
    onClick={() => dial(phone)}
    className={`w-12 h-12 min-w-[48px] rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-transform shrink-0 ${className}`}
  >
    <span className="material-symbols-outlined text-[26px] fill">call</span>
  </button>
);

export const SosScreen: React.FC<{ route: Route }> = () => {
  const { data, loading } = useAsync(() => api.emergency(), []);
  const national = data?.national?.length ? data.national : FALLBACK;
  const hero = national.find((r) => r.phone === '112');
  const rest = national.filter((r) => r !== hero);
  const local = data?.local || [];

  return (
    <div className="min-h-screen bg-[#f0f6fa]">
      <header className="fixed top-0 inset-x-0 z-50 pt-safe bg-[#f0f6fa]/90 backdrop-blur-xl border-b border-surface-container-high/60">
        <div className="h-14 px-4 flex items-center justify-between max-w-[430px] mx-auto">
          <button aria-label="Orqaga" type="button" onClick={goBack} className="inline-flex items-center gap-1.5 py-1 px-2 -ml-2 rounded-xl text-primary font-bold text-[15px] active:bg-primary/10 transition-colors">
            <span className="material-symbols-outlined text-[22px]">arrow_back_ios_new</span>
            <span>Orqaga</span>
          </button>
          <div className="flex flex-col text-left">
            <span className="font-headline-sm text-[16px] leading-tight font-extrabold text-on-surface">Favqulodda yordam</span>
            <span className="text-[10px] text-outline font-semibold tracking-wide uppercase">Kim bor? Olmaliq SOS</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100/90 text-emerald-800 border border-emerald-200/70">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
            </span>
            <span className="text-[11px] font-bold tracking-tight">24/7</span>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[430px] mx-auto pt-[68px] pb-safe px-4 flex flex-col gap-5">
        <section className="flex flex-col gap-2.5 mt-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-error text-[20px] fill">emergency</span>
              <h2 className="text-[16px] font-extrabold text-on-surface tracking-tight">Shoshilinch xizmatlar (Tezkor)</h2>
            </div>
            <span className="text-[11px] font-bold text-error bg-error-container/60 px-2 py-0.5 rounded-full uppercase tracking-wider">Bepul aloqa</span>
          </div>

          {hero && (
            <div className="anim-slide-up bg-gradient-to-r from-red-600 via-rose-600 to-red-700 rounded-2xl p-3.5 shadow-[0_8px_24px_rgba(220,38,38,0.30)] text-white flex items-center justify-between gap-3 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
              <div className="flex items-center gap-3 min-w-0 z-10">
                <div className="min-w-[52px] min-h-[52px] rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[32px] text-white fill">e911_emergency</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[26px] font-black tracking-tight leading-none">{hero.phone}</span>
                    <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-md bg-white/25 tracking-wide">Yagona qutqaruv</span>
                  </div>
                  <h3 className="text-[14px] font-bold text-white/95 leading-tight mt-1 truncate">{hero.label}</h3>
                  <p className="text-[11px] text-white/80 font-medium">Barcha favqulodda vaziyatlar bo'yicha markaz</p>
                </div>
              </div>
              <CallBtn phone={hero.phone} label={hero.label} className="z-10 bg-white text-red-600" />
            </div>
          )}

          {rest.map((r, i) => {
            const s = STYLE[r.phone] || DEFAULT_STYLE;
            return (
              <div key={r.key} className={`anim-slide-up bg-white rounded-2xl p-3.5 shadow-[0_4px_16px_rgba(0,0,0,0.04)] border ${s.border} flex items-center justify-between gap-3`} style={{ animationDelay: `${(i + 1) * 60}ms` }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-12 h-12 min-w-[48px] rounded-2xl ${s.box} text-white flex items-center justify-center shrink-0`}>
                    <span className="material-symbols-outlined text-[28px] fill">{s.icon}</span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[20px] font-black leading-none ${s.num}`}>{r.phone}</span>
                    <span className="text-[13px] font-bold text-on-surface truncate">{r.label}</span>
                  </div>
                </div>
                <CallBtn phone={r.phone} label={r.label} className={`${s.btn} text-white`} />
              </div>
            );
          })}
        </section>

        {loading && !data && <Skeleton className="h-20" />}
        {local.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 px-1">
              <span className="material-symbols-outlined text-primary text-[20px] fill">location_city</span>
              <h2 className="text-[16px] font-extrabold text-on-surface tracking-tight">Olmaliq shahar xizmatlari</h2>
            </div>
            <div className="bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-surface-container-high/80 divide-y divide-surface-container-high/60">
              {local.map((r, i) => (
                <div key={r.key} className="anim-slide-up p-3.5 flex items-center justify-between gap-3" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex flex-col min-w-0">
                    <h3 className="text-[14px] font-bold text-on-surface">{r.label}</h3>
                    <span className="text-[12px] font-bold text-primary mt-1">{formatPhone(r.phone)}</span>
                  </div>
                  <button
                    type="button"
                    aria-label={`${r.label} — qo'ng'iroq`}
                    onClick={() => dial(r.phone)}
                    className="w-11 h-11 min-w-[44px] rounded-xl bg-surface-container text-primary flex items-center justify-center active:scale-95 transition-all shrink-0"
                  >
                    <span className="material-symbols-outlined text-[22px] fill">call</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-red-500/15 border-2 border-amber-500/30 rounded-2xl p-4 shadow-sm relative overflow-hidden mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <span className="material-symbols-outlined text-[24px] fill">warning</span>
            </div>
            <div className="flex flex-col min-w-0">
              <h4 className="text-[14px] font-extrabold text-amber-950 uppercase tracking-wide">🚨 Gaz hidi sezilsa nima qilish kerak?</h4>
              <ol className="mt-2 text-[12px] text-amber-950/90 font-medium space-y-1.5">
                {['Chiroq yoki elektr moslamalarini aslo yoqmang;', 'Deraza va eshiklarni zudlik bilan oching;', "104 yoki 112 raqamiga xavfsiz joydan qo'ng'iroq qiling!"].map((t, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="font-bold text-amber-800">{i + 1}.</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className="mt-3.5 pt-3 border-t border-amber-500/20">
            <button type="button" onClick={() => dial('104')} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-red-600 text-white py-3 px-4 rounded-xl font-bold text-[14px] shadow-[0_4px_14px_rgba(217,119,6,0.35)] active:scale-[0.98] transition-transform">
              <span className="material-symbols-outlined text-[20px] fill">call</span>
              <span>104 ga shoshilinch qo'ng'iroq qilish</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};
