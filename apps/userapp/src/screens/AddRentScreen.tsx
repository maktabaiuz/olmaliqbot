import React, { useRef, useState } from 'react';
import type { Route } from '../lib/router';
import { goBack, navigate } from '../lib/router';
import { api, ApiError } from '../lib/api';
import { haptic } from '../lib/telegram';
import { useAsync, useToast } from '../components/ui';
import { BlobFamily, Blob } from '../components/Blob';
import { MahallaSheet, readMahalla, realAreas } from './profile/MahallaSheet';

/**
 * "Uyimni ijaraga beraman" (2026-10) — bitta sahifali, 1 daqiqalik forma.
 * E'lon admin tasdig'iga tushadi, keyin "Arenda" bo'limida chiqadi.
 */
const KINDS = [
  { key: 'kvartira', label: 'Kvartira', emoji: '🏢' },
  { key: 'hovli', label: 'Hovli uy', emoji: '🏡' },
  { key: 'xona', label: 'Xona', emoji: '🛏️' },
  { key: 'ofis', label: 'Ofis', emoji: '💼' },
  { key: 'dokon', label: "Do'kon / joy", emoji: '🏪' },
];
const TERMS = [
  { key: 'OYLIK', label: 'Oyiga' },
  { key: 'KUNLIK', label: 'Kuniga' },
  { key: 'YILLIK', label: 'Yiliga' },
];

const Section: React.FC<{ n: number; title: string; children: React.ReactNode; error?: string | null }> = ({ n, title, children, error }) => (
  <section id={`sec-${n}`} className={`bg-surface-container-lowest rounded-lg p-4 clay-card flex flex-col gap-3 anim-slide-up scroll-mt-20 ${error ? 'ring-2 ring-error' : ''}`} style={{ animationDelay: `${n * 50}ms` }}>
    <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
      <span className="w-6 h-6 rounded-full bg-primary text-on-primary text-[12px] font-bold flex items-center justify-center">{n}</span>
      {title}
    </h2>
    {children}
    {error && <p className="font-label-md text-label-md text-error flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">error</span>{error}</p>}
  </section>
);

const chip = (a: boolean) =>
  `h-11 px-4 rounded-full font-label-lg text-label-lg flex items-center gap-1.5 shrink-0 active:scale-95 transition-all ${a ? 'bg-primary text-on-primary clay-fab' : 'bg-surface-container-low text-on-surface'}`;

