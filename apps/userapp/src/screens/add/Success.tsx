import React from 'react';
import { navigate } from '../../lib/router';
import { haptic } from '../../lib/telegram';
import { BlobFamily } from '../../components/Blob';

const COLORS = ['#6c5ce7', '#fdc73a', '#00b894', '#ff7675', '#74b9ff'];

export const AddSuccess: React.FC<{ summary: { label: string; value: string }[] }> = ({ summary }) => (
  <div className="flex flex-col w-full pb-8">
    <style>{`@keyframes kb-burst{0%{transform:translate(0,0) scale(.4);opacity:1}100%{transform:translate(var(--dx),var(--dy)) rotate(260deg) scale(1);opacity:0}}`}</style>
    <div className="relative flex flex-col items-center text-center mt-2">
      <div className="relative w-56 h-56 flex items-center justify-center">
        <div className="absolute inset-0 bg-primary-fixed/40 rounded-full blur-2xl transform scale-90" />
        {Array.from({ length: 18 }).map((_, i) => {
          const a = (i / 18) * Math.PI * 2;
          const r = 90 + (i % 3) * 20;
          return (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 w-2.5 h-2.5 rounded-sm pointer-events-none"
              style={
                {
                  background: COLORS[i % COLORS.length],
                  '--dx': `${Math.cos(a) * r}px`,
                  '--dy': `${Math.sin(a) * r}px`,
                  animation: `kb-burst 1.1s ${(i % 4) * 60}ms cubic-bezier(.2,.7,.3,1) both`,
                } as React.CSSProperties
              }
            />
          );
        })}
        <div className="relative z-10">
          <BlobFamily size={52} />
        </div>
      </div>
      <div className="mt-2 space-y-1.5 px-2 anim-slide-up">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-md text-label-md">
          <span className="material-symbols-outlined text-[16px] text-secondary">verified</span>
          Muvaffaqiyatli topshirildi
        </span>
        <h2 className="font-headline-lg text-headline-lg text-on-surface">Rahmat! 🎉</h2>
      </div>
    </div>
    <div className="mt-5 rounded-lg bg-tertiary-container/10 p-4 text-left flex gap-3.5 items-start anim-slide-up" style={{ animationDelay: '80ms' }}>
      <div className="w-10 h-10 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center shrink-0 shadow-[0_4px_10px_rgba(0,102,83,0.3)]">
        <span className="material-symbols-outlined text-[22px]">verified_user</span>
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <p className="font-headline-sm text-headline-sm text-tertiary leading-snug">Rahmat! Admin tekshiradi va tez orada qo'shiladi</p>
        <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">Hamjamiyat xavfsizligi uchun har bir ma'lumot moderatsiyadan o'tkaziladi.</p>
      </div>
    </div>
    <div className="mt-4 rounded-lg bg-surface-container-lowest p-5 shadow-[0_12px_24px_-6px_rgba(108,92,231,0.1)] flex flex-col gap-3.5 anim-slide-up" style={{ animationDelay: '160ms' }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          <span className="font-label-md text-label-md text-outline uppercase tracking-wider">Topshirilgan ma'lumot</span>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container/30 text-on-secondary-container font-label-sm text-label-sm">
          <span className="w-2 h-2 rounded-full bg-secondary-container inline-block" />
          Tekshiruvda
        </span>
      </div>
      <div className="flex flex-col gap-2.5 pt-1">
        {summary.map((s) => (
          <div key={s.label} className="flex items-start justify-between gap-2">
            <span className="font-body-sm text-body-sm text-on-surface-variant">{s.label}:</span>
            <span className="font-body-md text-body-md text-on-surface text-right font-semibold">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="mt-5 flex flex-col gap-3">
      <button
        onClick={() => {
          haptic('light');
          navigate('/profile');
        }}
        className="w-full py-3.5 px-5 rounded-full bg-surface-container-high text-on-surface font-label-lg text-label-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
      >
        <span className="material-symbols-outlined text-[20px] text-primary">visibility</span>
        Mening qo'shganlarim
      </button>
      <button
        onClick={() => {
          haptic('medium');
          navigate('/', { replace: true });
        }}
        className="w-full py-4 px-6 rounded-full bg-primary text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-lg shadow-primary/30 active:scale-[0.97] transition-all"
      >
        <span className="material-symbols-outlined text-[20px]">home</span>
        Bosh sahifaga
      </button>
    </div>
  </div>
);
