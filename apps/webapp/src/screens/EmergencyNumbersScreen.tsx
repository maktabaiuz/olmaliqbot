import React, { useState, useEffect } from 'react';
import { IosHeader } from '../components/ios/IosHeader';
import { useFeedback } from '../context/FeedbackContext';

export interface EmergencyNumbersScreenProps {
  cityName?: string;
  onBack: () => void;
}

const HAIRLINE = { borderTop: '0.5px solid rgb(var(--ios-separator) / 0.29)' };

interface CoreNumber {
  key: string;
  label: string;
  help: string;
  id: string | null;
  phoneNumber: string;
  jargonWords: string[];
}

interface LocalNumber {
  id: string;
  label: string;
  phoneNumber: string;
  jargonWords: string[];
}

// MUHIM (2026-09, ikkinchi bosqich): 5 ta ASOSIY mahalliy raqam endi
// AppSetting'dan EmergencyNumber jadvaliga ko'chirildi — shu bilan
// ularga ham jargon so'z qo'shish mumkin bo'ldi. Saqlangandan keyin
// bot buni AYNAN SHU ONDA (keshlash tugagach, ~30s ichida) jargon
// orqali ham, dramatik favqulodda shablonlarda ({mahalliy_gaz} va h.k.)
// ham ishlatadi — bitta yagona manba, ikki xil foydalanish.
export const EmergencyNumbersScreen: React.FC<EmergencyNumbersScreenProps> = ({
  cityName = 'Olmaliq',
  onBack,
}) => {
  const { confirm, showToast } = useFeedback();

  const [coreNumbers, setCoreNumbers] = useState<CoreNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [jargonInputs, setJargonInputs] = useState<Record<string, string>>({});

  // "Qo'shimcha mahalliy raqamlar" — 5 ta asosiy maydondan FARQLI, admin
  // cheksiz sonli qo'shimcha dispecher/xizmat raqami qo'sha oladi.
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
  const headers = { 'Content-Type': 'application/json', 'x-init-data': initData };

  const loadCoreNumbers = () => {
    setLoading(true);
    fetch('/api/admin/local-numbers/core', { headers: { 'x-init-data': initData } })
      .then((r) => r.json())
      .then((data) => setCoreNumbers(data.numbers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadLocalNumbers = () => {
    setLoadingLocalNumbers(true);
    fetch('/api/admin/local-numbers', { headers: { 'x-init-data': initData } })
      .then((r) => r.json())
      .then((data) => setLocalNumbers(data.numbers || []))
      .catch(() => {})
      .finally(() => setLoadingLocalNumbers(false));
  };

  useEffect(() => {
    loadCoreNumbers();
    loadLocalNumbers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateCorePhone = (key: string, phoneNumber: string) => {
    setCoreNumbers((prev) => prev.map((n) => (n.key === key ? { ...n, phoneNumber } : n)));
  };

  const addCoreJargon = (key: string) => {
    const clean = (jargonInputs[key] || '').trim().toLowerCase();
    if (!clean) return;
    setCoreNumbers((prev) =>
      prev.map((n) => (n.key === key && !n.jargonWords.includes(clean) ? { ...n, jargonWords: [...n.jargonWords, clean] } : n))
    );
    setJargonInputs((prev) => ({ ...prev, [key]: '' }));
  };

  const removeCoreJargon = (key: string, word: string) => {
    setCoreNumbers((prev) =>
      prev.map((n) => (n.key === key ? { ...n, jargonWords: n.jargonWords.filter((w) => w !== word) } : n))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const results = await Promise.all(
        coreNumbers.map((n) =>
          fetch(`/api/admin/local-numbers/by-key/${n.key}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ phoneNumber: n.phoneNumber.trim(), jargonWords: n.jargonWords }),
          })
        )
      );
      if (results.every((r) => r.ok)) {
        setSaved(true);
        showToast('Bazaga saqlandi', 'success');
        setTimeout(() => setSaved(false), 2500);
      } else {
        showToast('Saqlashda xatolik yuz berdi', 'error');
      }
    } catch {
      showToast('Aloqa xatoligi', 'error');
    } finally {
      setSaving(false);
    }
  };

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
        headers,
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
          raqamlar bilan bir qatorda qo'shimcha ko'rsatiladi. Har biriga mahalliy jargon so'z ham qo'shsangiz,
          oddiy so'rovga ("gaz idorasi raqami bormi" kabi) bot darhol, faqat shu raqam bilan javob beradi.
        </p>
      </div>

      <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-10 bg-ios-fill/20 rounded-ios animate-pulse" />)}
          </div>
        ) : (
          coreNumbers.map((n, idx) => (
            <div key={n.key} className="p-4 space-y-2" style={idx === 0 ? undefined : HAIRLINE}>
              <label className="text-[13px] font-medium text-ios-label">{n.label}</label>
              <p className="text-[12px] text-ios-label-secondary/70 leading-relaxed">{n.help}</p>
              <input
                type="text"
                value={n.phoneNumber}
                onChange={(e) => updateCorePhone(n.key, e.target.value)}
                placeholder="+998 70 xxx xx xx"
                className="w-full bg-ios-fill/[0.12] rounded-ios px-3.5 py-2.5 text-[15px] text-ios-label placeholder:text-ios-label-secondary/50 outline-none focus:ring-1 focus:ring-ios-blue"
              />

              <div className="pt-1">
                <span className="text-[11px] font-semibold text-ios-label-secondary/70 uppercase tracking-wide">
                  Mahalliy jargon so'zlar
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {n.jargonWords.map((w) => (
                    <span key={w} className="bg-ios-purple/[0.12] text-ios-purple text-[12px] px-2.5 py-1 rounded-full flex items-center gap-1.5">
                      {w}
                      <button onClick={() => removeCoreJargon(n.key, w)} className="text-ios-purple/70 active:text-ios-red font-bold">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="text"
                    value={jargonInputs[n.key] || ''}
                    onChange={(e) => setJargonInputs((prev) => ({ ...prev, [n.key]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCoreJargon(n.key); } }}
                    placeholder="masalan: gaz idorasi raqami"
                    className="flex-1 bg-ios-fill/[0.12] rounded-ios px-3 py-2 text-[13px] text-ios-label placeholder:text-ios-label-secondary/70 outline-none"
                  />
                  <button onClick={() => addCoreJargon(n.key)} className="text-ios-blue text-[13px] font-semibold px-2">
                    Qo'shish
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
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
