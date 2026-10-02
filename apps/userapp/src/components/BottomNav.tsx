import React from 'react';
import { navigate } from '../lib/router';
import { haptic } from '../lib/telegram';

// Stitch "bosh_sahifa_olmaliq_yangilangan" pastki menyusi — aynan ko'chirilgan.
const TABS = [
  { path: '/', icon: 'roofing', label: 'Asosiy' },
  { path: '/map', icon: 'map', label: 'Xarita' },
  { path: '/search', icon: 'search', label: '' },
  { path: '/saved', icon: 'bookmark_heart', label: 'Saqlangan' },
  { path: '/profile', icon: 'account_circle', label: 'Profil' },
];

export const BottomNav: React.FC<{ active: string }> = ({ active }) => (
  <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe pointer-events-none">
    <div className="mx-margin mb-3 pointer-events-auto max-w-md sm:mx-auto">
      <div className="h-16 px-space-md rounded-full bg-surface-container-lowest/85 backdrop-blur-xl shadow-[0_-4px_24px_rgba(0,0,0,0.06)] flex items-center justify-between relative clay-card">
        {TABS.map((t) =>
          t.path === '/search' ? (
            <div key={t.path} className="relative -top-4 shrink-0 flex items-center justify-center">
              <button
                aria-label="Qidiruv"
                onClick={() => {
                  haptic('medium');
                  navigate('/search');
                }}
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-secondary-container text-on-primary flex items-center justify-center clay-fab transition-transform active:scale-90"
              >
                <span className="material-symbols-outlined text-[28px] text-white">search</span>
              </button>
            </div>
          ) : (
            <button
              key={t.path}
              onClick={() => {
                haptic('select');
                navigate(t.path, { replace: true });
              }}
              className={`flex flex-col items-center justify-center min-w-[48px] h-12 transition-all active:scale-90 ${
                active === t.path ? 'text-primary font-bold' : 'text-on-surface-variant'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[24px] ${active === t.path ? 'fill blob-hop' : ''}`}
                style={active === t.path ? { animationIterationCount: 1 } : undefined}
              >
                {t.icon}
              </span>
              <span className="font-label-sm text-label-sm tracking-tight">{t.label}</span>
            </button>
          )
        )}
      </div>
    </div>
  </nav>
);
