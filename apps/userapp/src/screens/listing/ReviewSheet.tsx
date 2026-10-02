import React, { useState } from 'react';
import { Sheet, useToast } from '../../components/ui';
import { BlobFamily } from '../../components/Blob';
import { api, ApiError } from '../../lib/api';
import { haptic } from '../../lib/telegram';
import type { Listing } from '../../lib/types';

const TAGS: [string, string][] = [
  ['⚡', 'Tez keldi'],
  ['💰', 'Arzon'],
  ['⭐', 'Sifatli'],
  ['😊', 'Muloyim'],
  ['🛡️', 'Kafolat berdi'],
  ['🧹', 'Ozoda ishladi'],
];
const MAX = 500;

export const ReviewSheet: React.FC<{ open: boolean; onClose: () => void; listing: Listing; onDone: () => void }> = ({ open, onClose, listing, onDone }) => {
  const toast = useToast();
  const [positive, setPositive] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const close = () => {
    onClose();
    setTimeout(() => {
      setPositive(null);
      setComment('');
      setDone(false);
    }, 200);
  };

  const addTag = (t: string) => {
    haptic('select');
    setComment((c) => (c.includes(t) ? c : (c.trim() ? `${c.trim()}, ${t}` : t).slice(0, MAX)));
  };

  const submit = async () => {
    if (positive === null || busy) return;
    setBusy(true);
    try {
      await api.review(listing.id, positive, comment.trim());
      haptic('success');
      toast('Bahoyingiz qabul qilindi', 'success');
      setDone(true);
      setTimeout(() => {
        close();
        onDone();
      }, 1800);
    } catch (e) {
      haptic('error');
      const err = e as ApiError;
      toast(err.status === 400 && err.body?.message ? String(err.body.message) : "Yuborib bo'lmadi", 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={close} title="Baholash">
      <div className="relative px-margin pt-1 pb-8">
        <div className="flex items-center justify-between pb-3 pt-1">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight">Baholash</span>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold">👍</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
              {listing.name}
              {listing.landmark ? ` • ${listing.landmark.name}` : ''}
            </p>
          </div>
          <button aria-label="Yopish" onClick={close} className="clay-close-btn w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant active:scale-90 transition-all" type="button">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="text-center mb-3">
          <span className="font-headline-sm text-headline-sm text-on-surface block">Xizmat sizga ma'qul keldimi?</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">Mahalladoshlaringiz uchun xolis baho qoldiring</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[true, false].map((v) => {
            const on = positive === v;
            const green = v && on;
            const red = !v && on;
            return (
              <button
                key={String(v)}
                type="button"
                onClick={() => {
                  haptic('medium');
                  setPositive(v);
                }}
                className={`group relative flex flex-col items-center justify-center p-3.5 rounded-3xl active:scale-95 transition-all duration-200 overflow-hidden ${
                  green
                    ? 'bg-gradient-to-b from-[#10e37d] to-[#00b359] text-white shadow-[0_10px_20px_-3px_rgba(0,179,89,0.38),inset_0_2px_2px_rgba(255,255,255,0.6)]'
                    : red
                    ? 'bg-error-container text-on-error-container shadow-[0_10px_20px_-3px_rgba(186,26,26,0.25)]'
                    : 'bg-surface-container-high text-on-surface shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_2px_2px_rgba(255,255,255,0.8)]'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-white/40 flex items-center justify-center mb-1">
                  <span className="text-2xl drop-shadow">{v ? '👍' : '👎'}</span>
                </div>
                <span className="font-label-lg text-label-lg font-extrabold tracking-tight">{v ? 'Tavsiya qilaman' : 'Tavsiya qilmayman'}</span>
                <span className={`text-[11px] font-medium ${green ? 'text-emerald-100' : 'opacity-70'}`}>{v ? "Zo'r ishladi!" : 'Kamchiliklar bor'}</span>
                {on && (
                  <div className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-sm ${v ? 'bg-white text-tertiary' : 'bg-error text-on-error'}`}>
                    <span className="material-symbols-outlined text-[13px] font-bold">{v ? 'check' : 'priority_high'}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="mb-4">
          <label className="font-label-md text-label-md text-on-surface font-bold block mb-2">
            Nimalar yoqdi? <span className="font-body-sm text-on-surface-variant font-normal">(izohga qo'shiladi):</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {TAGS.map(([e, t]) => {
              const on = comment.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => addTag(t)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl active:scale-95 transition-all ${
                    on ? 'bg-primary-fixed text-on-primary-fixed shadow-[0_2px_6px_rgba(83,65,205,0.15)]' : 'bg-surface-container-low text-on-surface-variant shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8)]'
                  }`}
                >
                  <span className="text-sm">{e}</span>
                  <span className="font-label-md text-label-md">{t}</span>
                  {on && <span className="material-symbols-outlined text-[15px] font-bold">check</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-label-md text-label-md text-on-surface font-bold" htmlFor="review-comment">
              Izohingiz (ixtiyoriy)
            </label>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {comment.length}/{MAX}
            </span>
          </div>
          <div className="relative w-full rounded-2xl bg-surface-container-low p-3 shadow-[inset_1px_2px_4px_rgba(0,0,0,0.06)] focus-within:bg-surface-container-lowest transition-all">
            <textarea
              id="review-comment"
              value={comment}
              maxLength={MAX}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Fikringizni yozing..."
              className="w-full bg-transparent border-0 outline-none text-on-surface font-body-md text-body-md resize-none placeholder:text-outline/70"
            />
          </div>
        </div>
        <button
          type="button"
          disabled={positive === null || busy}
          onClick={submit}
          className="relative w-full py-4 px-6 mb-3 rounded-full bg-gradient-to-r from-primary to-[#5f27cd] text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2 clay-fab active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <span className="tracking-wide">{busy ? 'Yuborilmoqda...' : 'Yuborish'}</span>
          <span className="text-lg">🚀</span>
        </button>
        <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low/60 text-center">
          <span className="text-xs">🛡️</span>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Faqat haqiqiy bog'langan mahalladoshlar baholaydi</p>
        </div>
        {done && (
          <div className="absolute inset-0 z-30 bg-surface-container-lowest flex flex-col items-center justify-center p-6 text-center anim-slide-up">
            <BlobFamily size={44} />
            <h3 className="font-headline-md text-headline-md text-on-surface mt-6 mb-1">Rahmat! Bahoyingiz qabul qilindi 🎉</h3>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">Xolis fikringiz qo'shnilaringizga to'g'ri tanlov qilishda yordam beradi!</p>
          </div>
        )}
      </div>
    </Sheet>
  );
};
