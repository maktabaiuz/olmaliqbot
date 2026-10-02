import React from 'react';
import { goBack, navigate } from '../../lib/router';
import { haptic } from '../../lib/telegram';

export const CLAY_CARD =
  'bg-surface-container-lowest p-4 rounded-lg shadow-[inset_1px_1px_3px_rgba(255,255,255,0.9),0_6px_18px_rgba(108,92,231,0.06)]';

export const AddHeader: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <header className="fixed top-0 inset-x-0 z-50 pt-safe bg-surface/90 backdrop-blur-xl shadow-[0_4px_20px_-4px_rgba(108,92,231,0.06)]">
    <div className="h-14 px-4 flex items-center justify-between max-w-[430px] mx-auto">
      <button
        aria-label="Orqaga"
        onClick={() => {
          haptic('light');
          onBack();
        }}
        className="h-11 min-w-[44px] px-2.5 -ml-2 inline-flex items-center gap-1.5 rounded-full text-on-surface font-label-lg active:scale-95 active:bg-surface-container transition-all"
      >
        <span className="material-symbols-outlined text-[20px] text-primary">arrow_back_ios_new</span>
        <span className="text-[14px] font-bold text-on-surface">Orqaga</span>
      </button>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),0_2px_6px_rgba(108,92,231,0.12)]">
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
        </div>
        <div className="flex flex-col text-left">
          <h1 className="font-headline-sm text-[16px] leading-tight font-extrabold text-on-surface">Ma'lumot qo'shish</h1>
          <span className="font-label-sm text-[10px] text-outline font-semibold tracking-wide uppercase">Kim bor? Olmaliq</span>
        </div>
      </div>
      <button
        aria-label="Yopish"
        onClick={() => {
          haptic('light');
          if (window.history.length > 1) goBack();
          else navigate('/', { replace: true });
        }}
        className="h-9 w-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform"
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  </header>
);

const STEP_TITLES = ['Nomi', 'Soha tanlash', "Aloqa ma'lumotlari"];

export const Progress: React.FC<{ step: number }> = ({ step }) => (
  <div className="flex flex-col gap-2.5 bg-surface-container-lowest p-4 rounded-lg shadow-[inset_1px_1px_3px_rgba(255,255,255,0.9),0_8px_20px_-6px_rgba(108,92,231,0.08)]">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-label-md text-label-md">{step + 1}/3 Bosqich</span>
        <span className="font-headline-sm text-headline-sm text-on-surface">{STEP_TITLES[step]}</span>
      </div>
      <span className="font-label-sm text-label-sm text-tertiary flex items-center gap-1 font-bold">
        <span className="material-symbols-outlined text-[16px]">verified</span>
        {Math.round((step / 3) * 100)}% tayyor
      </span>
    </div>
    <div className="grid grid-cols-3 gap-2 pt-1">
      {[0, 1, 2].map((i) =>
        i < step ? (
          <div key={i} className="h-2.5 rounded-full bg-tertiary-fixed-dim shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
          </div>
        ) : i === step ? (
          <div key={i} className="h-2.5 rounded-full bg-primary relative shadow-[0_0_10px_rgba(83,65,205,0.45)]">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-primary-container to-primary animate-pulse" />
          </div>
        ) : (
          <div key={i} className="h-2.5 rounded-full bg-surface-container-high" />
        ),
      )}
    </div>
  </div>
);

export const PrimaryButton: React.FC<{ onClick: () => void; disabled?: boolean; children: React.ReactNode }> = ({ onClick, disabled, children }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => {
      haptic('medium');
      onClick();
    }}
    className="w-full py-4 px-6 rounded-full bg-primary text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-lg shadow-primary/30 active:scale-[0.97] transition-all disabled:opacity-50 disabled:shadow-none"
  >
    {children}
  </button>
);

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; delay?: number }> = ({ label, hint, children, delay = 0 }) => (
  <div className={`${CLAY_CARD} flex flex-col gap-3 anim-slide-up`} style={{ animationDelay: `${delay}ms` }}>
    <div className="flex flex-col">
      <label className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-primary" />
        {label}
      </label>
      {hint && <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{hint}</span>}
    </div>
    {children}
  </div>
);

export const INPUT_WRAP =
  'flex items-center bg-surface-container-low rounded-full px-4 py-3 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.04)] focus-within:ring-2 focus-within:ring-primary/40 transition-all';
export const INPUT = 'w-full bg-transparent border-0 outline-none focus:ring-0 text-on-surface placeholder:text-outline font-body-md text-body-md p-0';
