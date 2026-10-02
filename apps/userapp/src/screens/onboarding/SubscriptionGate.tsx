import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { Channel } from '../../lib/types';
import { haptic, openUrl } from '../../lib/telegram';
import { useToast } from '../../components/ui';
import { Blob } from '../../components/Blob';

/** Majburiy kanal obunasi. Tarmoq/server xatosida foydalanuvchini qamab qo'ymaydi. */
export const SubscriptionGate: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const toast = useToast();
  const [missing, setMissing] = useState<Channel[] | null>(null);
  const [checking, setChecking] = useState(false);

  const check = async (manual: boolean) => {
    setChecking(true);
    try {
      const r = await api.subscription();
      if (r.ok || r.missing.length === 0) {
        if (manual) haptic('success');
        onDone();
        return;
      }
      setMissing(r.missing);
      if (manual) {
        haptic('warning');
        toast("Hali obuna bo'linmagan", 'error');
      }
    } catch {
      // 401 (Telegram tashqarisi), offline, 5xx — davom etishga ruxsat.
      onDone();
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    void check(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!missing)
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Blob shape="sphere" mood="scan" size={96} />
      </main>
    );

  return (
    <main className="min-h-screen bg-background max-w-md mx-auto px-margin pt-safe pb-safe flex flex-col">
      <div className="flex items-center justify-between pt-space-xs pb-space-sm mt-3">
        <div className="inline-flex items-center gap-space-xs bg-surface-container-lowest px-space-md py-space-xs rounded-full shadow-sm">
          <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
          <span className="material-symbols-outlined text-tertiary fill text-[16px]">verified_user</span>
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Xavfsiz a'zolik</span>
        </div>
        <div className="inline-flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md bg-surface-container px-space-md py-space-xs rounded-full">
          <span className="material-symbols-outlined text-primary text-[16px]">location_on</span>
          <span>Olmaliq shahri</span>
        </div>
      </div>

      <div className="relative w-full flex flex-col items-center justify-center my-space-sm">
        <div className="absolute w-44 h-44 rounded-full bg-primary-fixed blur-2xl opacity-70 -z-10" />
        <div className="relative w-44 h-44 flex items-center justify-center">
          <Blob shape="sphere" mood="idle" size={140} />
          <div className="absolute bottom-2 -left-2 bg-surface-container-lowest text-primary font-label-sm text-label-sm px-space-sm py-0.5 rounded-full shadow-sm flex items-center gap-0.5">
            <span className="material-symbols-outlined text-tertiary text-[14px]">electric_bolt</span>
            <span>Tezkor xabar</span>
          </div>
        </div>
      </div>

      <div className="text-center px-space-xs mb-space-lg anim-slide-up">
        <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight mb-space-xs">Botdan foydalanish uchun kanalga obuna bo'ling 📢</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs mx-auto leading-relaxed">
          Yangiliklar, yangi ustalar va favqulodda e'lonlarni birinchilardan bo'lib bilish uchun rasmiy kanallarga a'zo bo'ling.
        </p>
      </div>

      <div className="flex flex-col gap-space-md w-full mb-space-lg">
        {missing.map((c, i) => (
          <div key={c.id} className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col gap-space-sm anim-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-start gap-space-md">
              <div className={`w-12 h-12 rounded-full ${i % 2 ? 'bg-secondary-fixed' : 'bg-primary-fixed'} flex items-center justify-center shrink-0 shadow-sm`}>
                <span className={`material-symbols-outlined fill text-headline-sm ${i % 2 ? 'text-secondary' : 'text-primary'}`}>{i % 2 ? 'campaign' : 'send'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-headline-sm text-headline-sm text-on-surface truncate">{c.title}</h2>
                <p className="font-label-md text-label-md text-primary font-bold truncate">{c.url.replace(/^https?:\/\/t\.me\//, '@')}</p>
              </div>
            </div>
            <div className="pt-space-xs flex justify-end">
              <button
                onClick={() => {
                  haptic('light');
                  openUrl(c.url);
                }}
                className="inline-flex items-center justify-center gap-space-xs bg-primary text-on-primary font-label-lg text-label-lg px-space-lg py-space-sm rounded-full shadow-md active:scale-95 transition-all duration-150"
              >
                <span>Obuna bo'lish</span>
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        disabled={checking}
        onClick={() => {
          haptic('medium');
          void check(true);
        }}
        className="mt-auto mb-4 w-full py-4 rounded-full bg-tertiary-container text-white font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-lg active:scale-[0.97] transition-all disabled:opacity-60"
      >
        {checking ? 'Tekshirilmoqda…' : "✅ Tekshirish"}
      </button>
    </main>
  );
};
