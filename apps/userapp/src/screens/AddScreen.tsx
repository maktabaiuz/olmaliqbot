import React, { useState } from 'react';
import type { Route } from '../lib/router';
import { goBack } from '../lib/router';
import { api, ApiError } from '../lib/api';
import { haptic } from '../lib/telegram';
import { formatPhone } from '../lib/format';
import { ErrorView, Skeleton, useAsync, useToast } from '../components/ui';
import { Blob } from '../components/Blob';
import { AddHeader, Field, INPUT, INPUT_WRAP, PrimaryButton, Progress } from './add/parts';
import { CategoryStep } from './add/CategoryStep';
import { AddSuccess } from './add/Success';
import { MahallaSheet, readMahalla, realAreas } from './profile/MahallaSheet';

/** "90 123 45 67" ko'rinishi; faqat 998 dan keyingi 9 raqam saqlanadi. */
const maskLocal = (d: string) => [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');

export const AddScreen: React.FC<{ route: Route }> = () => {
  const toast = useToast();
  const cats = useAsync(() => api.categories(), []);
  const lms = useAsync(() => api.landmarks(), []);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [digits, setDigits] = useState('');
  const [landmarkId, setLandmarkId] = useState<string | null>(readMahalla);
  const [workFrom, setWorkFrom] = useState('');
  const [workTo, setWorkTo] = useState('');
  const [sheet, setSheet] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const areas = realAreas(lms.data);
  const landmark = areas.find((l) => l.id === landmarkId) || null;
  const category = cats.data?.find((c) => c.id === categoryId) || null;
  const nameOk = name.trim().length >= 2;
  const phoneOk = digits.length === 9;

  const back = () => (step > 0 && !done ? setStep(step - 1) : goBack());

  const submit = async () => {
    if (!nameOk || !categoryId || !phoneOk) return;
    setSending(true);
    try {
      await api.addCandidate({
        name: name.trim(),
        phone: `+998${digits}`,
        categoryId,
        landmarkId: landmark?.id || undefined,
        workFrom: workFrom || undefined,
        workTo: workTo || undefined,
      });
      haptic('success');
      setDone(true);
      window.scrollTo(0, 0);
    } catch (e) {
      haptic('error');
      const err = e instanceof ApiError ? e : new ApiError(0, {});
      if ((err.status === 429 || err.status === 400) && err.body?.message) toast(err.body.message, 'error');
      else if (err.status === 0) toast("Internet yo'q. Qayta urinib ko'ring", 'error');
      else toast("Yuborib bo'lmadi. Keyinroq urinib ko'ring", 'error');
    } finally {
      setSending(false);
    }
  };

  const next = () => {
    window.scrollTo(0, 0);
    setStep(step + 1);
  };

  return (
    <div className="bg-background min-h-screen flex flex-col">
      <AddHeader onBack={back} />
      <main className="w-full max-w-[430px] mx-auto pt-[calc(3.5rem+env(safe-area-inset-top))] pb-safe px-4 flex flex-col gap-5 flex-1">
        {done ? (
          <AddSuccess
            summary={[
              { label: 'Nomi', value: name.trim() },
              { label: 'Soha', value: category ? `${category.emoji || ''} ${category.name}`.trim() : '—' },
              { label: 'Telefon', value: formatPhone(`998${digits}`) },
              ...(landmark ? [{ label: 'Manzil', value: landmark.name }] : []),
            ]}
          />
        ) : (
          <div className="flex flex-col w-full pb-8 gap-4 mt-3">
            <Progress step={step} />

            <div className="flex items-center gap-3.5 bg-gradient-to-r from-primary-fixed/40 via-surface-container-low to-tertiary-fixed/20 p-3.5 rounded-lg relative overflow-hidden anim-slide-up">
              <div className="w-16 h-16 shrink-0 rounded-full bg-primary-fixed flex items-center justify-center overflow-hidden ring-2 ring-surface-container-lowest">
                <Blob shape={step === 0 ? 'sphere' : step === 1 ? 'pill' : 'cloud'} mood="idle" size={48} />
              </div>
              <div className="flex-1 min-w-0 bg-surface-container-lowest p-3 rounded-2xl relative">
                <div className="absolute -left-1.5 top-5 w-3 h-3 bg-surface-container-lowest rotate-45" />
                <p className="font-body-md text-body-md text-on-surface leading-tight font-bold">
                  {step === 0 ? 'Kimni yoki nimani qo\'shmoqchisiz? ✍️' : step === 1 ? 'Qaysi sohada ishlaydi? 🧰' : 'Mijozlar darhol bog\'lanishsin! 📞'}
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  {step === 0 ? 'Usta, do\'kon yoki xizmat nomi' : step === 1 ? 'To\'g\'ri soha — tez topiladi' : 'Admin tekshirgandan keyin chiqadi'}
                </p>
              </div>
            </div>

            {step === 0 && (
              <>
                <Field label="Nomi" hint="Masalan: Bahrom gaz usta, Shifo dorixonasi" delay={60}>
                  <div className={INPUT_WRAP}>
                    <input className={INPUT} maxLength={80} placeholder="Nomini kiriting" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                  </div>
                  <span className="font-label-sm text-label-sm text-outline self-end">{name.length}/80</span>
                </Field>
                <PrimaryButton disabled={!nameOk} onClick={next}>
                  Keyingisi <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </PrimaryButton>
              </>
            )}

            {step === 1 &&
              (cats.error ? (
                <ErrorView error={cats.error} onRetry={cats.reload} />
              ) : !cats.data ? (
                <Skeleton className="h-72" />
              ) : (
                <>
                  <CategoryStep categories={cats.data} value={categoryId} onChange={setCategoryId} />
                  <PrimaryButton disabled={!categoryId} onClick={next}>
                    Keyingisi <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </PrimaryButton>
                </>
              ))}

            {step === 2 && (
              <>
                <Field label="Telefon raqami" hint="Qo'ng'iroqlar qabul qilinadigan asosiy raqam" delay={60}>
                  <div className={INPUT_WRAP}>
                    <span className="flex items-center gap-1.5 pr-3 mr-3 border-r border-outline-variant/50 font-label-lg text-label-lg text-on-surface shrink-0">
                      🇺🇿 +998
                    </span>
                    <input
                      className={INPUT}
                      inputMode="numeric"
                      placeholder="90 123 45 67"
                      value={maskLocal(digits)}
                      onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').replace(/^998/, '').slice(0, 9))}
                    />
                    {phoneOk && <span className="material-symbols-outlined fill text-tertiary text-[20px]">check_circle</span>}
                  </div>
                  {digits.length > 0 && !phoneOk && <span className="font-body-sm text-body-sm text-error">9 ta raqam kiriting</span>}
                </Field>

                <Field label="Mahalla" hint="Qayerda joylashgan yoki xizmat ko'rsatadi" delay={120}>
                  <button
                    type="button"
                    onClick={() => {
                      haptic('light');
                      setSheet(true);
                    }}
                    className={`${INPUT_WRAP} justify-between active:scale-[0.98]`}
                  >
                    <span className={`font-body-md text-body-md flex items-center gap-2 ${landmark ? 'text-on-surface' : 'text-outline'}`}>
                      <span className="material-symbols-outlined text-[18px] text-primary">location_on</span>
                      {landmark ? landmark.name : lms.loading ? 'Yuklanmoqda…' : 'Tanlang (ixtiyoriy)'}
                    </span>
                    <span className="material-symbols-outlined text-[20px] text-outline">expand_more</span>
                  </button>
                </Field>

                <Field label="Ish vaqti" hint="Ixtiyoriy" delay={180}>
                  <div className="flex items-center gap-2">
                    <div className={`${INPUT_WRAP} flex-1`}>
                      <input type="time" className={INPUT} value={workFrom} onChange={(e) => setWorkFrom(e.target.value)} aria-label="Dan" />
                    </div>
                    <span className="text-on-surface-variant">—</span>
                    <div className={`${INPUT_WRAP} flex-1`}>
                      <input type="time" className={INPUT} value={workTo} onChange={(e) => setWorkTo(e.target.value)} aria-label="Gacha" />
                    </div>
                  </div>
                </Field>

                <PrimaryButton disabled={!phoneOk || sending} onClick={submit}>
                  {sending ? 'Yuborilmoqda…' : 'Yuborish'}
                  {!sending && <span className="material-symbols-outlined text-[20px]">send</span>}
                </PrimaryButton>
              </>
            )}
          </div>
        )}
      </main>
      <MahallaSheet open={sheet} onClose={() => setSheet(false)} landmarks={areas} value={landmarkId} onPick={setLandmarkId} />
    </div>
  );
};
