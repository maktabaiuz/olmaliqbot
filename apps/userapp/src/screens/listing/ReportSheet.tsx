import React, { useState } from 'react';
import { Sheet, useToast } from '../../components/ui';
import { Blob, SHAPE_BY_TYPE } from '../../components/Blob';
import { api } from '../../lib/api';
import { haptic } from '../../lib/telegram';
import type { Listing } from '../../lib/types';

const REASONS: { label: string; hint: string; icon: string; tint: string }[] = [
  { label: 'Raqam ishlamaydi', hint: "Telefon o'chiq yoki umuman javob bermayapti", icon: 'phone_disabled', tint: 'bg-primary-container text-on-primary-container' },
  { label: 'Yopilgan', hint: "Faoliyatini to'xtatgan", icon: 'door_front', tint: 'bg-error-container text-on-error-container' },
  { label: "Manzil noto'g'ri", hint: "Boshqa mahalla yoki xaritada xato ko'rsatilgan", icon: 'wrong_location', tint: 'bg-secondary-container text-on-secondary-container' },
  { label: 'Bu soha emas', hint: 'Boshqa xizmat turi yoki toifaga tegishli', icon: 'handyman', tint: 'bg-tertiary-fixed text-on-tertiary-fixed' },
  { label: 'Boshqa', hint: 'Boshqa sabab — izohda yozing', icon: 'live_help', tint: 'bg-surface-container-highest text-on-surface-variant' },
];
const MAX = 240;

export const ReportSheet: React.FC<{ open: boolean; onClose: () => void; listing: Listing }> = ({ open, onClose, listing }) => {
  const toast = useToast();
  const [reason, setReason] = useState(REASONS[0].label);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.report(listing.id, reason, comment.trim());
      haptic('success');
      toast('Rahmat! Xabaringiz yuborildi', 'success');
      setComment('');
      onClose();
    } catch {
      haptic('error');
      toast("Yuborib bo'lmadi", 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Xabar berish">
      <div className="h-14 px-margin flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-tertiary-fixed-dim shadow-[0_0_8px_#38debb]" />
          <h2 className="font-headline-sm text-headline-sm text-on-surface truncate">Xabar berish</h2>
        </div>
        <button aria-label="Yopish" onClick={onClose} className="clay-close-btn w-11 h-11 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant active:scale-95 transition-all" type="button">
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
      <div className="px-margin pt-space-xs pb-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary-fixed via-surface-container to-secondary-fixed/30 p-space-lg mb-space-lg shadow-sm">
          <div className="flex items-center gap-space-md">
            <div className="w-16 h-16 shrink-0 rounded-2xl bg-surface-container-lowest p-1 shadow-md flex items-center justify-center">
              <Blob shape={SHAPE_BY_TYPE[listing.type] || 'sphere'} mood="sad" size={48} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container/60 text-on-secondary-container text-label-sm font-label-sm mb-1">
                <span className="material-symbols-outlined text-[13px]">help_center</span>
                <span>Mahalla yordami</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface truncate">Ma'lumot noto'g'rimi?</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-0.5">
                <span className="font-label-md text-primary">{listing.name}</span> haqidagi noaniqlikni xabar qiling.
              </p>
            </div>
          </div>
        </div>
        <div role="radiogroup" aria-label="Xatolik sababi" className="flex flex-col gap-space-sm mb-space-lg">
          <p className="font-label-lg text-label-lg text-on-surface px-1">Qanday xatolik sezdingiz?</p>
          {REASONS.map((r) => {
            const on = r.label === reason;
            return (
              <button
                key={r.label}
                role="radio"
                aria-checked={on}
                type="button"
                onClick={() => {
                  haptic('select');
                  setReason(r.label);
                }}
                className={`text-left p-space-md rounded-[1.5rem] transition-all duration-200 flex items-center justify-between gap-space-sm active:scale-[0.98] ${
                  on ? 'bg-primary-fixed/20 shadow-sm' : 'bg-surface-container-low'
                }`}
              >
                <div className="flex items-center gap-space-md min-w-0">
                  <div className={`w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center shadow-sm ${r.tint}`}>
                    <span className="material-symbols-outlined text-[22px]">{r.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-headline-sm text-[15px] text-on-surface">{r.label}</div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{r.hint}</p>
                  </div>
                </div>
                <div className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center ${on ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-transparent'}`}>
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-space-xs mb-space-lg">
          <div className="flex items-center justify-between px-1">
            <label className="font-label-lg text-label-lg text-on-surface flex items-center gap-1.5" htmlFor="report-details">
              <span>Qo'shimcha tafsilotlar</span>
              <span className="text-body-sm text-on-surface-variant font-normal">(ixtiyoriy)</span>
            </label>
            <span className="text-label-sm font-label-sm text-on-surface-variant">
              {comment.length}/{MAX}
            </span>
          </div>
          <div className="rounded-2xl bg-surface-container-low p-space-sm shadow-inner focus-within:bg-surface-container-lowest transition-colors">
            <textarea
              id="report-details"
              value={comment}
              maxLength={MAX}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Vaziyatni qisqacha tushuntiring..."
              className="w-full bg-transparent text-on-surface placeholder:text-outline text-body-md font-body-md focus:outline-none resize-none px-space-xs py-1"
            />
          </div>
        </div>
        <div className="flex items-center gap-space-sm px-space-md py-space-sm mb-space-lg rounded-2xl bg-tertiary-container/15 text-tertiary font-body-sm text-body-sm">
          <span className="material-symbols-outlined text-[20px] shrink-0">verified_user</span>
          <span className="line-clamp-2">Xabaringiz moderatorlar tomonidan tekshiriladi va shahar ma'lumotlarini toza saqlashga xizmat qiladi.</span>
        </div>
        <div className="w-full flex flex-col gap-space-sm">
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="w-full py-4 px-space-lg rounded-full bg-primary-container text-on-primary-container font-label-lg text-label-lg shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-space-sm disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
            <span>{busy ? 'Yuborilmoqda...' : 'Xabarni yuborish'}</span>
          </button>
          <button type="button" onClick={onClose} className="w-full py-3 rounded-full text-on-surface-variant font-label-md text-label-md active:bg-surface-container transition-colors">
            Bekor qilish
          </button>
        </div>
      </div>
    </Sheet>
  );
};
