import React, { useEffect } from 'react';
import { Sheet, useToast } from '../../components/ui';
import { Blob, SHAPE_BY_TYPE } from '../../components/Blob';
import { formatPhone } from '../../lib/format';
import { callPhone, haptic, openUrl } from '../../lib/telegram';
import type { PhoneState } from '../../lib/phone';
import type { Listing } from '../../lib/types';

interface Flow {
  state: PhoneState;
  reveal: () => Promise<string | null>;
  reset: () => void;
}

/** Telefon oqimining barcha sheet'lari: ochildi / obuna qulfi / limit; xato → toast. */
export const PhoneSheets: React.FC<{ flow: Flow; listing: Listing }> = ({ flow, listing }) => {
  const toast = useToast();
  const { state, reveal, reset } = flow;
  useEffect(() => {
    if (state.kind === 'error') {
      toast("Raqamni ochib bo'lmadi. Qayta urinib ko'ring.", 'error');
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind]);

  const copy = async (phone: string) => {
    haptic('light');
    try {
      await navigator.clipboard.writeText(phone);
      toast('Nusxalandi', 'success');
    } catch {
      toast("Nusxalab bo'lmadi", 'error');
    }
  };

  return (
    <>
      <Sheet open={state.kind === 'shown'} onClose={reset} title="Telefon raqami">
        {state.kind === 'shown' && (
          <div className="px-margin pt-space-xs pb-space-xl flex flex-col gap-space-md">
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed/60 text-on-secondary-fixed font-label-sm text-label-sm">
                <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                Raqam muvaffaqiyatli ochildi!
              </span>
            </div>
            <div className="clay-card bg-surface-container-lowest rounded-lg p-space-lg flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-on-surface">Bog'lanish uchun raqam:</span>
                {listing.verified && (
                  <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed/60 text-tertiary font-label-sm text-label-sm">✅ Tasdiqlangan</span>
                )}
              </div>
              <div className="rounded-[24px] bg-surface-container-low px-space-md py-space-lg flex flex-col items-center gap-1 shadow-[inset_1px_1px_3px_rgba(255,255,255,0.9)]">
                <span className="font-headline-xl text-headline-xl text-primary font-extrabold text-center break-words">{formatPhone(state.phone)}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant truncate max-w-full">{listing.name}</span>
              </div>
              <button
                onClick={() => {
                  haptic('medium');
                  callPhone(state.phone);
                }}
                className="w-full h-14 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2 clay-fab active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[22px] fill">call</span>
                Qo'ng'iroq qilish
              </button>
              <button
                onClick={() => copy(state.phone)}
                className="w-full h-12 rounded-full bg-surface-container text-on-surface font-label-lg text-label-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[20px]">content_copy</span>
                Nusxalash
              </button>
            </div>
            <div className="flex items-start gap-space-sm p-space-md rounded-lg bg-surface-container-low">
              <span className="w-9 h-9 shrink-0 rounded-full bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px] text-on-secondary-container">tips_and_updates</span>
              </span>
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface">Mahalladoshlar eslatmasi</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Gaplashganingizdan so'ng xolisona baho bering. Bu boshqa olmaliqliklarga tanlashda yordam beradi!
                </span>
              </div>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={state.kind === 'subscribe'} onClose={reset} title="Obuna bo'ling">
        {state.kind === 'subscribe' && (
          <div className="px-margin pt-space-xs pb-space-xl flex flex-col relative">
            <button onClick={reset} aria-label="Yopish" className="absolute top-0 right-4 w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant active:scale-95 shadow-sm">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <div className="flex flex-col items-center mt-space-xs">
              <div className="bg-secondary-container text-on-secondary-container px-space-md py-1.5 rounded-full font-label-md text-label-md shadow-sm mb-space-xs flex items-center gap-1.5 animate-bounce">
                <span>Bu bepul va atigi 5 soniya vaqt oladi</span>
                <span>😊</span>
              </div>
              <div className="relative w-28 h-28 my-space-xs flex items-center justify-center">
                <div className="absolute inset-2 bg-primary-fixed/60 rounded-full blur-xl scale-110" />
                <Blob shape="sphere" mood="hop" size={96} className="relative z-10" />
              </div>
              <h2 className="font-headline-md text-headline-md text-center text-on-surface px-space-sm tracking-tight mt-space-xs">
                Raqamni ko'rish uchun kanalimizga obuna bo'ling
              </h2>
              <p className="font-body-sm text-body-sm text-center text-on-surface-variant mt-1.5 px-space-md">
                Olmaliqdagi barcha usta va yangiliklar bizning rasmiy kanallarda bepul e'lon qilinadi.
              </p>
            </div>
            <div className="flex flex-col gap-space-sm mt-space-md">
              {state.missing.map((ch, i) => (
                <div key={ch.id} className="bg-surface-container-low p-space-md rounded-[20px] flex items-center justify-between clay-card">
                  <div className="flex items-center gap-space-md min-w-0 pr-2">
                    <div
                      className={`w-12 h-12 rounded-[16px] flex items-center justify-center shadow-sm flex-shrink-0 ${
                        i % 2 === 0 ? 'bg-gradient-to-tr from-primary to-primary-container text-on-primary' : 'bg-gradient-to-tr from-secondary-container to-secondary-fixed text-on-secondary-container'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[26px]">{i % 2 === 0 ? 'send' : 'campaign'}</span>
                    </div>
                    <span className="font-label-lg text-label-lg text-on-surface truncate">{ch.title}</span>
                  </div>
                  <button
                    onClick={() => {
                      haptic('light');
                      openUrl(ch.url);
                    }}
                    className="flex-shrink-0 bg-primary-fixed text-on-primary-fixed px-space-md py-2 rounded-full font-label-md text-label-md flex items-center gap-1 active:scale-95 shadow-sm"
                  >
                    <span>Obuna bo'lish</span>
                    <span className="material-symbols-outlined text-[15px]">north_east</span>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 mt-space-lg">
              <button
                onClick={() => {
                  haptic('medium');
                  void reveal();
                }}
                className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary py-3.5 px-6 rounded-full font-label-lg text-label-lg flex items-center justify-center gap-2 clay-fab active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px] fill">check_circle</span>
                ✅ Tekshirish
              </button>
              <p className="font-body-sm text-body-sm text-on-surface-variant text-center px-space-md leading-tight">
                Obuna bo'lgach, "Tekshirish" tugmasini bosing — telefon raqami darhol ochiladi.
              </p>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={state.kind === 'limit'} onClose={reset} title="Cheklov">
        <div className="px-margin pt-space-xs pb-8 flex flex-col items-center text-center">
          <div className="relative w-36 h-36 my-space-xs flex items-center justify-center">
            <div className="absolute inset-2 rounded-full bg-primary-fixed/40 blur-xl" />
            <Blob shape={SHAPE_BY_TYPE[listing.type] || 'sphere'} mood="sleepy" size={112} className="relative" />
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface px-space-sm mb-space-xs tracking-tight">
            Juda ko'p so'rov — birozdan keyin urinib ko'ring
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant px-space-md mb-space-lg leading-relaxed">
            Ustalarimizning tinchligini va ilovani botlardan himoya qilish uchun qisqa vaqtli cheklov o'rnatilgan.
          </p>
          <button
            onClick={reset}
            className="w-full h-12 mb-space-md rounded-full bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center justify-center gap-2 clay-fab active:scale-[0.98]"
          >
            <span>Tushundim, kutaman</span>
            <span className="text-base">👍</span>
          </button>
          <div className="flex items-center gap-1.5 bg-surface-container-low px-3 py-1.5 rounded-full">
            <span className="text-xs">🛡️</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Xavfsizlik va spamdan himoya tizimi</span>
          </div>
        </div>
      </Sheet>
    </>
  );
};
