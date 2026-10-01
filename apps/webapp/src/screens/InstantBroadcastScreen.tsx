import React, { useEffect, useState } from 'react';
import { apiFetch } from '../config';
import { IosHeader } from '../components/ios/IosHeader';
import { useFeedback } from '../context/FeedbackContext';

export interface InstantBroadcastScreenProps {
  onBack: () => void;
}

/** iOS-uslubidagi yoqish/o'chirish tugmasi — UsefulBotsScreen'dagi bilan bir xil. */
const IosToggle: React.FC<{ enabled: boolean; onToggle: () => void; disabled?: boolean }> = ({ enabled, onToggle, disabled }) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={disabled}
    className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${enabled ? 'bg-ios-green' : 'bg-ios-fill/30'} ${disabled ? 'opacity-40' : ''}`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
        enabled ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

/**
 * "Ommaviy xabar" (2026-10) — mavjud rejalashtirilgan "Xabar yuborish"
 * ekranidan FARQLI: bitta matn yozib, kimlarga (botga start bosgan
 * foydalanuvchilarga va/yoki bot ulangan guruhlarga) yuborishni
 * tanlab, DARHOL ("live") yuborish uchun oddiy, bir martalik vosita.
 * Orqa fonda mavjud BroadcastMessage tizimi ishlatiladi — bot shu
 * xabarni ~1 daqiqa ichida (keyingi "tick"da) jo'natadi.
 */
export const InstantBroadcastScreen: React.FC<InstantBroadcastScreenProps> = ({ onBack }) => {
  const { confirm } = useFeedback();
  const [text, setText] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [sendToUsers, setSendToUsers] = useState(false);
  const [sendToGroups, setSendToGroups] = useState(false);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [groupCount, setGroupCount] = useState<number | null>(null);
  const [loadingAudience, setLoadingAudience] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentResult, setSentResult] = useState<{ userCount: number; groupCount: number; totalRecipients: number } | null>(null);
  const MAX_PHOTOS = 8;

  const initData = window.Telegram?.WebApp?.initData || '';
  const headers = { 'Content-Type': 'application/json', 'x-init-data': initData };

  useEffect(() => {
    apiFetch('/api/admin/broadcast-instant/audience')
      .then((r) => r.json())
      .then((d) => {
        setUserCount(typeof d.userCount === 'number' ? d.userCount : 0);
        setGroupCount(typeof d.groupCount === 'number' ? d.groupCount : 0);
      })
      .catch(() => {
        setUserCount(0);
        setGroupCount(0);
      })
      .finally(() => setLoadingAudience(false));
  }, []);

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

  const canSend = text.trim().length > 0 && (sendToUsers || sendToGroups) && !isSending;

  const handleSend = async () => {
    setSendError(null);
    const recipients: string[] = [];
    if (sendToUsers) recipients.push(`${userCount ?? 0} ta foydalanuvchiga`);
    if (sendToGroups) recipients.push(`${groupCount ?? 0} ta guruhga`);
    const ok = await confirm({
      title: `Bu xabar ${recipients.join(' va ')} yuborilsinmi? Bu amalni ortga qaytarib bo'lmaydi.`,
      confirmLabel: 'Ha, yuborilsin',
      destructive: true,
    });
    if (!ok) return;

    setIsSending(true);
    try {
      const res = await fetch('/api/admin/broadcast-instant', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text, photoUrls, sendToUsers, sendToGroups }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setSentResult({ userCount: data.userCount, groupCount: data.groupCount, totalRecipients: data.totalRecipients });
        setText('');
        setPhotoUrls([]);
        setSendToUsers(false);
        setSendToGroups(false);
      } else {
        setSendError(data.message || 'Yuborishda xatolik yuz berdi');
      }
    } catch {
      setSendError('Aloqa xatoligi');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 -mx-4 px-4 pt-1 pb-16">
      <IosHeader title="Ommaviy xabar" subtitle="Bitta martalik, darhol yuboriladigan xabar" onBack={onBack} />

      {sentResult && (
        <div className="p-3.5 bg-ios-green/10 rounded-ios text-[13px] leading-relaxed">
          <p className="font-semibold text-ios-green mb-0.5">✅ Navbatga qo'yildi</p>
          <p className="text-ios-label-secondary">
            {sentResult.userCount > 0 && <>👤 {sentResult.userCount} ta foydalanuvchiga</>}
            {sentResult.userCount > 0 && sentResult.groupCount > 0 && ' va '}
            {sentResult.groupCount > 0 && <>👥 {sentResult.groupCount} ta guruhga</>}
            {' '}— taxminan 1 daqiqa ichida yetib boradi.
          </p>
        </div>
      )}

      {sendError && (
        <div className="p-3 bg-ios-red/10 rounded-ios text-ios-red text-[13px] font-medium">{sendError}</div>
      )}

      <div className="bg-ios-card rounded-ios-lg p-4 shadow-sm space-y-4">
        {/* MATN */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-ios-label-secondary/70 uppercase tracking-wide">Xabar matni *</label>
          <textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Yuboriladigan xabar matnini yozing..."
            className="w-full bg-ios-fill/[0.08] rounded-ios px-3.5 py-2.5 text-[13px] text-ios-label placeholder:text-ios-label-secondary/50 outline-none resize-none"
          />
        </div>

        {/* RASM (IXTIYORIY) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-ios-label-secondary/70 uppercase tracking-wide">
            Rasm (ixtiyoriy) — {photoUrls.length}/{MAX_PHOTOS}
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

        {/* QABUL QILUVCHILAR — Apple-uslub tugmalar */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-ios-label-secondary/70 uppercase tracking-wide">Kimlarga yuborilsin</label>

          <div className="flex items-center justify-between p-3 bg-ios-fill/[0.06] rounded-ios">
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-ios-label">Foydalanuvchilarga</span>
              <span className="text-[11px] text-ios-label-secondary/70">
                {loadingAudience ? 'Yuklanmoqda...' : `Botga start bosgan ${userCount} kishi (shaxsiy xabar)`}
              </span>
            </div>
            <IosToggle enabled={sendToUsers} onToggle={() => setSendToUsers((v) => !v)} disabled={loadingAudience} />
          </div>

          <div className="flex items-center justify-between p-3 bg-ios-fill/[0.06] rounded-ios">
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-ios-label">Guruhlarga</span>
              <span className="text-[11px] text-ios-label-secondary/70">
                {loadingAudience ? 'Yuklanmoqda...' : `Bot ulangan ${groupCount} ta guruh/kanal`}
              </span>
            </div>
            <IosToggle enabled={sendToGroups} onToggle={() => setSendToGroups((v) => !v)} disabled={loadingAudience} />
          </div>
        </div>
      </div>

      <button
        onClick={handleSend}
        disabled={!canSend}
        className="w-full py-3.5 bg-ios-blue active:opacity-70 text-white font-semibold text-[16px] rounded-ios transition-opacity disabled:opacity-40"
      >
        {isSending ? 'Yuborilmoqda...' : '🚀 Yuborish'}
      </button>

      <p className="text-[11px] text-ios-label-secondary/60 leading-relaxed px-1">
        Bu — bir martalik xabar. Takrorlanuvchi, rejalashtirilgan postlar uchun "Xabar yuborish" bo'limidan foydalaning.
      </p>
    </div>
  );
};
