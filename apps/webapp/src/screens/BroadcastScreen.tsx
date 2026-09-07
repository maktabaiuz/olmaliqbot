import React, { useState, useEffect } from 'react';

export interface BroadcastScreenProps {
  onBack: () => void;
}

interface GroupOption {
  id: string;
  chatId: string;
  title: string;
}

interface BroadcastItem {
  id: string;
  text: string;
  photoUrls: string[];
  targetChatIds: string[];
  nextSendAt: string | null;
  repeatIntervalMinutes: number | null;
  isEnabled: boolean;
  lastSentAt: string | null;
  createdAt: string;
}

// Takrorlanish tanlovlari — daqiqaga aylantirilgan qiymatlar bilan.
const REPEAT_OPTIONS: { label: string; minutes: number | null }[] = [
  { label: "Faqat bir marta", minutes: null },
  { label: 'Har soatda', minutes: 60 },
  { label: 'Har 3 soatda', minutes: 180 },
  { label: 'Har 6 soatda', minutes: 360 },
  { label: 'Har 12 soatda', minutes: 720 },
  { label: 'Har kuni', minutes: 1440 },
  { label: 'Har hafta', minutes: 10080 },
];

function repeatLabel(minutes: number | null): string {
  const found = REPEAT_OPTIONS.find((o) => o.minutes === minutes);
  return found ? found.label : `Har ${minutes} daqiqada`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// <input type="datetime-local"> qiymati mahalliy vaqt zonasida, "Z"siz kutiladi
function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const BroadcastScreen: React.FC<BroadcastScreenProps> = ({ onBack }) => {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Forma maydonlari
  const [text, setText] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [firstSendAt, setFirstSendAt] = useState(() => toDatetimeLocalValue(new Date(Date.now() + 5 * 60 * 1000)));
  const [repeatMinutes, setRepeatMinutes] = useState<number | null>(1440);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const MAX_PHOTOS = 8;

  const initData = window.Telegram?.WebApp?.initData || '';
  const headers = { 'Content-Type': 'application/json', 'x-init-data': initData };

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/admin/broadcasts', { headers }).then((r) => r.json()),
      fetch('/api/admin/groups', { headers }).then((r) => r.json()),
    ])
      .then(([b, g]) => {
        setBroadcasts(Array.isArray(b) ? b : []);
        setGroups(Array.isArray(g) ? g : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setText('');
    setPhotoUrls([]);
    setSelectedChatIds(groups.map((g) => g.chatId));
    setFirstSendAt(toDatetimeLocalValue(new Date(Date.now() + 5 * 60 * 1000)));
    setRepeatMinutes(1440);
    setIsEnabled(true);
    setFormError(null);
    setEditingId(null);
  };

  const openNewForm = () => {
    resetForm();
    setView('form');
  };

  const openEditForm = (b: BroadcastItem) => {
    setEditingId(b.id);
    setText(b.text);
    setPhotoUrls(b.photoUrls || []);
    setSelectedChatIds(b.targetChatIds || []);
    setFirstSendAt(toDatetimeLocalValue(b.nextSendAt ? new Date(b.nextSendAt) : new Date(Date.now() + 5 * 60 * 1000)));
    setRepeatMinutes(b.repeatIntervalMinutes);
    setIsEnabled(b.isEnabled);
    setFormError(null);
    setView('form');
  };

  const toggleGroup = (chatId: string) => {
    setSelectedChatIds((prev) => (prev.includes(chatId) ? prev.filter((c) => c !== chatId) : [...prev, chatId]));
  };

  const handlePhotoFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPhotoUploadError(null);
    setIsUploadingPhoto(true);
    try {
      for (const file of Array.from(files)) {
        if (photoUrls.length >= MAX_PHOTOS) {
          setPhotoUploadError(`Eng ko'pi bilan ${MAX_PHOTOS} ta rasm bo'lishi mumkin`);
          break;
        }
        const formData = new FormData();
        formData.append('photo', file);
        const res = await fetch('/api/admin/listings/upload-photo', {
          method: 'POST',
          headers: { 'x-init-data': initData },
          body: formData,
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.url) {
          setPhotoUrls((prev) => [...prev, data.url]);
        } else {
          setPhotoUploadError(data.error || 'Rasmni yuklashda xatolik yuz berdi');
        }
      }
    } catch {
      setPhotoUploadError('Aloqa xatoligi — rasm yuklanmadi');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    setFormError(null);
    if (!text.trim()) {
      setFormError('Xabar matnini kiriting');
      return;
    }
    if (selectedChatIds.length === 0) {
      setFormError('Kamida bitta guruh/kanal tanlang');
      return;
    }
    setIsSaving(true);
    try {
      const body = {
        text,
        photoUrls,
        targetChatIds: selectedChatIds,
        firstSendAt: new Date(firstSendAt).toISOString(),
        repeatIntervalMinutes: repeatMinutes,
        isEnabled,
      };
      const res = editingId
        ? await fetch(`/api/admin/broadcasts/${editingId}`, { method: 'PUT', headers, body: JSON.stringify(body) })
        : await fetch('/api/admin/broadcasts', { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        setView('list');
        loadAll();
      } else {
        setFormError(data.message || 'Saqlashda xatolik yuz berdi');
      }
    } catch {
      setFormError('Aloqa xatoligi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEnabled = async (b: BroadcastItem) => {
    setBroadcasts((prev) => prev.map((x) => (x.id === b.id ? { ...x, isEnabled: !x.isEnabled } : x)));
    await fetch(`/api/admin/broadcasts/${b.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ isEnabled: !b.isEnabled }),
    }).catch(() => {});
  };

  const handleDelete = async (b: BroadcastItem) => {
    if (!window.confirm(`"${b.text.slice(0, 40)}..." postini butunlay o'chirmoqchimisiz?`)) return;
    await fetch(`/api/admin/broadcasts/${b.id}`, { method: 'DELETE', headers }).catch(() => {});
    loadAll();
  };

  // ────────────────────────────────────────────────────────────────────────
  // FORM VIEW
  // ────────────────────────────────────────────────────────────────────────
  if (view === 'form') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setView('list')} className="p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <span className="material-symbols-outlined text-[20px] font-bold">arrow_back</span>
          </button>
          <h3 className="font-bold text-sm text-on-surface dark:text-slate-100">
            {editingId ? 'Postni tahrirlash' : 'Yangi post'}
          </h3>
        </div>

        {formError && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-600 dark:text-red-400 text-xs font-medium">
            {formError}
          </div>
        )}

        <div className="bg-surface dark:bg-[#17212B] p-4 border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          {/* MATN */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Xabar matni *</label>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Guruh/kanallarga yuboriladigan xabar matnini yozing..."
              className="w-full bg-slate-50 dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-on-surface dark:text-slate-100 placeholder-slate-500 outline-none focus:border-primary resize-none"
            />
          </div>

          {/* RASMLAR */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase">
              Rasmlar ({photoUrls.length}/{MAX_PHOTOS})
            </label>
            {photoUrls.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photoUrls.map((url) => (
                  <div key={url} className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-outline-variant/30 dark:border-slate-800">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotoUrls(photoUrls.filter((u) => u !== url))}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white text-[10px] leading-none flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {photoUrls.length < MAX_PHOTOS && (
              <label className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-primary/40 dark:border-sky-500/40 text-primary dark:text-sky-400 text-xs font-bold cursor-pointer">
                <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
                {isUploadingPhoto ? 'Yuklanmoqda...' : "Rasm qo'shish"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={isUploadingPhoto}
                  onChange={(e) => {
                    handlePhotoFilesSelected(e.target.files);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>
            )}
            {photoUploadError && <p className="text-red-500 text-[10px] font-semibold">{photoUploadError}</p>}
          </div>

          {/* GURUH TANLASH */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase">
                Guruh/kanallar ({selectedChatIds.length}/{groups.length})
              </label>
              <button
                type="button"
                onClick={() => setSelectedChatIds(selectedChatIds.length === groups.length ? [] : groups.map((g) => g.chatId))}
                className="text-[10px] font-bold text-primary dark:text-sky-400"
              >
                {selectedChatIds.length === groups.length ? "Hammasini bekor qilish" : "Hammasini belgilash"}
              </button>
            </div>
            {groups.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">Hali hech qanday guruhga qo'shilmagan</p>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-outline-variant/30 dark:border-slate-800 divide-y divide-outline-variant/10 dark:divide-slate-800/80">
                {groups.map((g) => (
                  <label key={g.chatId} className="flex items-center gap-2.5 p-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <input
                      type="checkbox"
                      checked={selectedChatIds.includes(g.chatId)}
                      onChange={() => toggleGroup(g.chatId)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary"
                    />
                    <span className="text-xs font-semibold text-on-surface dark:text-slate-100 truncate">{g.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* BIRINCHI YUBORILISH VAQTI */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Birinchi yuborilish vaqti *</label>
            <input
              type="datetime-local"
              value={firstSendAt}
              onChange={(e) => setFirstSendAt(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-on-surface dark:text-slate-100 outline-none focus:border-primary"
            />
          </div>

          {/* TAKRORLANISH */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Takrorlanish</label>
            <div className="flex flex-wrap gap-1.5">
              {REPEAT_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setRepeatMinutes(opt.minutes)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    repeatMinutes === opt.minutes
                      ? 'bg-primary dark:bg-sky-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* YOQILGAN/O'CHIRILGAN */}
          <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#1C2733] rounded-xl cursor-pointer">
            <span className="text-xs font-bold text-on-surface dark:text-slate-100">Yoqilgan</span>
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="w-5 h-5 rounded text-primary focus:ring-primary"
            />
          </label>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3.5 bg-gradient-to-r from-[#2AABEE] to-[#0088CC] text-white font-bold text-sm rounded-2xl shadow-md active:scale-98 transition-all disabled:opacity-50"
        >
          {isSaving ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <span className="material-symbols-outlined text-[20px] font-bold">arrow_back</span>
          </button>
          <h3 className="font-bold text-sm text-on-surface dark:text-slate-100">Habar yuborish</h3>
        </div>
        <button
          onClick={openNewForm}
          className="flex items-center gap-1 bg-primary dark:bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-full active:scale-95"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Yangi
        </button>
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        Bu yerda yaratilgan xabarlar belgilangan vaqtda, tanlangan guruh/kanallarga avtomatik yuboriladi.
        Har safar qayta yuborilganda, o'sha guruhdagi OLDINGI nusxa avtomatik o'chiriladi — faqat eng so'nggisi ko'rinadi.
      </p>

      {loading ? (
        <div className="bg-surface dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-sm p-4 space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          ))}
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="bg-surface dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-sm p-8 text-center text-xs text-slate-500">
          Hali rejalashtirilgan post yo'q
        </div>
      ) : (
        <div className="space-y-2.5">
          {broadcasts.map((b) => (
            <div
              key={b.id}
              className="bg-surface dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-sm p-3.5 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-on-surface dark:text-slate-100 line-clamp-2 flex-1">
                  {b.text}
                </p>
                <button
                  onClick={() => handleToggleEnabled(b)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    b.isEnabled
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {b.isEnabled ? '✅ Yoqilgan' : '⏸️ O\'chirilgan'}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
                {b.photoUrls.length > 0 && <span>🖼 {b.photoUrls.length} ta rasm</span>}
                <span>📢 {b.targetChatIds.length} ta guruh/kanal</span>
                <span>🔁 {repeatLabel(b.repeatIntervalMinutes)}</span>
                <span>⏰ Keyingi: {formatDateTime(b.nextSendAt)}</span>
                {b.lastSentAt && <span>✔️ Oxirgi: {formatDateTime(b.lastSentAt)}</span>}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => openEditForm(b)}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-on-surface dark:text-slate-100 text-[11px] font-bold rounded-xl active:scale-95"
                >
                  Tahrirlash
                </button>
                <button
                  onClick={() => handleDelete(b)}
                  className="flex-1 py-2 bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] font-bold rounded-xl active:scale-95"
                >
                  O'chirish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
