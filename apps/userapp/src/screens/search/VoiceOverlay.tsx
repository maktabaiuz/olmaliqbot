import React from 'react';
import { Blob } from '../../components/Blob';

/** Stitch: ovozli_qidiruv_tinglanmoqda */
export const VoiceOverlay: React.FC<{ text: string; examples: string[]; onClose: () => void; onDone: () => void; onExample: (q: string) => void }> = ({ text, examples, onClose, onDone, onExample }) => (
  <div className="fixed inset-0 z-[70] bg-surface font-body-md text-on-surface flex flex-col pt-safe pb-safe">
    <div className="flex flex-col w-full flex-1 relative select-none overflow-hidden pb-10">
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-primary-container/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-16 w-72 h-72 bg-secondary-container/25 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-8 w-80 h-80 bg-tertiary-fixed-dim/20 rounded-full blur-3xl" />
      </div>
      <header className="relative z-10 flex items-center justify-between px-margin pt-4 pb-2">
        <div className="flex items-center gap-2 bg-surface-container-lowest/90 px-space-md py-1.5 rounded-full shadow-md backdrop-blur-md">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
          </span>
          <span className="font-label-sm text-primary tracking-wide uppercase">Tinglamoqda...</span>
        </div>
        <button onClick={onClose} aria-label="Yopish" className="w-10 h-10 rounded-full bg-surface-container-lowest/80 text-on-surface shadow-md flex items-center justify-center active:scale-90 transition-transform backdrop-blur-md" type="button">
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </header>

      <section className="relative z-10 flex flex-col items-center justify-center px-margin pt-6 pb-3">
        <div className="relative w-44 h-44 mb-3 flex items-center justify-center">
          <div className="absolute inset-2 bg-primary-container/30 rounded-full blur-xl scale-110" />
          <Blob shape="sphere" mood="listen" size={140} />
        </div>
      </section>

      <section className="relative z-10 px-margin mb-4">
        <div
          className="w-full bg-surface-container-lowest/95 backdrop-blur-md rounded-lg p-5 shadow-lg relative overflow-hidden"
          style={{ boxShadow: '0 14px 28px -8px rgba(108, 92, 231, 0.15), inset 1px 1px 2px rgba(255,255,255,0.9)' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <span className="inline-block w-2 h-2 rounded-full bg-tertiary" />
            <span className="font-label-sm text-tertiary uppercase tracking-wider">Jonli tanib olish</span>
          </div>
          <div className="min-h-[58px] flex items-center flex-wrap">
            <p className="font-headline-sm text-on-surface leading-tight">
              « <span className="text-primary font-headline-sm">{text || 'Gapiring...'}</span>
              <span className="inline-block w-1.5 h-5 bg-primary ml-1 animate-pulse align-middle rounded-full" /> »
            </p>
          </div>
        </div>
      </section>

      {examples.length > 0 && (
        <section className="relative z-10 px-margin mb-6">
          <p className="font-label-md text-on-surface-variant mb-2.5 px-1 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">tips_and_updates</span> Masalan, bunday deb so‘rang:
          </p>
          <div className="flex flex-wrap gap-2">
            {examples.slice(0, 4).map((q) => (
              <button key={q} onClick={() => onExample(q)} className="font-label-md bg-surface-container-lowest text-on-surface px-3.5 py-2.5 rounded-full shadow-sm hover:shadow active:scale-95 transition-all flex items-center gap-1.5" type="button">
                <span className="material-symbols-outlined text-[15px] text-secondary">search</span> « {q} »
              </button>
            ))}
          </div>
        </section>
      )}

      <footer className="relative z-10 px-margin mt-auto flex items-center gap-3">
        <button onClick={onClose} className="w-1/3 py-3.5 px-4 rounded-full bg-surface-container text-on-surface-variant font-label-lg active:scale-95 transition-transform text-center flex items-center justify-center gap-1" type="button">
          Bekor qilish
        </button>
        <button
          onClick={onDone}
          disabled={!text.trim()}
          className="w-2/3 py-3.5 px-6 rounded-full bg-primary-container text-on-primary font-label-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ boxShadow: '0 8px 20px -2px rgba(108, 92, 231, 0.42), inset 0 2px 0 rgba(255, 255, 255, 0.35)' }}
          type="button"
        >
          <span>Natijalarni ko‘rish</span>
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </footer>
    </div>
  </div>
);
