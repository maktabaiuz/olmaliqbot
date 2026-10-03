import React, { useEffect, useRef, useState } from 'react';
import { IosHeader } from '../../components/ios/IosHeader';
import { useFeedback } from '../../context/FeedbackContext';
import { jsonFetch, uploadPhoto } from './shared';
import { LandmarkLite, MahallaPicker } from './MahallaPicker';

const KINDS = [
  { id: 'kvartira', label: 'Kvartira', emoji: '🏢' },
  { id: 'hovli', label: 'Hovli uy', emoji: '🏡' },
  { id: 'xona', label: 'Xona', emoji: '🛏️' },
  { id: 'ofis', label: 'Ofis', emoji: '💼' },
  { id: 'dokon', label: "Do'kon/joy", emoji: '🏪' },
];
const TERMS = [
  { id: 'OYLIK', label: 'Oyiga' },
  { id: 'KUNLIK', label: 'Kuniga' },
  { id: 'YILLIK', label: 'Yiliga' },
];
const MAX_PHOTOS = 8;

interface Props {
  editId: string | null;
  onBack: () => void;
  onSaved: () => void;
}

const chip = (on: boolean) =>
  `px-3 py-2 rounded-[10px] text-[14px] font-medium ${on ? 'bg-ios-blue text-white' : 'bg-ios-fill/15 text-ios-label'}`;

const Section: React.FC<{ n: number; title: string; err?: string; children: React.ReactNode }> = ({ n, title, err, children }) => (
  <section id={`rsec-${n}`} className={`bg-ios-card rounded-ios shadow-sm p-4 flex flex-col gap-3 ${err ? 'ring-2 ring-ios-red' : ''}`}>
    <h3 className="text-[16px] font-semibold text-ios-label">
      <span className="text-ios-blue mr-1">{n}.</span> {title}
    </h3>
    {children}
    {err && <p className="text-[13px] text-ios-red font-medium">{err}</p>}
  </section>
);

