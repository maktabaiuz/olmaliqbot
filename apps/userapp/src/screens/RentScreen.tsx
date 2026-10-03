import React, { useMemo, useState } from 'react';
import type { Route } from '../lib/router';
import { navigate } from '../lib/router';
import { api } from '../lib/api';
import type { Listing } from '../lib/types';
import { haptic } from '../lib/telegram';
import { useAsync, Skeleton, StateView, ErrorView, useToast } from '../components/ui';
import { Blob } from '../components/Blob';
import { RentCard } from './rent/RentCard';

const SEGMENTS = [
  { key: 'kv', label: 'Kvartiralar', emoji: '🏢', words: ['kvartira'] },
  { key: 'uy', label: 'Hovli Uy', emoji: '🏡', words: ['uy', 'hovli'] },
  { key: 'car', label: 'Mashina', emoji: '🚗', words: ['mashina', 'avto'] },
  { key: 'ofis', label: "Ofis / Do'kon", emoji: '💼', words: ['ofis', "do'kon", 'dokon'] },
];
const ROOMS = [1, 2, 3, 4];
const TERMS = [
  { key: 'KUNLIK', label: 'Kunlik' },
  { key: 'OYLIK', label: 'Oylik' },
  { key: 'YILLIK', label: 'Yillik' },
] as const;

const catName = (l: Listing) => (l.category?.name || '').toLowerCase();
const inSeg = (l: Listing, words: string[]) => {
  const n = catName(l);
  // "uy" alohida so'z sifatida — "uyali" kabi so'zlarga tushmasin; kvartira "uy" emas.
  return words.some((w) => (w === 'uy' ? /(^|[^a-z'])uy([^a-z']|$)/.test(n) && !n.includes('kvartira') : n.includes(w)));
};

