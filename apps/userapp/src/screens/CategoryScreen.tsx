import React, { useMemo, useState } from 'react';
import type { Route } from '../lib/router';
import { goBack, navigate } from '../lib/router';
import { api } from '../lib/api';
import { TYPE_META } from '../lib/format';
import { haptic } from '../lib/telegram';
import { useAsync, Skeleton, StateView, ErrorView } from '../components/ui';
import { Blob, SHAPE_BY_TYPE } from '../components/Blob';
import { ListingCard } from '../components/ListingCard';

const PILLS: { key: string; label: string; icon: string }[] = [
  { key: 'open', label: 'Hozir ochiq', icon: 'schedule' },
  { key: 'uyga_boradi', label: 'Uyga boradi', icon: 'home' },
  { key: '24_7', label: '24/7', icon: 'all_inclusive' },
  { key: 'kafolat', label: 'Kafolat', icon: 'shield' },
  { key: 'verified', label: 'Tasdiqlangan', icon: 'verified' },
];

export const CategoryScreen: React.FC<{ route: Route }> = ({ route }) => {
  const type = (route.segments[1] || 'ALL').toUpperCase();
  const landmarkId = route.query.get('landmarkId') || undefined;
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [pills, setPills] = useState<Set<string>>(new Set());
  const openNow = pills.has('open');

  const cats = useAsync(() => api.categories(), []);
  const lms = useAsync(() => (landmarkId ? api.landmarks() : Promise.resolve([])), [landmarkId]);
  const list = useAsync(
    () => api.listings({ type: type === 'ALL' ? undefined : type, categoryId, landmarkId, openNow: openNow ? '1' : undefined }),
    [type, categoryId, landmarkId, openNow],
  );

  const subCats = (cats.data || []).filter((c) => type !== 'ALL' && c.objectType === type && c.count > 0);
  const items = useMemo(
    () =>
      (list.data?.items || []).filter(
        (l) =>
          (!pills.has('verified') || l.verified) &&
          ['uyga_boradi', '24_7', 'kafolat'].every((b) => !pills.has(b) || l.badges.includes(b)),
      ),
    [list.data, pills],
  );
  const meta = TYPE_META[type];
  const title = meta?.label || 'Barchasi';
  const lmName = lms.data?.find((l) => l.id === landmarkId)?.name;

  const toggle = (k: string) => {
    haptic('select');
    setPills((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  };

  return (
    <main className="flex flex-col w-full px-margin pt-safe pb-28 bg-surface min-h-screen">
      <div className="flex items-center gap-space-sm pt-3">
        <button aria-label="Orqaga" onClick={goBack} className="w-10 h-10 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center active:scale-95 shrink-0">
          <span className="material-symbols-outlined text-[22px]">arrow_back</span>
        </button>
      </div>

      <div className="w-full bg-surface-container-lowest rounded-lg p-space-md mt-3 flex items-center gap-space-md shadow-sm clay-card relative overflow-hidden anim-slide-up">
        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-primary-fixed/20 pointer-events-none blur-xl" />
        <Blob shape={SHAPE_BY_TYPE[type] || 'sphere'} size={64} mood="idle" />
        <div className="flex flex-col min-w-0">
          <span className="font-label-sm text-label-sm text-primary uppercase">Olmaliq{lmName ? ` · ${lmName}` : ''}</span>
          <h1 className="font-headline-md text-headline-md text-on-surface leading-tight">{title}</h1>
          {list.data && (
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              <span className="text-primary font-extrabold">{items.length} ta</span> topildi
            </p>
          )}
        </div>
      </div>

      {subCats.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto py-1 mt-3 -mx-margin px-margin no-scrollbar">
          {[{ id: undefined as string | undefined, name: 'Barchasi', emoji: null as string | null }, ...subCats].map((c) => {
            const active = categoryId === c.id;
            return (
              <button
                key={c.id || 'all'}
                type="button"
                onClick={() => {
                  haptic('select');
                  setCategoryId(c.id);
                }}
                className={`h-9 px-3.5 rounded-full font-label-md text-label-md shrink-0 flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform ${
                  active ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-on-surface clay-card'
                }`}
              >
                {c.emoji && <span>{c.emoji}</span>}
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto py-1 mt-1 -mx-margin px-margin no-scrollbar">
        {PILLS.map((p) => {
          const active = pills.has(p.key);
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => toggle(p.key)}
              className={`h-9 px-3.5 rounded-full font-label-md text-label-md shrink-0 flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform ${
                active ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-on-surface clay-card'
              }`}
            >
              {p.key === 'open' ? (
                <span className={`w-2 h-2 rounded-full ${active ? 'bg-secondary-fixed' : 'bg-tertiary-fixed-dim'}`} />
              ) : (
                <span className={`material-symbols-outlined text-[16px] fill ${active ? '' : 'text-tertiary'}`}>{p.icon}</span>
              )}
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-space-lg mt-space-lg">
        {list.loading && !list.data && [0, 1, 2].map((i) => <Skeleton key={i} className="h-44" />)}
        {list.error && <ErrorView error={list.error} onRetry={list.reload} />}
        {list.data && items.length === 0 && (
          <StateView shape={SHAPE_BY_TYPE[type] || 'sphere'} mood="sad" title="Hozircha hech kim yo'q" text="Filtrlarni o'zgartirib ko'ring yoki tanishingizni qo'shing." action={{ label: "Qo'shish", icon: 'add', onClick: () => navigate('/add') }} />
        )}
        {items.map((l, i) => (
          <div key={l.id} className="anim-slide-up" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
            <ListingCard listing={l} onOpen={() => navigate('/listing/' + l.id)} />
          </div>
        ))}
      </div>
    </main>
  );
};