export const RentalForm: React.FC<Props> = ({ editId, onBack, onSaved }) => {
  const { showToast } = useFeedback();
  const [landmarks, setLandmarks] = useState<LandmarkLite[]>([]);
  const [kind, setKind] = useState('kvartira');
  const [rooms, setRooms] = useState<number | null>(2);
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'UZS'>('USD');
  const [term, setTerm] = useState('OYLIK');
  const [landmarkId, setLandmarkId] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(0);
  const [desc, setDesc] = useState('');
  const [picker, setPicker] = useState(false);
  const [sending, setSending] = useState(false);
  const [errs, setErrs] = useState<Record<number, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    jsonFetch('/api/admin/landmarks-lite')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setLandmarks(Array.isArray(d) ? d : []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!editId) return;
    jsonFetch(`/api/admin/rentals/${editId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(({ item }) => {
        setKind(item.kind || 'kvartira');
        setRooms(item.roomCount ?? null);
        setPrice(item.rentPrice ? String(item.rentPrice) : '');
        setCurrency(item.rentPriceCurrency || 'USD');
        setTerm(item.rentTermType || 'OYLIK');
        setLandmarkId(item.primaryLandmarkId || null);
        setPhone(String(item.phone || '').replace(/\D/g, '').slice(-9));
        setPhotos(item.photoUrls || []);
        setDesc(item.description || '');
      })
      .catch(() => showToast("E'lon topilmadi", 'error'));
  }, [editId, showToast]);

  const digits = phone.replace(/\D/g, '');
  const priceNum = Number(price.replace(/\D/g, ''));
  const needRooms = kind === 'kvartira' || kind === 'hovli';
  const area = landmarks.find((l) => l.id === landmarkId);

  useEffect(() => {
    setErrs((e) => {
      const n = { ...e };
      if (priceNum > 0) delete n[2];
      if (landmarkId) delete n[3];
      if (digits.length === 9) delete n[4];
      return Object.keys(n).length === Object.keys(e).length ? e : n;
    });
  }, [priceNum, landmarkId, digits.length]);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files).slice(0, MAX_PHOTOS - photos.length)) {
      if (f.size > 5 * 1024 * 1024) {
        showToast('Rasm 5 MB dan katta', 'error');
        continue;
      }
      setUploading((n) => n + 1);
      try {
        const url = await uploadPhoto(f);
        setPhotos((p) => (p.length < MAX_PHOTOS ? [...p, url] : p));
      } catch (e) {
        showToast((e as Error).message || 'Rasm yuklanmadi', 'error');
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
      showToast(e[first], 'error');
      document.getElementById(`rsec-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (uploading) return showToast('Rasmlar yuklanishini kuting');
    setSending(true);
    try {
      const body = { kind, rooms: needRooms ? rooms : null, price: priceNum, currency, term, landmarkId, phone: digits, photos, description: desc };
      const res = editId
        ? await jsonFetch(`/api/admin/rentals/${editId}`, 'PUT', body)
        : await jsonFetch('/api/admin/rentals', 'POST', body);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast(d.message || d.error || "Saqlab bo'lmadi", 'error');
        return;
      }
      showToast(editId ? "E'lon yangilandi" : "E'lon qo'shildi", 'success');
      onSaved();
    } catch {
      showToast('Aloqa xatoligi', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 -mx-4 px-4 pt-1 pb-16">
      <IosHeader title={editId ? "E'lonni tahrirlash" : "Yangi e'lon"} onBack={onBack} />

      <Section n={1} title="Nimani ijaraga berasiz?">
        <div className="grid grid-cols-3 gap-2">
          {KINDS.map((k) => (
            <button
              key={k.id}
              onClick={() => setKind(k.id)}
              className={`flex flex-col items-center gap-1 py-3 rounded-[12px] text-[13px] font-medium ${
                kind === k.id ? 'bg-ios-blue text-white' : 'bg-ios-fill/15 text-ios-label'
              }`}
            >
              <span className="text-[24px]">{k.emoji}</span>
              {k.label}
            </button>
          ))}
        </div>
        {needRooms && (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((r) => (
              <button key={r} onClick={() => setRooms(r)} className={chip(rooms === r)}>
                {r === 5 ? '5+ xona' : `${r} xona`}
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section n={2} title="Narxi" err={errs[2]}>
        <div className="flex gap-2">
          <input
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
            placeholder={currency === 'USD' ? '300' : '3000000'}
            className="flex-1 min-w-0 rounded-[10px] bg-ios-fill/15 px-3 py-2.5 text-[16px] text-ios-label outline-none"
          />
          <div className="flex rounded-[10px] bg-ios-fill/15 p-0.5">
            {(['USD', 'UZS'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-3 rounded-[8px] text-[14px] font-semibold ${currency === c ? 'bg-ios-card text-ios-label shadow-sm' : 'text-ios-label-secondary'}`}
              >
                {c === 'USD' ? '$' : "so'm"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {TERMS.map((t) => (
            <button key={t.id} onClick={() => setTerm(t.id)} className={chip(term === t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </Section>

      <Section n={3} title="Qayerda?" err={errs[3]}>
        <button
          onClick={() => setPicker(true)}
          className="flex items-center justify-between rounded-[10px] bg-ios-fill/15 px-3 py-2.5 text-[15px]"
        >
          <span className={area ? 'text-ios-label' : 'text-ios-label-secondary'}>📍 {area?.name || 'Mahallani tanlang'}</span>
          <span className="material-symbols-outlined text-[18px] text-ios-label-secondary/60">chevron_right</span>
        </button>
      </Section>

      <Section n={4} title="Telefon" err={errs[4]}>
        <div className="flex items-center rounded-[10px] bg-ios-fill/15 px-3">
          <span className="text-[16px] text-ios-label-secondary mr-1">+998</span>
          <input
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
            placeholder="90 123 45 67"
            className="flex-1 min-w-0 bg-transparent py-2.5 text-[16px] text-ios-label outline-none"
          />
        </div>
      </Section>

      <Section n={5} title={`Rasmlar (${photos.length}/${MAX_PHOTOS})`}>
        <div className="grid grid-cols-4 gap-2">
          {photos.map((u) => (
            <div key={u} className="relative aspect-square">
              <img src={u} alt="" className="w-full h-full object-cover rounded-[8px]" />
              <button
                onClick={() => setPhotos((p) => p.filter((x) => x !== u))}
                className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-ios-red text-white text-[13px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              onClick={() => fileRef.current?.click()}
              className="aspect-square rounded-[8px] border-2 border-dashed border-ios-fill/40 text-ios-blue flex flex-col items-center justify-center text-[12px]"
            >
              <span className="material-symbols-outlined">add_a_photo</span>
              {uploading ? 'Yuklanmoqda…' : "Qo'shish"}
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </Section>

      <Section n={6} title="Qo'shimcha izoh">
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={4}
          placeholder="Masalan: yevroremont, mebel bor, oilaga…"
          className="w-full rounded-[10px] bg-ios-fill/15 p-3 text-[15px] text-ios-label outline-none"
        />
      </Section>

      <button
        onClick={submit}
        className="w-full py-3.5 rounded-ios bg-ios-blue text-white text-[17px] font-semibold active:opacity-80"
      >
        {sending ? 'Saqlanmoqda…' : editId ? 'Saqlash' : "E'lonni joylash"}
      </button>

      <MahallaPicker open={picker} items={landmarks} selectedId={landmarkId} onClose={() => setPicker(false)} onPick={setLandmarkId} />
    </div>
  );
};
