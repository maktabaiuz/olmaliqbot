import React, { useState, useEffect } from 'react';
import { IosHeader } from '../components/ios/IosHeader';
import { useFeedback } from '../context/FeedbackContext';

export interface EmergencyNumbersScreenProps {
  cityName?: string;
  onBack: () => void;
}

const HAIRLINE = { borderTop: '0.5px solid rgb(var(--ios-separator) / 0.29)' };

// Har bir maydon botning shablon matnidagi {mahalliy_...} o'rniga aynan
// shu tartibda qo'yiladi — kalitlar backend (AppSetting) va bot
// (getEmergencyLocalNumbers) bilan bir xil bo'lishi SHART.
const FIELDS: { key: string; label: string; help: string; placeholder: string }[] = [
  {
    key: 'emergency_mahalliy_gaz',
    label: 'Gaz idorasi (mahalliy)',
    help: "Gaz hidi/avariyasida 104 va 112 dan keyin ko'rsatiladigan shahar gaz xizmati raqami",
    placeholder: '+998 70 xxx xx xx',
  },
  {
    key: 'emergency_mahalliy_suv',
    label: "Suv ta'minoti (mahalliy)",
    help: 'Quvur yorilishi, issiq/sovuq suv yo\'qligida ko\'rsatiladigan suv avariya xizmati raqami',
    placeholder: '+998 70 xxx xx xx',
  },
  {
    key: 'emergency_mahalliy_elektr',
    label: 'Elektr tarmoqlari (mahalliy)',
    help: "Tok urishi va elektr avariyasida ko'rsatiladigan mahalliy elektr xizmati raqami",
    placeholder: '+998 70 xxx xx xx',
  },
  {
    key: 'emergency_mahalliy_issiqlik',
    label: "Issiqlik ta'minoti (mahalliy)",
    help: "Isitish yo'qligida ko'rsatiladigan issiqlik tarmog'i raqami",
    placeholder: '+998 70 xxx xx xx',
  },
  {
    key: 'emergency_mahalliy_hokimiyat',
    label: 'Hokimiyat navbatchisi',
    help: "Liftda qolish kabi ma'muriy holatlarda ko'rsatiladigan hokimiyat navbatchi raqami",
    placeholder: '+998 70 xxx xx xx',
  },
];

interface LocalNumber {
  id: string;
  label: string;
  phoneNumber: string;
  jargonWords: string[];
}