export const RentScreen: React.FC<{ route: Route }> = () => {
  const { data, error, loading, reload } = useAsync(() => api.listings({ type: 'ARENDA' }), []);
  const [seg, setSeg] = useState<string | null>(null);
  const [rooms, setRooms] = useState<number | null>(null);
  const [term, setTerm] = useState<string | null>(null);
  const [cur, setCur] = useState<'UZS' | 'USD'>('UZS');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [q, setQ] = useState('');
  const toast = useToast();
  const mine = useAsync(() => api.myRentals(), []);
  const [armDel, setArmDel] = useState<string | null>(null);
  const all = data?.items || [];

  const items = useMemo(() => {
    const s = SEGMENTS.find((x) => x.key === seg);
    const lo = Number(min.replace(/\D/g, '')) || 0;
    const hi = Number(max.replace(/\D/g, '')) || Infinity;
    const priced = lo > 0 || hi < Infinity;
    const qq = q.trim().toLowerCase();
    return all.filter((l) => {
      if (s && !inSeg(l, s.words)) return false;
      if (qq && !`${l.name} ${l.landmark?.name || ''} ${l.description || ''} ${l.serviceAreas.map((a) => a.name).join(' ')}`.toLowerCase().includes(qq)) return false;
      if (rooms && !(l.rent?.rooms != null && (rooms === 4 ? l.rent.rooms >= 4 : l.rent.rooms === rooms))) return false;
      if (term && l.rent?.term !== term) return false;
      if (priced && !(l.rent && (l.rent.currency || 'UZS') === cur && l.rent.price >= lo && l.rent.price <= hi)) return false;
      return true;
    });
  }, [all, seg, rooms, term, cur, min, max, q]);

  const pick = <T,>(set: (v: T) => void, v: T) => {
    haptic('select');
    set(v);
  };
  const pillCls = (a: boolean) =>
    `px-3.5 py-1.5 rounded-full font-label-sm text-label-sm shrink-0 active:scale-95 transition-transform ${a ? 'bg-primary text-on-primary font-bold shadow-xs' : 'bg-surface-container-low text-on-surface-variant'}`;

  return (
    <main className="flex flex-col w-full px-margin pt-safe pb-28 bg-surface min-h-screen">
      <div className="flex flex-col w-full pt-4 pb-8 space-y-space-lg">
        <div className="relative overflow-hidden rounded-lg bg-surface-container-lowest p-space-md clay-card anim-slide-up">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-primary-fixed/30 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-space-md relative z-10">
            <div className="relative shrink-0">
              <Blob shape="triangle" size={64} />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-tertiary-fixed flex items-center justify-center text-[10px]">🔑</span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-headline-sm text-headline-sm text-primary">Ijara bozori</span>
                <span className="bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm px-2 py-0.5 rounded-full">Olmaliq</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-tight">Olmaliqdagi ijara e'lonlari — kvartira, uy, mashina va ofislar.</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            haptic('medium');
            navigate('/rent/add');
          }}
          className="w-full h-16 rounded-lg bg-gradient-to-r from-primary to-primary-container text-on-primary clay-fab flex items-center gap-3 px-4 active:scale-[0.98] transition-transform anim-slide-up"
        >
          <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-[22px]">🏠</span>
          <span className="flex flex-col items-start">
            <span className="font-headline-sm text-headline-sm">Uyimni ijaraga beraman</span>
            <span className="font-label-sm text-label-sm opacity-85">Bepul e'lon — 1 daqiqada</span>
          </span>
          <span className="material-symbols-outlined ml-auto">arrow_forward</span>
        </button>

        {(mine.data?.items || []).length > 0 && (
          <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col gap-3">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Mening e'lonlarim</span>
            {mine.data!.items.map((m) => {
              const st =
                m.moderationStatus === 'rejected'
                  ? { t: '● Rad etildi — tahrirlab qayta yuboring', c: 'text-error' }
                  : m.moderationStatus === 'pending'
                    ? { t: '● Tekshirilmoqda', c: 'text-secondary' }
                    : m.status === 'ACTIVE'
                      ? { t: "● Faol — odamlar ko'ryapti", c: 'text-tertiary' }
                      : m.status === 'ARCHIVED'
                        ? { t: '● Yopilgan', c: 'text-outline' }
                        : { t: "● To'xtatilgan", c: 'text-outline' };
              const act = async (fn: () => Promise<unknown>, ok: string) => {
                haptic('medium');
                try {
                  await fn();
                  toast(ok, 'success');
                } catch {
                  toast("Bo'lmadi, qayta urinib ko'ring", 'error');
                }
                mine.reload();
                reload();
              };
              return (
                <div key={m.id} className="flex flex-col gap-2 border-b border-surface-container last:border-0 pb-3 last:pb-0">
                  <button onClick={() => m.status === 'ACTIVE' && navigate('/rent/' + m.id)} className="text-left">
                    <p className="font-label-lg text-label-lg text-on-surface truncate">{m.name}{m.landmark ? ` · ${m.landmark.name}` : ''}</p>
                    <p className={`font-label-sm text-label-sm ${st.c}`}>{st.t}</p>
                  </button>
                  {m.moderationStatus === 'rejected' && m.rejectionNote && (
                    <p className="font-body-sm text-body-sm text-on-surface bg-error-container/40 rounded-lg p-2.5">💬 {m.rejectionNote}</p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => navigate('/rent/edit/' + m.id)} className="h-9 px-3 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-md text-label-md active:scale-95">✏️ Tahrirlash</button>
                    {m.status === 'ACTIVE' && (
                      <button onClick={() => act(() => api.closeRental(m.id), "E'lon yopildi — tabriklaymiz! 🎉")} className="h-9 px-3 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-md text-label-md active:scale-95">✅ Berildi</button>
                    )}
                    <button
                      onClick={() => {
                        if (armDel === m.id) {
                          setArmDel(null);
                          act(() => api.deleteRental(m.id), "E'lon o'chirildi");
                        } else {
                          haptic('warning');
                          setArmDel(m.id);
                          setTimeout(() => setArmDel((x) => (x === m.id ? null : x)), 4000);
                        }
                      }}
                      className={`h-9 px-3 rounded-full font-label-md text-label-md active:scale-95 ${armDel === m.id ? 'bg-error text-white' : 'bg-surface-container text-error'}`}
                    >
                      {armDel === m.id ? "Rostdan o'chirilsinmi? Yana bosing" : "🗑 O'chirish"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center bg-surface-container-lowest rounded-full px-4 h-12 shadow-sm gap-2">
          <span className="material-symbols-outlined text-primary">search</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mahalla bo'yicha: Mikrorayon, Metallurg…" className="flex-1 bg-transparent outline-none font-body-md text-body-md text-on-surface placeholder:text-outline" />
          {q && (
            <button aria-label="Tozalash" onClick={() => setQ('')} className="material-symbols-outlined text-outline">close</button>
          )}
        </div>

        <div className="flex gap-space-xs overflow-x-auto pb-1 -mx-margin px-margin no-scrollbar">
          {SEGMENTS.map((s) => {
            const a = seg === s.key;
            const n = all.filter((l) => inSeg(l, s.words)).length;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => pick(setSeg, a ? null : s.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full shrink-0 active:scale-95 transition-all ${a ? 'bg-primary text-on-primary clay-fab' : 'bg-surface-container-lowest text-on-surface-variant shadow-sm'}`}
              >
                <span className="text-lg">{s.emoji}</span>
                <span className="font-label-lg text-label-lg whitespace-nowrap">{s.label}</span>
                {data && <span className={`text-label-sm font-label-sm px-2 py-0.5 rounded-full ${a ? 'bg-primary-fixed-dim/30' : 'bg-surface-container'}`}>{n}</span>}
              </button>
            );
          })}
        </div>

        <div className="bg-surface-container-lowest rounded-lg p-space-md space-y-space-md shadow-sm">
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Xonalar soni</span>
              <div className="flex bg-surface-container-low p-0.5 rounded-full">
                {TERMS.map((t) => (
                  <button key={t.key} type="button" onClick={() => pick(setTerm, term === t.key ? null : t.key)} className={`px-2.5 py-0.5 text-label-sm font-label-sm rounded-full ${term === t.key ? 'bg-primary text-on-primary font-bold' : 'text-on-surface-variant'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
              <button type="button" onClick={() => pick(setRooms, null)} className={pillCls(rooms === null)}>Barchasi</button>
              {ROOMS.map((r) => (
                <button key={r} type="button" onClick={() => pick(setRooms, r)} className={pillCls(rooms === r)}>
                  {r === 4 ? '4+ xona' : `${r} xonali`}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-space-xs pt-1">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Narx oralig'i</span>
              <div className="flex bg-surface-container-low p-0.5 rounded-full">
                {(['UZS', 'USD'] as const).map((c) => (
                  <button key={c} type="button" onClick={() => pick(setCur, c)} className={`px-2 py-0.5 text-label-sm font-label-sm rounded-full ${cur === c ? 'bg-surface-container-lowest text-primary shadow-xs font-bold' : 'text-outline'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {[
                [min, setMin, 'dan'],
                [max, setMax, 'gacha'],
              ].map(([v, set, ph]) => (
                <input
                  key={ph as string}
                  inputMode="numeric"
                  value={v as string}
                  onChange={(e) => (set as (s: string) => void)(e.target.value.replace(/\D/g, ''))}
                  placeholder={`${ph} (${cur === 'USD' ? '$' : "so'm"})`}
                  className="flex-1 min-w-0 h-11 px-4 rounded-full bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-outline"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-1">
          <span className="font-headline-md text-headline-md text-on-surface">Topilgan e'lonlar</span>
          {data && <span className="bg-primary-fixed text-primary font-label-sm text-label-sm px-2.5 py-0.5 rounded-full">{items.length} ta</span>}
        </div>

        <div className="flex flex-col gap-space-lg">
          {loading && !data && [0, 1].map((i) => <Skeleton key={i} className="h-72" />)}
          {error && <ErrorView error={error} onRetry={reload} />}
          {data && items.length === 0 && (
            <StateView
              shape="triangle"
              mood="sad"
              title="Hozircha e'lon yo'q"
              text="Mos ijara e'loni topilmadi. Filtrlarni o'zgartiring — yoki uyingiz bo'lsa, o'zingiz e'lon bering."
              action={{ label: "Uyimni ijaraga beraman", icon: 'add_home', onClick: () => navigate('/rent/add') }}
            />
          )}
          {items.map((l, i) => (
            <RentCard key={l.id} listing={l} delay={Math.min(i, 8) * 60} onOpen={() => navigate('/rent/' + l.id)} />
          ))}
        </div>
      </div>
    </main>
  );
};
