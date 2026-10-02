import React, { useEffect, useState } from 'react';
import type { Route } from '../lib/router';
import { navigate } from '../lib/router';
import { api } from '../lib/api';
import type { Listing } from '../lib/types';
import { haptic } from '../lib/telegram';
import { TYPE_META } from '../lib/format';
import { ErrorView, Skeleton, useAsync, useToast } from '../components/ui';
import { Blob } from '../components/Blob';
import { ListingCard } from '../components/ListingCard';

const RECENT_KEY = 'kimbor_recent';

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').slice(0, 12) : [];
  } catch {
    return [];
  }
}
function writeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* e'tiborsiz */
  }
}

export const SavedScreen: React.FC<{ route: Route }> = () => {
  const toast = useToast();
  const favs = useAsync(() => api.favorites(), []);
  const [items, setItems] = useState<Listing[]>([]);
  const [recent, setRecent] = useState<string[]>(readRecent);
  const [tab, setTab] = useState<string>('ALL');

  useEffect(() => {
    if (favs.data) setItems(favs.data.items);
  }, [favs.data]);

  const remove = async (l: Listing) => {
    haptic('medium');
    const prev = items;
    setItems((xs) => xs.filter((x) => x.id !== l.id));
    try {
      await api.removeFavorite(l.id);
      toast('Saqlanganlardan olib tashlandi', 'success');
    } catch {
      setItems(prev);
      toast("O'chirib bo'lmadi", 'error');
    }
  };

  const types = Array.from(new Set(items.map((x) => x.type)));
  const shown = tab === 'ALL' ? items : items.filter((x) => x.type === tab);

  const chip = (key: string, label: string, count: number) => (
    <button
      key={key}
      onClick={() => {
        haptic('select');
        setTab(key);
      }}
      className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full font-label-md text-label-md active:scale-95 transition-all ${
        tab === key ? 'bg-primary-container text-on-primary shadow-[0_6px_16px_-2px_rgba(108,92,231,0.4)]' : 'bg-surface-container text-on-surface-variant'
      }`}
    >
      <span>{label}</span>
      <span className={`px-1.5 rounded-full text-label-sm font-label-sm ${tab === key ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container-highest text-on-surface-variant'}`}>{count}</span>
    </button>
  );

  return (
    <main className="bg-background min-h-screen pt-safe pb-28 max-w-md mx-auto">
      <div className="flex flex-col gap-space-lg px-margin pt-4 pb-6">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Saqlanganlar</h1>

        <section className="relative overflow-hidden rounded-lg bg-surface-container-lowest p-space-md shadow-[0_12px_28px_-6px_rgba(108,92,231,0.12),inset_2px_2px_4px_rgba(255,255,255,0.9)] anim-slide-up">
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-primary-fixed/40 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-secondary-fixed/40 blur-xl pointer-events-none" />
          <div className="relative z-10 flex items-center gap-space-md">
            <div className="relative flex-shrink-0 w-20 h-20 rounded-lg bg-primary-fixed/30 flex items-center justify-center">
              <Blob shape="pill" mood="idle" size={56} />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center shadow-[0_2px_6px_rgba(253,199,58,0.5)]">
                <span className="material-symbols-outlined fill text-[14px] text-on-secondary-container">favorite</span>
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed">
                <span className="material-symbols-outlined fill text-[13px]">bookmark</span>
                <span className="font-label-sm text-label-sm">Saqlangan xizmatlar</span>
              </div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface leading-snug">Sevimli kontaktlaringiz</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
                {favs.data ? (items.length ? `Siz belgilagan ${items.length} ta kontakt qo'l ostingizda!` : "Hali hech narsa saqlanmagan") : 'Yuklanmoqda…'}
              </p>
            </div>
          </div>
        </section>

        {recent.length > 0 && (
          <section className="flex flex-col gap-space-xs anim-slide-up" style={{ animationDelay: '60ms' }}>
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1 text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-primary-container">history</span>
                <span className="font-label-md text-label-md text-on-surface">Oxirgi qidiruvlar</span>
              </div>
              <button
                className="font-label-sm text-label-sm text-primary active:scale-95"
                onClick={() => {
                  haptic('light');
                  setRecent([]);
                  writeRecent([]);
                }}
              >
                Tarixni tozalash
              </button>
            </div>
            <div className="flex items-center gap-space-xs overflow-x-auto py-1 px-0.5 no-scrollbar">
              {recent.map((q) => (
                <div
                  key={q}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-lowest text-on-surface shadow-[0_4px_10px_-2px_rgba(108,92,231,0.08)] active:scale-95 transition-transform"
                >
                  <button
                    className="flex items-center gap-1"
                    onClick={() => {
                      haptic('light');
                      navigate('/search?q=' + encodeURIComponent(q));
                    }}
                  >
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant">search</span>
                    <span className="font-label-sm text-label-sm">{q}</span>
                  </button>
                  <button
                    aria-label="O'chirish"
                    className="ml-1 w-4 h-4 rounded-full flex items-center justify-center text-on-surface-variant"
                    onClick={() => {
                      haptic('light');
                      const next = recent.filter((x) => x !== q);
                      setRecent(next);
                      writeRecent(next);
                    }}
                  >
                    <span className="material-symbols-outlined text-[12px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {favs.error && !favs.data ? (
          <ErrorView error={favs.error} onRetry={favs.reload} />
        ) : !favs.data ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center text-center px-6 py-8 anim-slide-up">
            <Blob shape="pill" mood="idle" size={112} />
            <h2 className="font-headline-md text-headline-md text-on-surface mt-6">Hozircha bo'sh</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-xs">Kerakli usta yoki do'konni topib, 🔖 tugmasini bosing — shu yerda turadi.</p>
            <button
              onClick={() => {
                haptic('light');
                navigate('/search');
              }}
              className="mt-6 h-12 px-6 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-label-lg text-label-lg clay-fab flex items-center gap-2 active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
              Qidirish
            </button>
          </div>
        ) : (
          <>
            {types.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
                {chip('ALL', 'Barchasi', items.length)}
                {types.map((t) => chip(t, TYPE_META[t]?.label || t, items.filter((x) => x.type === t).length))}
              </div>
            )}
            <div className="flex flex-col gap-space-md">
              {shown.map((l, i) => (
                <div key={l.id} className="relative anim-slide-up" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                  <ListingCard listing={l} onOpen={() => navigate('/listing/' + l.id)} />
                  <button
                    aria-label="Saqlanganlardan olib tashlash"
                    onClick={() => void remove(l)}
                    className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shadow-[0_4px_10px_rgba(253,199,58,0.45)] active:scale-90 transition-transform"
                  >
                    <span className="material-symbols-outlined fill text-[18px]">bookmark_remove</span>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
};
