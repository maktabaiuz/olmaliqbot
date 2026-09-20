import React, { useState, useEffect } from 'react';
import { IosHeader } from '../components/ios/IosHeader';
import { IosCard, IosRow } from '../components/ios/IosCard';
import { useFeedback } from '../context/FeedbackContext';
import { useLanguage } from '../context/LanguageContext';

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
  linkUrl: string | null;
  linkLabel: string | null;
  linkButtonStyle: string | null;
  lastError: string | null;
}

// Telegram Bot API'ning HAQIQIY, cheklangan 3 ta tugma rangi — boshqasi yo'q
// (grammY/@grammyjs/types'dan tasdiqlangan). "style" berilmasa — Telegram
// o'zi standart (kulrang) ko'rinishda ko'rsatadi.
const BUTTON_STYLES: { value: string | null; label: string; swatchClass: string }[] = [
  { value: null, label: 'Standart', swatchClass: 'bg-ios-label-secondary/40' },
  { value: 'primary', label: "Ko'k", swatchClass: 'bg-ios-blue' },
  { value: 'success', label: 'Yashil', swatchClass: 'bg-ios-green' },
  { value: 'danger', label: 'Qizil', swatchClass: 'bg-ios-red' },
];

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
  const { confirm } = useFeedback();
  const { t } = useLanguage();
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
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkButtonStyle, setLinkButtonStyle] = useState<string | null>('primary');
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
    setLinkUrl('');
    setLinkLabel('');
    setLinkButtonStyle('primary');
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
    setLinkUrl(b.linkUrl || '');
    setLinkLabel(b.linkLabel || '');
    setLinkButtonStyle(b.linkButtonStyle || 'primary');
    setFormError(null);
    setView('form');
  };

  // Vaqt bo'limini tezroq va aniqroq tanlash uchun tayyor tugmalar.
  const applyQuickTime = (minutesFromNow: number) => {
    setFirstSendAt(toDatetimeLocalValue(new Date(Date.now() + minutesFromNow * 60 * 1000)));
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
    const trimmedLink = linkUrl.trim();
    if (trimmedLink) {
      // "@olmaliq_bot" kabi Telegram username'ni to'g'ridan-to'g'ri
      // yozish — eng ko'p uchraydigan xato. Telegram bunday havolani
      // butunlay rad etadi va NATIJADA XABARNING O'ZI HAM yuborilmay
      // qoladi (2026-09 ishlab chiqarishda tasdiqlangan real xato) —
      // shuning uchun saqlashdan OLDIN aniq to'xtatiladi.
      if (/^@|t\.me\/@|^https?:\/\/@/i.test(trimmedLink)) {
        setFormError(
          `Bot/kanal username'ini shunday yozing: https://t.me/${trimmedLink.replace(/^https?:\/\/|^t\.me\/|@/gi, '')} (@ belgisisiz, https://t.me/ bilan)`
        );
        return;
      }
      try {
        const parsed = new URL(trimmedLink);
        if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname) throw new Error('invalid');
      } catch {
        setFormError("Havola to'liq va to'g'ri bo'lishi kerak, masalan: https://t.me/olmaliq_bot");
        return;
      }
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
        linkUrl: linkUrl.trim() || null,
        linkLabel: linkLabel.trim() || null,
        linkButtonStyle: linkUrl.trim() ? linkButtonStyle : null,
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
    const ok = await confirm({
      title: `"${b.text.slice(0, 40)}..." postini butunlay o'chirmoqchimisiz?`,
      confirmLabel: t('action_delete'),
      destructive: true,
    });
    if (!ok) return;
    await fetch(`/api/admin/broadcasts/${b.id}`, { method: 'DELETE', headers }).catch(() => {});
    loadAll();
  };

  // ────────────────────────────────────────────────────────────────────────
  // FORM VIEW
  // ────────────────────────────────────────────────────────────────────────
  if (view === 'form') {
    return (
      <div className="flex flex-col gap-4 -mx-4 px-4 pt-1 pb-16">
        <IosHeader
          title={editingId ? 'Postni tahrirlash' : 'Yangi post'}
          onBack={() => setView('list')}
          backLabel={t('action_back')}
        />

        {formError && (
          <div className="p-3 bg-ios-red/10 rounded-ios text-ios-red text-[13px] font-medium">
            {formError}
          </div>
        )}

        <div className="bg-ios-card rounded-ios-lg p-4 shadow-sm space-y-4">
          {/* MATN */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-ios-label-secondary/70 uppercase tracking-wide">Xabar matni *</label>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Guruh/kanallarga yuboriladigan xabar matnini yozing..."
              className="w-full bg-ios-fill/[0.08] rounded-ios px-3.5 py-2.5 text-[13px] text-ios-label placeholder:text-ios-label-secondary/50 outline-none resize-none"
            />
          </div>

          {/* RASMLAR */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-ios-label-secondary/70 uppercase tracking-wide">
              Rasmlar ({photoUrls.length}/{MAX_PHOTOS})
            </label>
            {photoUrls.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photoUrls.map((url) => (
                  <div key={url} className="relative shrink-0 w-16 h-16 rounded-ios overflow-hidden bg-ios-fill/[0.08]">
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
              <label className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-ios border border-dashed border-ios-blue/40 text-ios-blue text-[13px] font-semibold cursor-pointer">
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
            {photoUploadError && <p className="text-ios-red text-[11px] font-medium">{photoUploadError}</p>}
          </div>

          {/* GURUH TANLASH */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-ios-label-secondary/70 uppercase tracking-wide">
                Guruh/kanallar ({selectedChatIds.length}/{groups.length})
              </label>
              <button
                type="button"
                onClick={() => setSelectedChatIds(selectedChatIds.length === groups.length ? [] : groups.map((g) => g.chatId))}
                className="text-[11px] font-semibold text-ios-blue active:opacity-60"
              >
                {selectedChatIds.length === groups.length ? "Hammasini bekor qilish" : "Hammasini belgilash"}
              </button>
            </div>
            {groups.length === 0 ? (
              <p className="text-[13px] text-ios-label-secondary/70 py-2">Hali hech qanday guruhga qo'shilmagan</p>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-ios bg-ios-fill/[0.05]">
                {groups.map((g, idx) => (
                  <IosRow
                    key={g.chatId}
                    onClick={() => toggleGroup(g.chatId)}
                    last={idx === groups.length - 1}
                  >
                    <span className="text-[13px] font-medium text-ios-label truncate">{g.title}</span>
                    {selectedChatIds.includes(g.chatId) && (
                      <span className="material-symbols-outlined text-[18px] text-ios-blue shrink-0">check</span>
                    )}
                  </IosRow>
                ))}
              </div>
            )}
          </div>

          {/* BIRINCHI YUBORILISH VAQTI */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-ios-label-secondary/70 uppercase tracking-wide">Birinchi yuborilish vaqti *</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Hozir', minutes: 1 },
                { label: '1 soatdan keyin', minutes: 60 },
                { label: 'Ertaga shu vaqtda', minutes: 1440 },
              ].map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => applyQuickTime(q.minutes)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-ios-fill/[0.12] text-ios-label-secondary active:bg-ios-fill/20 transition-colors"
                >
                  {q.label}
                </button>
              ))}
            </div>
            <input
              type="datetime-local"
              value={firstSendAt}
              onChange={(e) => setFirstSendAt(e.target.value)}
              className="w-full bg-ios-fill/[0.08] rounded-ios px-3.5 py-2.5 text-[13px] text-ios-label outline-none"
            />
          </div>

          {/* TAKRORLANISH */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-ios-label-secondary/70 uppercase tracking-wide">Takrorlanish</label>
            <div className="flex flex-wrap gap-1.5">
              {REPEAT_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setRepeatMinutes(opt.minutes)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                    repeatMinutes === opt.minutes
                      ? 'bg-ios-blue text-white shadow-sm'
                      : 'bg-ios-fill/[0.12] text-ios-label-secondary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Aniq, tushunarli xulosa — nima sodir bo'lishini oldindan ko'rsatadi */}
            <p className="text-[11px] text-ios-blue bg-ios-blue/10 rounded-ios px-3 py-2 leading-relaxed">
              📅 Birinchi marta <b>{formatDateTime(new Date(firstSendAt).toISOString())}</b> da yuboriladi
              {repeatMinutes
                ? <>, keyin <b>{repeatLabel(repeatMinutes).toLowerCase()}</b> avtomatik qaytariladi (eskisi o'chib, yangisi qo'yiladi).</>
                : <> va boshqa qaytarilmaydi (faqat bir marta).</>}
            </p>
          </div>

          {/* HAVOLA (REKLAMA TUGMASI) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-ios-label-secondary/70 uppercase tracking-wide">Havola tugmasi (ixtiyoriy)</label>
            <p className="text-[10px] text-ios-label-secondary/60 -mt-1">
              Berilsa, xabar ostida bosiladigan tugma chiqadi — masalan kanalga o'tish uchun.
            </p>
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://t.me/..."
              className="w-full bg-ios-fill/[0.08] rounded-ios px-3.5 py-2.5 text-[13px] text-ios-label placeholder:text-ios-label-secondary/50 outline-none"
            />
            <input
              type="text"
              value={linkLabel}
              onChange={(e) => setLinkLabel(e.target.value)}
              placeholder="Tugma matni, masalan: Kanalga o'tish"
              className="w-full bg-ios-fill/[0.08] rounded-ios px-3.5 py-2.5 text-[13px] text-ios-label placeholder:text-ios-label-secondary/50 outline-none"
            />
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              <span className="text-[10px] font-semibold text-ios-label-secondary/70 uppercase mr-1">Tugma rangi:</span>
              {BUTTON_STYLES.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setLinkButtonStyle(s.value)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${
                    linkButtonStyle === s.value
                      ? 'border-ios-blue bg-ios-blue/10 text-ios-blue'
                      : 'border-ios-fill/20 text-ios-label-secondary/70'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${s.swatchClass}`} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* YOQILGAN/O'CHIRILGAN */}
          <div className="flex items-center justify-between p-3 bg-ios-fill/[0.06] rounded-ios">
            <span className="text-[13px] font-semibold text-ios-label">Yoqilgan</span>
            <button
              type="button"
              onClick={() => setIsEnabled((v) => !v)}
              className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${isEnabled ? 'bg-ios-green' : 'bg-ios-fill/30'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  isEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3.5 bg-ios-blue active:opacity-70 text-white font-medium text-[16px] rounded-ios transition-opacity disabled:opacity-40"
        >
          {isSaving ? 'Saqlanmoqda...' : t('action_save')}
        </button>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 -mx-4 px-4 pt-1 pb-16">
      <IosHeader
        title="Xabar yuborish"
        onBack={onBack}
        backLabel={t('action_back')}
        trailing={
          <button
            onClick={openNewForm}
            className="flex items-center gap-1 text-ios-blue text-[15px] font-semibold active:opacity-50 transition-opacity"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Yangi
          </button>
        }
      />

      <p className="text-[11px] text-ios-label-secondary/70 leading-relaxed">
        Bu yerda yaratilgan xabarlar belgilangan vaqtda, tanlangan guruh/kanallarga avtomatik yuboriladi.
        Har safar qayta yuborilganda, o'sha guruhdagi OLDINGI nusxa avtomatik o'chiriladi — faqat eng so'nggisi ko'rinadi.
      </p>

      {loading ? (
        <div className="bg-ios-card rounded-ios-lg shadow-sm p-4 space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-4 bg-ios-fill/[0.15] rounded animate-pulse" />
          ))}
        </div>
      ) : broadcasts.length === 0 ? (
        <IosCard>
          <div className="p-8 text-center text-[13px] text-ios-label-secondary/70">
            Hali rejalashtirilgan post yo'q
          </div>
        </IosCard>
      ) : (
        <div className="space-y-2.5">
          {broadcasts.map((b) => (
            <div key={b.id} className="bg-ios-card rounded-ios-lg shadow-sm p-3.5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-semibold text-ios-label line-clamp-2 flex-1">
                  {b.text}
                </p>
                <button
                  onClick={() => handleToggleEnabled(b)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    b.isEnabled
                      ? 'bg-ios-green/15 text-ios-green'
                      : 'bg-ios-fill/[0.15] text-ios-label-secondary/70'
                  }`}
                >
                  {b.isEnabled ? '✅ Yoqilgan' : '⏸️ O\'chirilgan'}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-ios-label-secondary/70">
                {b.photoUrls.length > 0 && <span>🖼 {b.photoUrls.length} ta rasm</span>}
                {b.linkUrl && <span>🔗 Havola tugmasi bor</span>}
                <span>📢 {b.targetChatIds.length} ta guruh/kanal</span>
                <span>🔁 {repeatLabel(b.repeatIntervalMinutes)}</span>
                <span>⏰ Keyingi: {formatDateTime(b.nextSendAt)}</span>
                {b.lastSentAt && <span>✔️ Oxirgi: {formatDateTime(b.lastSentAt)}</span>}
              </div>

              {b.lastError && (
                <div className="p-2.5 bg-ios-red/10 rounded-ios text-ios-red text-[10px] font-medium leading-relaxed">
                  ⚠️ Oxirgi yuborishda xato: {b.lastError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => openEditForm(b)}
                  className="flex-1 py-2 bg-ios-fill/[0.10] text-ios-label text-[11px] font-bold rounded-ios active:bg-ios-fill/20 transition-colors"
                >
                  {t('action_edit')}
                </button>
                <button
                  onClick={() => handleDelete(b)}
                  className="flex-1 py-2 bg-ios-red/10 text-ios-red text-[11px] font-bold rounded-ios active:bg-ios-red/20 transition-colors"
                >
                  {t('action_delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