export const AddRentScreen: React.FC<{ route: Route }> = () => {
  const toast = useToast();
  const lms = useAsync(() => api.landmarks(), []);
  const [kind, setKind] = useState('kvartira');
  const [rooms, setRooms] = useState<number | null>(2);
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'UZS'>('USD');
  const [term, setTerm] = useState('OYLIK');
  const [landmarkId, setLandmarkId] = useState<string | null>(readMahalla());
  const [phone, setPhone] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(0);
  const [desc, setDesc] = useState('');
  const [sheet, setSheet] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [errs, setErrs] = useState<Record<number, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const areas = realAreas(lms.data);
  const area = areas.find((a) => a.id === landmarkId);
  const digits = phone.replace(/\D/g, '');
  const priceNum = Number(price.replace(/\D/g, ''));
  const ready = priceNum > 0 && digits.length === 9 && !!landmarkId && uploading === 0;
  React.useEffect(() => {
    setErrs((e) => {
      const n = { ...e };
      if (priceNum > 0) delete n[2];
      if (landmarkId) delete n[3];
      if (digits.length === 9) delete n[4];
      return Object.keys(n).length === Object.keys(e).length ? e : n;
    });
  }, [priceNum, landmarkId, digits.length]);
  const needRooms = kind === 'kvartira' || kind === 'hovli';

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).slice(0, 8 - photos.length);
    for (const f of list) {
      if (f.size > 5 * 1024 * 1024) {
        toast("Rasm 5 MB dan katta — boshqasini tanlang", 'error');
        continue;
      }
      setUploading((n) => n + 1);
      try {
        const url = await api.uploadPhoto(f);
        setPhotos((p) => [...p, url]);
      } catch (e) {
        toast((e as ApiError).body?.message || 'Rasm yuklanmadi', 'error');
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const submit = async () => {
    if (sending) return;
    const e: Record<number, string> = {};
    if (!(priceNum > 0)) e[2] = 'Narxni yozing';
    if (!landmarkId) e[3] = 'Mahallani tanlang';
    if (digits.length !== 9) e[4] = "Telefon raqamni to'liq yozing (9 ta raqam)";
    setErrs(e);
    const first = Object.keys(e).map(Number).sort()[0];
    if (first) {
      haptic('error');
      toast(e[first], 'error');
      document.getElementById(`sec-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (uploading) return toast('Rasmlar yuklanishini kuting', 'info');
    setSending(true);
    try {
      await api.addRental({ kind, rooms: needRooms ? rooms : null, price: priceNum, currency, term, landmarkId, phone: digits, photos, description: desc });
      haptic('success');
      setDone(true);
    } catch (e) {
      haptic('error');
      toast((e as ApiError).body?.message || "Yuborib bo'lmadi", 'error');
    } finally {
      setSending(false);
    }
  };

  if (done)
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-center px-6 gap-5 bg-surface">
        <BlobFamily size={44} shapes={['triangle', 'cloud', 'sphere', 'pill']} />
        <h1 className="font-headline-lg text-headline-lg text-on-surface">E'loningiz joylandi! 🎉</h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
          E'loningiz hozirdanoq "Arenda" bo'limida chiqdi. Uy berilgach, "Mening e'lonlarim"dan <b>Berildi</b> tugmasini bosing.
        </p>
        <button onClick={() => navigate('/rent', { replace: true })} className="h-14 px-8 rounded-full bg-primary text-on-primary font-label-lg text-label-lg clay-fab active:scale-95">
          Arenda bo'limiga
        </button>
      </main>
    );

  return (
    <main className="min-h-screen bg-surface pb-36">
      <header className="sticky top-0 z-40 pt-safe bg-surface/90 backdrop-blur-xl">
        <div className="h-14 px-margin flex items-center gap-2">
          <button aria-label="Orqaga" onClick={goBack} className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center active:scale-90">
            <span className="material-symbols-outlined text-primary">arrow_back_ios_new</span>
          </button>
          <h1 className="font-headline-sm text-headline-sm text-on-surface">Uyimni ijaraga beraman</h1>
        </div>
      </header>

      <div className="px-margin flex flex-col gap-3">
        <div className="flex items-center gap-3 bg-primary-fixed/50 rounded-lg p-3">
          <Blob shape="triangle" size={44} mood="hop" />
          <p className="font-body-sm text-body-sm text-on-surface">1 daqiqa — e'loningizni minglab olmaliqliklar ko'radi. Bepul.</p>
        </div>

        <Section n={1} title="Nimani ijaraga berasiz?">
          <div className="grid grid-cols-3 gap-2">
            {KINDS.map((k) => (
              <button
                key={k.key}
                onClick={() => {
                  haptic('select');
                  setKind(k.key);
                }}
                className={`flex flex-col items-center gap-1 py-3 rounded-lg active:scale-95 transition-all ${kind === k.key ? 'bg-primary text-on-primary clay-fab' : 'bg-surface-container-low text-on-surface'}`}
              >
                <span className="text-[26px]">{k.emoji}</span>
                <span className="font-label-md text-label-md">{k.label}</span>
              </button>
            ))}
          </div>
          {needRooms && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
              {[1, 2, 3, 4, 5].map((r) => (
                <button key={r} onClick={() => setRooms(r)} className={chip(rooms === r)}>
                  {r === 5 ? '5+ xona' : `${r} xona`}
                </button>
              ))}
            </div>
          )}
        </Section>

        <Section n={2} title="Narxi" error={errs[2]}>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-surface-container-low rounded-full px-4 h-14">
              <input
                inputMode="numeric"
                value={price ? Number(price).toLocaleString('ru-RU') : ''}
                onChange={(e) => setPrice(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder={currency === 'USD' ? '300' : '3 000 000'}
                className="w-full bg-transparent outline-none font-headline-md text-headline-md text-on-surface placeholder:text-outline"
              />
              <span className="font-label-lg text-label-lg text-on-surface-variant">{currency === 'USD' ? '$' : "so'm"}</span>
            </div>
            <div className="flex bg-surface-container-low rounded-full p-1">
              {(['USD', 'UZS'] as const).map((c) => (
                <button key={c} onClick={() => setCurrency(c)} className={`h-11 px-3 rounded-full font-label-md text-label-md ${currency === c ? 'bg-surface-container-lowest text-primary shadow-sm font-bold' : 'text-outline'}`}>
                  {c === 'USD' ? '$' : "so'm"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {TERMS.map((t) => (
              <button key={t.key} onClick={() => setTerm(t.key)} className={chip(term === t.key) + ' flex-1 justify-center'}>
                {t.label}
              </button>
            ))}
          </div>
        </Section>

        <Section n={3} title="Qayerda?" error={errs[3]}>
          <button onClick={() => setSheet(true)} className="h-14 px-4 rounded-full bg-surface-container-low flex items-center gap-2 text-left active:scale-[0.98]">
            <span className="material-symbols-outlined text-primary fill">location_on</span>
            <span className={`flex-1 font-body-lg text-body-lg ${area ? 'text-on-surface' : 'text-outline'}`}>{area ? area.name : 'Mahallani tanlang'}</span>
            <span className="material-symbols-outlined text-outline">expand_more</span>
          </button>
        </Section>

        <Section n={4} title="Telefon raqamingiz" error={errs[4]}>
          <div className="flex items-center bg-surface-container-low rounded-full px-4 h-14 gap-2">
            <span className="font-body-lg text-body-lg text-on-surface-variant">+998</span>
            <input
              type="tel"
              inputMode="numeric"
              value={digits.replace(/^(\d{2})(\d{0,3})(\d{0,2})(\d{0,2}).*/, (_, a, b, c, d) => [a, b, c, d].filter(Boolean).join(' '))}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
              placeholder="90 123 45 67"
              className="flex-1 bg-transparent outline-none font-body-lg text-body-lg text-on-surface placeholder:text-outline"
            />
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Raqam faqat qiziqqan odam "Qo'ng'iroq" bosganda ko'rinadi.</p>
        </Section>

        <Section n={5} title="Rasmlar (ixtiyoriy, 8 tagacha)">
          <div className="grid grid-cols-4 gap-2">
            {photos.map((u) => (
              <div key={u} className="relative aspect-square rounded-lg overflow-hidden bg-surface-container">
                <img src={u} alt="" className="w-full h-full object-cover" />
                <button aria-label="O'chirish" onClick={() => setPhotos((p) => p.filter((x) => x !== u))} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/55 text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            ))}
            {Array.from({ length: uploading }).map((_, i) => (
              <div key={`u${i}`} className="aspect-square rounded-lg skeleton" />
            ))}
            {photos.length + uploading < 8 && (
              <button onClick={() => fileRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed border-outline-variant flex flex-col items-center justify-center text-primary active:scale-95">
                <span className="material-symbols-outlined">add_a_photo</span>
                <span className="font-label-sm text-label-sm">Qo'shish</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          <p className="font-body-sm text-body-sm text-on-surface-variant">Rasmli e'lonlarga 5 barobar ko'p qo'ng'iroq qilinadi.</p>
        </Section>

        <Section n={6} title="Qo'shimcha (ixtiyoriy)">
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value.slice(0, 600))}
            rows={3}
            placeholder="Masalan: 3-qavat, mebelli, konditsioner bor, oilaga beriladi"
            className="w-full rounded-lg bg-surface-container-low p-3 outline-none font-body-md text-body-md text-on-surface placeholder:text-outline resize-none"
          />
        </Section>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-xl px-margin pt-3 pb-safe">
        <button
          disabled={sending}
          onClick={submit}
          className={`w-full max-w-md mx-auto mb-3 h-14 rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm clay-fab flex items-center justify-center gap-2 active:scale-[0.97] transition-all disabled:opacity-40 ${ready ? '' : 'opacity-80'}`}
        >
          <span className="material-symbols-outlined">{sending ? 'progress_activity' : 'send'}</span>
          {sending ? 'Yuborilmoqda…' : uploading ? 'Rasmlar yuklanmoqda…' : "E'lonni yuborish"}
        </button>
      </div>

      <MahallaSheet
        open={sheet}
        onClose={() => setSheet(false)}
        landmarks={areas}
        value={landmarkId}
        onPick={(id) => {
          setLandmarkId(id);
          setSheet(false);
        }}
      />
    </main>
  );
};
