import React from 'react';
import type { Listing } from '../../lib/types';
import { recommendPercent } from '../../lib/format';
import { navigate } from '../../lib/router';
import { haptic } from '../../lib/telegram';

const TILES: { type: string; label: string; icon: string; bg: string; hover: string; iconBg: string; text: string; count: string; shadow: string; anim: string }[] = [
  { type: 'USTA', label: 'Ustalar', icon: 'handyman', bg: 'bg-amber-50', hover: 'hover:bg-amber-100/70', iconBg: 'bg-amber-100', text: 'text-amber-600', count: 'text-amber-700/80', shadow: 'shadow-[0_6px_14px_-2px_rgba(253,199,58,0.25),inset_1px_1px_2px_rgba(255,255,255,0.9)]', anim: 'group-hover:rotate-6' },
  { type: 'DOKON_OBYEKT', label: "Do'konlar", icon: 'storefront', bg: 'bg-emerald-50', hover: 'hover:bg-emerald-100/70', iconBg: 'bg-emerald-100', text: 'text-emerald-600', count: 'text-emerald-700/80', shadow: 'shadow-[0_6px_14px_-2px_rgba(0,129,106,0.18),inset_1px_1px_2px_rgba(255,255,255,0.9)]', anim: 'group-hover:-rotate-6' },
  { type: 'MUASSASA', label: 'Idoralar', icon: 'account_balance', bg: 'bg-blue-50', hover: 'hover:bg-blue-100/70', iconBg: 'bg-blue-100', text: 'text-blue-600', count: 'text-blue-700/80', shadow: 'shadow-[0_6px_14px_-2px_rgba(77,163,255,0.22),inset_1px_1px_2px_rgba(255,255,255,0.9)]', anim: 'group-hover:scale-105' },
  { type: 'TRANSPORT', label: 'Transport', icon: 'local_taxi', bg: 'bg-orange-50', hover: 'hover:bg-orange-100/70', iconBg: 'bg-orange-100', text: 'text-orange-600', count: 'text-orange-700/80', shadow: 'shadow-[0_6px_14px_-2px_rgba(255,107,107,0.2),inset_1px_1px_2px_rgba(255,255,255,0.9)]', anim: 'group-hover:translate-x-1' },
  { type: 'ARENDA', label: 'Arenda', icon: 'key', bg: 'bg-purple-50', hover: 'hover:bg-purple-100/70', iconBg: 'bg-purple-100', text: 'text-purple-600', count: 'text-purple-700/80', shadow: 'shadow-[0_6px_14px_-2px_rgba(108,92,231,0.2),inset_1px_1px_2px_rgba(255,255,255,0.9)]', anim: 'group-hover:-rotate-3' },
  { type: 'ZAPRAVKA', label: 'Zapravka', icon: 'local_gas_station', bg: 'bg-rose-50', hover: 'hover:bg-rose-100/70', iconBg: 'bg-rose-100', text: 'text-rose-600', count: 'text-rose-700/80', shadow: 'shadow-[0_6px_14px_-2px_rgba(186,26,26,0.18),inset_1px_1px_2px_rgba(255,255,255,0.9)]', anim: 'group-hover:scale-105' },
];

export const CategoryGrid: React.FC<{ counts?: Record<string, number> }> = ({ counts }) => (
  <div className="flex flex-col gap-space-xs">
    <div className="flex items-center justify-between px-1">
      <span className="font-headline-sm text-headline-sm text-on-surface">Yo'nalishlar</span>
      <span className="font-label-md text-label-md text-primary font-bold">6 ta bo'lim</span>
    </div>
    <div className="grid grid-cols-3 gap-2.5">
      {TILES.map((t, i) => (
        <button
          key={t.type}
          type="button"
          onClick={() => {
            haptic('light');
            navigate(t.type === 'ARENDA' ? '/rent' : `/category/${t.type}`);
          }}
          className={`group flex flex-col items-center justify-center p-3 rounded-2xl ${t.bg} ${t.hover} transition-all active:scale-95 ${t.shadow} text-left anim-slide-up`}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className={`w-11 h-11 rounded-2xl ${t.iconBg} flex items-center justify-center mb-1.5 shadow-inner ${t.anim} transition-transform`}>
            <span className={`material-symbols-outlined fill ${t.text} text-[26px]`}>{t.icon}</span>
          </div>
          <span className="font-headline-sm text-label-lg text-on-surface truncate w-full text-center">{t.label}</span>
          <span className={`font-label-sm text-label-sm ${t.count} font-bold`}>{counts ? `${counts[t.type] ?? 0} ta` : '…'}</span>
        </button>
      ))}
    </div>
  </div>
);

export const OpenNowCard: React.FC<{ l: Listing; i: number }> = ({ l, i }) => {
  const p = recommendPercent(l);
  const go = () => {
    haptic('light');
    navigate(`/listing/${l.id}`);
  };
  return (
    <div
      onClick={go}
      className="flex flex-col justify-between shrink-0 w-[240px] p-3.5 rounded-3xl bg-surface-container-lowest shadow-[0_8px_18px_-4px_rgba(108,92,231,0.12),inset_1px_1px_2px_rgba(255,255,255,1)] anim-slide-up active:scale-95 transition-transform cursor-pointer"
      style={{ animationDelay: `${i * 60}ms` }}
    >
      <div>
        <div className="flex items-start justify-between gap-1 mb-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-label-sm text-label-sm truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" /> {l.open.label}
          </span>
          <span className="font-label-sm text-label-sm font-bold text-on-surface shrink-0">{p === null ? 'Yangi' : `👍 ${p}%`}</span>
        </div>
        <h3 className="font-headline-sm text-headline-sm text-on-surface truncate">{l.name}</h3>
        {l.landmark && <p className="font-body-sm text-body-sm text-on-surface-variant truncate mt-0.5">📍 {l.landmark.name}</p>}
        {(l.services || l.category) && (
          <p className="font-label-sm text-label-sm text-outline mt-1 truncate">
            {l.services || `${l.category?.emoji ?? ''} ${l.category?.name ?? ''}`.trim()}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-surface-container-low">
        <span className="font-label-sm text-label-sm text-tertiary-container font-bold">{l.rating.up > 0 ? `${l.rating.up} ta tavsiya` : 'Yangi'}</span>
        <button
          type="button"
          aria-label="Qo'ng'iroq"
          onClick={(e) => {
            e.stopPropagation();
            go();
          }}
          className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined fill text-[16px]">call</span>
        </button>
      </div>
    </div>
  );
};

const CHIP_STYLES = [
  'bg-purple-100/70 hover:bg-purple-200 text-primary',
  'bg-cyan-100/70 hover:bg-cyan-200 text-cyan-800',
  'bg-amber-100/70 hover:bg-amber-200 text-amber-900',
  'bg-orange-100/70 hover:bg-orange-200 text-orange-900',
  'bg-emerald-100/70 hover:bg-emerald-200 text-emerald-900',
  'bg-slate-200/80 hover:bg-slate-300 text-slate-800',
];

export const PopularChips: React.FC<{ items: string[] }> = ({ items }) => (
  <div className="flex flex-wrap gap-2">
    {items.map((name, i) => (
      <button
        key={name}
        type="button"
        onClick={() => {
          haptic('light');
          navigate(`/search?q=${encodeURIComponent(name)}`);
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${CHIP_STYLES[i % CHIP_STYLES.length]} font-label-md text-label-md transition-all active:scale-95 shadow-sm`}
      >
        <span className="material-symbols-outlined text-[16px]">search</span>
        <span>{name}</span>
      </button>
    ))}
  </div>
);