export const EmergencyNumbersScreen: React.FC<EmergencyNumbersScreenProps> = ({
  cityName = 'Olmaliq',
  onBack,
}) => {
  const { confirm, showToast } = useFeedback();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // "Qo'shimcha mahalliy raqamlar" (2026-09) — 5 ta qattiq kodlangan
  // maydondan FARQLI, admin cheksiz sonli qo'shimcha dispecher/xizmat
  // raqami qo'sha oladi, har biri o'z mahalliy jargon so'zlari bilan.
  const [localNumbers, setLocalNumbers] = useState<LocalNumber[]>([]);
  const [loadingLocalNumbers, setLoadingLocalNumbers] = useState(true);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [formLabel, setFormLabel] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formJargon, setFormJargon] = useState<string[]>([]);
  const [formJargonInput, setFormJargonInput] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const initData = window.Telegram?.WebApp?.initData || '';

  const loadLocalNumbers = () => {
    setLoadingLocalNumbers(true);
    fetch('/api/admin/local-numbers', { headers: { 'x-init-data': initData } })
      .then((r) => r.json())
      .then((data) => setLocalNumbers(data.numbers || []))
      .catch(() => {})
      .finally(() => setLoadingLocalNumbers(false));
  };

  useEffect(() => {
    Promise.all(FIELDS.map(f => fetch(`/api/admin/settings/${f.key}`).then(r => r.json())))
      .then(results => {
        const next: Record<string, string> = {};
        results.forEach((r, i) => { next[FIELDS[i].key] = r?.value || ''; });
        setValues(next);
      })
      .finally(() => setLoading(false));
    loadLocalNumbers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setFormLabel('');
    setFormPhone('');
    setFormJargon([]);
    setFormJargonInput('');
    setFormError(null);
  };

  const startEdit = (n: LocalNumber) => {
    setEditingId(n.id);
    setFormLabel(n.label);
    setFormPhone(n.phoneNumber);
    setFormJargon(n.jargonWords);
    setFormJargonInput('');
    setFormError(null);
  };

  const startNew = () => {
    resetForm();
    setEditingId('new');
  };

  const handleAddJargon = () => {
    const clean = formJargonInput.trim().toLowerCase();
    if (clean && !formJargon.includes(clean)) {
      setFormJargon([...formJargon, clean]);
      setFormJargonInput('');
    }
  };

  const handleSaveLocalNumber = async () => {
    if (!formLabel.trim() || !formPhone.trim()) {
      setFormError('Nomi va telefon raqami talab qilinadi');
      return;
    }
    setFormSaving(true);
    setFormError(null);
    try {
      const isNew = editingId === 'new';
      const url = isNew ? '/api/admin/local-numbers' : `/api/admin/local-numbers/${editingId}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-init-data': initData },
        body: JSON.stringify({ label: formLabel, phoneNumber: formPhone, jargonWords: formJargon }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEditingId(null);
        resetForm();
        loadLocalNumbers();
      } else {
        setFormError(data.message || 'Saqlashda xatolik yuz berdi');
      }
    } catch {
      setFormError('Aloqa xatoligi');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteLocalNumber = async (id: string) => {
    const ok = await confirm({
      title: "Raqamni o'chirish",
      message: "Bu raqamni o'chirishni tasdiqlaysizmi?",
      confirmLabel: "O'chirish",
      destructive: true,
    });
    if (!ok) return;
    await fetch(`/api/admin/local-numbers/${id}`, {
      method: 'DELETE',
      headers: { 'x-init-data': initData },
    });
    showToast("Raqam o'chirildi", 'success');
    loadLocalNumbers();
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const headers = { 'Content-Type': 'application/json', 'x-init-data': initData };
      const results = await Promise.all(
        FIELDS.map(f =>
          fetch(`/api/admin/settings/${f.key}`, {
            method: 'PUT', headers, body: JSON.stringify({ value: (values[f.key] || '').trim() }),
          })
        )
      );
      if (results.every(r => r.ok)) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      // jim — foydalanuvchi "Saqlash"ni qayta bosib ko'radi
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in pb-16 -mx-4 -mt-2 px-4 pt-1">
      <IosHeader
        title="Mahalliy raqamlar"
        subtitle={`${cityName} — favqulodda javoblarda ko'rsatiladi`}
        onBack={onBack}
      />

      {/* Tushuntirish banneri */}
      <div className="bg-ios-blue/10 rounded-ios-lg p-3.5 flex items-start gap-2.5">
        <span className="material-symbols-outlined text-[18px] text-ios-blue shrink-0 mt-0.5">info</span>
        <p className="text-[12px] text-ios-label-secondary/90 leading-relaxed">
          101, 102, 103, 104, 112 — butun O'zbekiston bo'yicha bir xil, doim
          avtomatik ko'rsatiladi, bu yerda o'zgartirish shart emas. Quyidagilar
          esa <b className="text-ios-label">faqat {cityName}ga xos</b> raqamlar — favqulodda xabarda milliy
          raqamlar bilan bir qatorda qo'shimcha ko'rsatiladi. Bo'sh qoldirilgan
          maydon shablonda umuman ko'rinmaydi.
        </p>
      </div>

      <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden">
        {FIELDS.map((f, idx) => (
          <div key={f.key} className="p-4 space-y-1.5" style={idx === 0 ? undefined : HAIRLINE}>
            <label className="text-[13px] font-medium text-ios-label">{f.label}</label>
            <p className="text-[12px] text-ios-label-secondary/70 leading-relaxed">{f.help}</p>
            {loading ? (
              <div className="h-10 bg-ios-fill/20 rounded-ios animate-pulse" />
            ) : (
              <input
                type="text"
                value={values[f.key] || ''}
                onChange={(e) => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full bg-ios-fill/[0.12] rounded-ios px-3.5 py-2.5 text-[15px] text-ios-label placeholder:text-ios-label-secondary/50 outline-none focus:ring-1 focus:ring-ios-blue"
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={loading || saving}
        className="w-full bg-ios-blue active:opacity-70 text-white font-medium py-3.5 rounded-ios text-[16px] transition-opacity disabled:opacity-40"
      >
        {saving ? 'Saqlanmoqda...' : saved ? 'Saqlandi ✓' : 'Saqlash'}
      </button>

      {/* QO'SHIMCHA MAHALLIY RAQAMLAR */}
      <div className="flex items-center justify-between pt-2">
        <h3 className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide">
          Qo'shimcha mahalliy raqamlar
        </h3>
        {editingId === null && (
          <button
            onClick={startNew}
            className="flex items-center gap-1 text-ios-blue text-[13px] font-semibold active:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            Qo'shish
          </button>
        )}
      </div>
      <p className="text-[12px] text-ios-label-secondary/70 -mt-3 leading-relaxed">
        Bular hayotiy xavf emas, oddiy ma'lumot-so'rovlar (masalan "Mahalla raisi", "Tozalik xizmati") —
        mahalliy jargon so'zlar orqali topilib, bot FAQAT nomi va telefon raqamini qaytaradi, hech qanday
        ogohlantirish shablonisiz.
      </p>

      {loadingLocalNumbers ? (
        <div className="h-16 bg-ios-fill/20 rounded-ios animate-pulse" />
      ) : (
        <div className="flex flex-col gap-2.5">
          {localNumbers.length === 0 && editingId !== 'new' && (
            <div className="bg-ios-card rounded-ios shadow-sm p-4 text-center text-[13px] text-ios-label-secondary/70">
              Hali qo'shimcha raqam yo'q
            </div>
          )}

          {localNumbers.map((n) =>
            editingId === n.id ? (
              <LocalNumberForm
                key={n.id}
                label={formLabel}
                setLabel={setFormLabel}
                phone={formPhone}
                setPhone={setFormPhone}
                jargon={formJargon}
                setJargon={setFormJargon}
                jargonInput={formJargonInput}
                setJargonInput={setFormJargonInput}
                onAddJargon={handleAddJargon}
                error={formError}
                saving={formSaving}
                onSave={handleSaveLocalNumber}
                onCancel={() => { setEditingId(null); resetForm(); }}
              />
            ) : (
              <div key={n.id} className="bg-ios-card rounded-ios shadow-sm p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-ios-label">{n.label}</p>
                    <p className="text-[13px] text-ios-label-secondary/70 font-mono">{n.phoneNumber}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(n)}
                      className="p-1.5 text-ios-label-secondary/70 active:text-ios-blue rounded-full transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteLocalNumber(n.id)}
                      className="p-1.5 text-ios-label-secondary/70 active:text-ios-red rounded-full transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
                {n.jargonWords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {n.jargonWords.map((w) => (
                      <span key={w} className="bg-ios-fill/[0.12] text-ios-label-secondary text-[11px] px-2 py-0.5 rounded-full">
                        {w}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {editingId === 'new' && (
            <LocalNumberForm
              label={formLabel}
              setLabel={setFormLabel}
              phone={formPhone}
              setPhone={setFormPhone}
              jargon={formJargon}
              setJargon={setFormJargon}
              jargonInput={formJargonInput}
              setJargonInput={setFormJargonInput}
              onAddJargon={handleAddJargon}
              error={formError}
              saving={formSaving}
              onSave={handleSaveLocalNumber}
              onCancel={() => { setEditingId(null); resetForm(); }}
            />
          )}
        </div>
      )}
    </div>
  );
};

const LocalNumberForm: React.FC<{
  label: string;
  setLabel: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  jargon: string[];
  setJargon: (v: string[]) => void;
  jargonInput: string;
  setJargonInput: (v: string) => void;
  onAddJargon: () => void;
  error: string | null;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}> = ({ label, setLabel, phone, setPhone, jargon, setJargon, jargonInput, setJargonInput, onAddJargon, error, saving, onSave, onCancel }) => (
  <div className="bg-ios-card rounded-ios-lg shadow-sm p-3.5 space-y-3">
    <div className="space-y-1">
      <label className="text-[11px] font-semibold text-ios-label-secondary/70 uppercase tracking-wide">Nomi</label>
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="masalan: Mahalla raisi"
        className="w-full bg-ios-fill/[0.12] rounded-ios px-3 py-2 text-[14px] text-ios-label placeholder:text-ios-label-secondary/70 outline-none"
      />
    </div>
    <div className="space-y-1">
      <label className="text-[11px] font-semibold text-ios-label-secondary/70 uppercase tracking-wide">Telefon raqami</label>
      <input
        type="text"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+998 90 123 45 67"
        className="w-full bg-ios-fill/[0.12] rounded-ios px-3 py-2 text-[14px] text-ios-label placeholder:text-ios-label-secondary/70 outline-none"
      />
    </div>
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-ios-label-secondary/70 uppercase tracking-wide">
        Mahalliy jargon so'zlar
      </label>
      <div className="flex flex-wrap gap-1.5">
        {jargon.map((w) => (
          <span key={w} className="bg-ios-purple/[0.12] text-ios-purple text-[12px] px-2.5 py-1 rounded-full flex items-center gap-1.5">
            {w}
            <button onClick={() => setJargon(jargon.filter((x) => x !== w))} className="text-ios-purple/70 active:text-ios-red font-bold">
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={jargonInput}
          onChange={(e) => setJargonInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAddJargon(); } }}
          placeholder="masalan: mahalla raisi raqami"
          className="flex-1 bg-ios-fill/[0.12] rounded-ios px-3 py-2 text-[13px] text-ios-label placeholder:text-ios-label-secondary/70 outline-none"
        />
        <button onClick={onAddJargon} className="text-ios-blue text-[13px] font-semibold px-2">
          Qo'shish
        </button>
      </div>
    </div>

    {error && <p className="text-[12px] text-ios-red">{error}</p>}

    <div className="flex items-center gap-2 pt-1">
      <button
        onClick={onCancel}
        className="flex-1 py-2.5 bg-ios-fill/[0.10] text-ios-label rounded-ios text-[13px] font-semibold active:bg-ios-fill/20 transition-colors"
      >
        Bekor qilish
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="flex-1 py-2.5 bg-ios-blue text-white rounded-ios text-[13px] font-bold active:opacity-70 transition-opacity disabled:opacity-50"
      >
        {saving ? 'Saqlanmoqda...' : 'Saqlash'}
      </button>
    </div>
  </div>
);
