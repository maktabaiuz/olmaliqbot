import React, { useState } from 'react';
import type { Listing, SearchResponse } from '../../lib/types';
import { navigate } from '../../lib/router';
import { callPhone, haptic } from '../../lib/telegram';
import { formatPhone } from '../../lib/format';
import { ListingCard } from '../../components/ListingCard';
import { Blob } from '../../components/Blob';
import { Skeleton } from '../../components/ui';

const FILTERS: { key: string; label: string; test: (l: Listing) => boolean }[] = [
  { key: 'open', label: '🟢 Hozir ochiq', test: (l) => l.open.status === 'open' },
  { key: 'home', label: '🚗 Uyga boradi', test: (l) => l.badges.includes('uyga_boradi') },
  { key: '247', label: '⏰ 24/7', test: (l) => l.badges.includes('24_7') },
  { key: 'kafolat', label: '🛡️ Kafolat', test: (l) => l.badges.includes('kafolat') },
  { key: 'verified', label: '✅ Tasdiqlangan', test: (l) => l.verified },
];

export const UnderstoodChips: React.FC<{ u: SearchResponse['understood']; onRemove: (word: string) => void }> = ({ u, onRemove }) => {
  if (!u || (!u.category && !u.landmark)) return null;
  const chip = (label: string, word: string, cls: string) => (
    <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${cls} font-label-md text-label-md shadow-sm`}>
      <span>{label}</span>
      <button aria-label="Olib tashlash" onClick={() => onRemove(word)} className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-primary/20 text-[12px] leading-none transition-colors active:scale-95" type="button">
        ×
      </button>
    </div>
  );
  return (
    <div className="flex items-center gap-space-xs flex-wrap px-1 text-on-surface-variant">
      <span className="font-headline-sm text-label-md text-primary shrink-0 mr-1 flex items-center gap-1">
        <span className="material-symbols-outlined text-[16px]">psychology_alt</span> Tushundim:
      </span>
      {u.category && chip(`🔧 ${u.category}`, u.category, 'bg-primary-fixed text-on-primary-fixed')}
      {u.landmark && chip(`📍 ${u.landmark}`, u.landmark, 'bg-secondary-fixed text-on-secondary-fixed')}
    </div>
  );
};

export const Results: React.FC<{ data: SearchResponse; onFeedback: () => void }> = ({ data, onFeedback }) => {
  const [active, setActive] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const u = data.understood;
  const reason = u?.category ? `Siz so'radingiz: ${u.category}${u.landmark ? ' · ' + u.landmark : ''}` : null;
  const pc = data.primaryCount ?? 1;
  const pass = (l: Listing) => active.every((k) => FILTERS.find((f) => f.key === k)!.test(l));
  const primary = data.items.slice(0, pc).filter(pass);
  const rest = data.items.slice(pc).filter(pass);
  const open = (id: string) => () => navigate(`/listing/${id}`);
  let n = 0;

  return (
    <div className="flex flex-col w-full pb-8 space-y-space-lg">
      {data.emergency && (
        <button onClick={() => { haptic('heavy'); navigate('/sos'); }} className="anim-slide-up w-full flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg active:scale-95 transition-transform text-left" type="button">
          <span className="material-symbols-outlined fill text-[32px] animate-bounce">emergency_home</span>
          <div className="flex-1 min-w-0">
            <p className="font-headline-sm text-headline-sm">Shoshilinch yordam kerakmi?</p>
            <p className="font-body-sm text-body-sm opacity-90">Favqulodda xizmatlar raqamlari — SOS</p>
          </div>
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      )}

      {data.service && (
        <div className="anim-slide-up flex items-center justify-between gap-3 p-3.5 rounded-lg bg-error-container/20 clay-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-error flex items-center justify-center shrink-0 shadow-sm text-on-error">
              <span className="material-symbols-outlined text-[22px]">support_agent</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-headline-sm text-headline-sm text-on-surface truncate">{data.service.label}</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">{formatPhone(data.service.phone)}</span>
            </div>
          </div>
          <button onClick={() => { haptic('medium'); callPhone(data.service!.phone); }} className="h-10 px-4 rounded-full bg-error text-on-error font-label-lg text-label-lg flex items-center gap-1.5 active:scale-95 shrink-0" type="button">
            <span className="material-symbols-outlined fill text-[18px]">call</span> Qo‘ng‘iroq
          </button>
        </div>
      )}

      {data.items.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-margin px-margin py-1">
          {FILTERS.map((f) => {
            const on = active.includes(f.key);
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => { haptic('select'); setActive((a) => (on ? a.filter((k) => k !== f.key) : [...a, f.key])); }}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-transform active:scale-95 ${on ? 'bg-primary text-on-primary clay-fab shadow-sm' : 'bg-surface-container-lowest text-on-surface clay-card hover:bg-surface-container-low'}`}
              >
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {primary.length > 0 && (
        <div className="flex flex-col space-y-space-md">
          {primary.map((l) => (
            <div key={l.id} className="anim-slide-up" style={{ animationDelay: `${n++ * 60}ms` }}>
              <ListingCard listing={l} reason={reason} onOpen={open(l.id)} />
            </div>
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <section className="flex flex-col space-y-space-sm pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-1.5">
              <span>Ehtimol bular ham</span>
              <span className="w-2 h-2 rounded-full bg-secondary inline-block" />
            </h3>
            <span className="font-label-sm text-label-sm text-on-surface-variant">{rest.length} ta</span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 opacity-90">
            {rest.map((l) => (
              <div key={l.id} className="anim-slide-up" style={{ animationDelay: `${n++ * 60}ms` }}>
                <ListingCard listing={l} dim reason={reason} onOpen={open(l.id)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {active.length > 0 && primary.length + rest.length === 0 && (
        <p className="text-center font-body-md text-body-md text-on-surface-variant py-6">Bu filtrlarga mos natija yo'q.</p>
      )}

      {data.items.length > 0 && (
        <div className="pt-2 flex flex-col items-center justify-center text-center">
          <button
            disabled={sent}
            onClick={() => { haptic('light'); setSent(true); onFeedback(); }}
            className="inline-flex items-center gap-1.5 py-2 px-4 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-low font-body-sm text-body-sm transition-colors active:scale-95"
            type="button"
          >
            {sent ? <span>✅ Rahmat! Tekshirib chiqamiz</span> : <><span>😕</span><span>Bu men so‘ragan narsa emas</span></>}
          </button>
        </div>
      )}
    </div>
  );
};

/** Stitch: tizim_holati_maskot_yuklanishi + skelet shimmer. */
export const SearchLoading: React.FC = () => (
  <div className="flex flex-col items-center text-center py-space-md">
    <div className="relative flex items-center justify-center w-40 h-40 mb-space-md">
      <div className="absolute inset-0 rounded-full bg-primary-fixed/30 animate-ping opacity-30 pointer-events-none" />
      <div className="absolute inset-2 rounded-full bg-primary-fixed/40 animate-pulse pointer-events-none" />
      <Blob shape="sphere" mood="scan" size={110} />
    </div>
    <div className="flex items-center gap-1.5 mb-space-lg">
      <h2 className="font-headline-lg text-headline-lg text-primary-container tracking-tight">Qidiryapman</h2>
      <div className="flex items-center gap-1 pt-1">
        {[0, 150, 300].map((d) => (
          <span key={d} className="w-2 h-2 rounded-full bg-primary-container animate-bounce" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
    <div className="w-full flex flex-col gap-space-md">
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
    </div>
  </div>
);

/** Stitch: qidiruv_hozircha_bazada_yo_q */
export const NotFound: React.FC<{ popular: string[]; onPick: (q: string) => void }> = ({ popular, onPick }) => (
  <div className="flex flex-col w-full">
    <section className="flex flex-col items-center text-center px-space-xs mb-space-xl anim-slide-up">
      <div className="relative w-48 h-48 mb-space-md flex items-center justify-center">
        <div className="absolute inset-4 rounded-full bg-primary/10 blur-2xl -z-10 animate-pulse" />
        <Blob shape="square" mood="sad" size={150} />
      </div>
      <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm mb-space-sm shadow-sm">
        <span className="w-2 h-2 rounded-full bg-secondary-container" />
        <span>Qidiruv natijasi: 0 ta</span>
      </div>
      <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mb-space-xs">Hozircha bazada yo'q</h2>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-[310px] leading-relaxed mb-space-lg">
        Biz faqat ishonchli ma'lumot beramiz — taxmin qilmaymiz. Siz bunday odamni bilsangiz, qo'shing, tekshirib bazaga kiritamiz.
      </p>
      <button onClick={() => { haptic('light'); navigate('/add'); }} className="w-full max-w-sm h-[52px] px-6 rounded-full bg-gradient-to-r from-primary-container to-primary text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-[0_8px_20px_-2px_rgba(108,92,231,0.42)] active:scale-95 transition-all" type="button">
        <span>➕ Ma'lumot qo'shish</span>
      </button>
    </section>
    {popular.length > 0 && (
      <section className="flex flex-col gap-space-md mb-space-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Balki sizga bular yordam berar:</h3>
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Tavsiyalar</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {popular.map((q) => (
            <button key={q} onClick={() => onPick(q)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-container-lowest clay-card text-on-surface active:scale-95 transition-transform" type="button">
              <span className="material-symbols-outlined text-[16px] text-primary">search</span>
              <span className="font-label-lg text-label-lg">{q}</span>
            </button>
          ))}
        </div>
      </section>
    )}
    <aside className="relative overflow-hidden rounded-2xl bg-secondary-fixed/50 p-space-md shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 shadow-sm">
          <span className="material-symbols-outlined text-[20px]">handshake</span>
        </div>
        <div className="flex flex-col min-w-0">
          <h4 className="font-label-lg text-label-lg text-on-surface mb-0.5">Mahalla birdamligi</h4>
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">Har bir qo'shilgan usta birinchi navbatda qo'shnilarimizga foyda keltiradi.</p>
        </div>
      </div>
    </aside>
  </div>
);
