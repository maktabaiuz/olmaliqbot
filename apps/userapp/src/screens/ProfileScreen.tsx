import React, { useState } from 'react';
import type { Route } from '../lib/router';
import { navigate } from '../lib/router';
import { api } from '../lib/api';
import { haptic, tgUser } from '../lib/telegram';
import { useAsync } from '../components/ui';
import { MahallaSheet, readMahalla, realAreas, saveMahalla } from './profile/MahallaSheet';
import { MyCandidates } from './profile/MyCandidates';

const LINKS = [
  { to: '/saved', icon: 'bookmark', label: 'Saqlanganlar', tint: 'bg-primary-fixed text-primary' },
  { to: '/chat', icon: 'smart_toy', label: 'AI yordamchi', tint: 'bg-tertiary-fixed text-tertiary' },
  { to: '/sos', icon: 'emergency', label: 'SOS', tint: 'bg-error-container text-error' },
  { to: '/add', icon: 'add_business', label: "Ma'lumot qo'shish", tint: 'bg-secondary-fixed text-secondary' },
];

const Soon: React.FC = () => (
  <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">Tez orada</span>
);

export const ProfileScreen: React.FC<{ route: Route }> = () => {
  const user = tgUser();
  const lms = useAsync(() => api.landmarks(), []);
  const mine = useAsync(() => api.myCandidates(), []);
  const favs = useAsync(() => api.favorites(), []);
  const [mahalla, setMahalla] = useState<string | null>(readMahalla);
  const [sheet, setSheet] = useState(false);
  const [imgOk, setImgOk] = useState(true);

  const areas = realAreas(lms.data);
  const mahallaName = areas.find((l) => l.id === mahalla)?.name;
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Mehmon';
  const initials = fullName.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const stats = [
    { label: "Qo'shganlarim", value: mine.data?.items.length, icon: 'post_add' },
    { label: 'Saqlanganlar', value: favs.data?.items.length, icon: 'bookmark' },
  ];

  return (
    <main className="bg-background min-h-screen pt-safe pb-28 max-w-md mx-auto">
      <div className="flex flex-col gap-space-lg px-margin pt-4 pb-6">
        <div className="relative w-full bg-surface-container-lowest rounded-lg p-space-lg shadow-[0_12px_28px_-6px_rgba(108,92,231,0.12),inset_2px_2px_4px_rgba(255,255,255,0.9),inset_-3px_-3px_6px_rgba(108,92,231,0.05)] flex flex-col items-center text-center overflow-hidden anim-slide-up">
          <div className="absolute -top-3 -right-2 w-10 h-10 rounded-full bg-secondary-container/40 blur-md pointer-events-none" />
          <div className="absolute -bottom-2 -left-2 w-12 h-12 rounded-full bg-primary-fixed/50 blur-lg pointer-events-none" />
          <div className="relative mb-space-md">
            <div className="w-24 h-24 rounded-full p-1 bg-surface-container shadow-[0_8px_20px_rgba(108,92,231,0.18),inset_0_3px_5px_rgba(255,255,255,0.8)]">
              {user?.photo_url && imgOk ? (
                <img className="w-full h-full rounded-full object-cover" src={user.photo_url} alt={fullName} onError={() => setImgOk(false)} />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-primary-container to-primary text-on-primary flex items-center justify-center font-headline-md text-headline-md">
                  {initials || '?'}
                </div>
              )}
            </div>
            <div className="absolute bottom-0 right-0 bg-[#2AABEE] text-on-primary w-7 h-7 rounded-full flex items-center justify-center shadow-[0_4px_10px_rgba(42,171,238,0.4)]">
              <span className="material-symbols-outlined text-[16px]">send</span>
            </div>
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface">{fullName}</h2>
          {user?.username && <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">@{user.username}</p>}
          <div className="mt-space-sm inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant">
            <span className="text-sm leading-none">✨</span>
            <span className="font-label-md text-label-md">Olmaliq hamjamiyati a'zosi</span>
          </div>
          <button
            onClick={() => {
              haptic('light');
              setSheet(true);
            }}
            className="mt-space-md w-full max-w-xs py-2 px-3.5 rounded-full bg-surface-container-low text-on-surface flex items-center justify-between active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="material-symbols-outlined text-[18px] text-error">location_on</span>
              <span className="font-label-md text-label-md truncate">{mahallaName ? `Mening mahallam: ${mahallaName}` : 'Mahallangizni tanlang'}</span>
            </div>
            <div className="flex items-center gap-1 text-primary pl-2 flex-shrink-0">
              <span className="font-label-sm text-label-sm">O'zgartirish</span>
              <span className="material-symbols-outlined text-[14px]">edit</span>
            </div>
          </button>
          <div className="mt-space-md grid grid-cols-2 gap-2 w-full max-w-xs">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-surface-container-low py-2.5 flex flex-col items-center">
                <span className="font-headline-md text-headline-md text-primary">{s.value ?? '–'}</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">{s.icon}</span>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-space-sm">
          {LINKS.map((l, i) => (
            <button
              key={l.to}
              onClick={() => {
                haptic('light');
                navigate(l.to);
              }}
              style={{ animationDelay: `${60 + i * 40}ms` }}
              className="anim-slide-up bg-surface-container-lowest rounded-DEFAULT p-space-md flex items-center gap-2 shadow-[0_4px_16px_rgba(108,92,231,0.06)] active:scale-95 transition-transform text-left"
            >
              <span className={`w-9 h-9 rounded-full ${l.tint} flex items-center justify-center shrink-0`}>
                <span className="material-symbols-outlined fill text-[20px]">{l.icon}</span>
              </span>
              <span className="font-label-lg text-label-lg text-on-surface leading-tight">{l.label}</span>
            </button>
          ))}
        </div>

        <MyCandidates items={mine.data?.items} failed={!!mine.error} />

        <div className="flex flex-col gap-space-sm">
          <h3 className="font-headline-sm text-headline-sm text-on-surface px-1">Sozlamalar</h3>
          <div className="bg-surface-container-lowest rounded-lg p-space-md flex flex-col gap-space-md opacity-70 shadow-[0_4px_16px_rgba(108,92,231,0.06)]" aria-disabled="true">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-label-lg text-label-lg text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-primary">translate</span> Ilova tili: O'zbekcha
              </span>
              <Soon />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[18px]">dark_mode</span>
                </span>
                <div>
                  <p className="font-label-lg text-label-lg text-on-surface">Tungi rejim</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Qorong'i mavzu</p>
                </div>
              </div>
              <Soon />
            </div>
          </div>
        </div>
      </div>
      <MahallaSheet
        open={sheet}
        onClose={() => setSheet(false)}
        landmarks={areas}
        value={mahalla}
        onPick={(id) => {
          setMahalla(id);
          saveMahalla(id);
          haptic('success');
        }}
      />
    </main>
  );
};
