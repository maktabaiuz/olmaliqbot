import React, { useState, useEffect, useCallback } from 'react';
import { LandmarkPicker } from '../components/LandmarkPicker';
import { avatarColorForName } from '../utils/avatarColor';

export interface ListingDetailScreenProps {
  listingId: string;
  initData?: string;
  onBack: () => void;
}

interface ReviewItem {
  id: string;
  isPositive: boolean;
  comment?: string;
  createdAt: string;
}

interface CorrectionItem {
  id: string;
  message: string;
  status: string;
  createdAt: string;
}

interface HistoryItem {
  id: string;
  changedBy: string;
  createdAt: string;
  snapshot: any;
}

const IOS_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, sans-serif';
const HAIRLINE = '0.5px solid rgba(60,60,67,0.29)';
const IOS_BLUE = '#007AFF';
const IOS_GREEN = '#34C759';
const IOS_ORANGE = '#FF9500';
const IOS_GRAY = '#8E8E93';

// Grouped-inset-list bo'lim sarlavhasi — UISettings.app'dagi kabi kichik,
// katta harfli, kulrang label.
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-[13px] font-normal text-[#8E8E93] uppercase tracking-wide px-1">{children}</span>
);

// Bitta qator: chapda label, o'ngda tahrirlanadigan qiymat (iOS Settings
// "Nomi"/"Telefon" qatorlari kabi).
const FieldRow: React.FC<{
  label: string;
  children: React.ReactNode;
  hairlineTop?: boolean;
}> = ({ label, children, hairlineTop }) => (
  <div className="flex items-center px-3.5 py-2.5 gap-3" style={hairlineTop ? { borderTop: HAIRLINE } : undefined}>
    <span className="text-[15px] text-on-surface dark:text-white w-[104px] shrink-0">{label}</span>
    {children}
  </div>
);

export const ListingDetailScreen: React.FC<ListingDetailScreenProps> = ({
  listingId,
  initData = window.Telegram?.WebApp?.initData || '',
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalData, setOriginalData] = useState<any>(null);

  // Editable form fields state (Inline editable)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [landmarkName, setLandmarkName] = useState('');
  const [landmarkId, setLandmarkId] = useState('');
  const [workFrom, setWorkFrom] = useState('08:00');
  const [workTo, setWorkTo] = useState('20:00');
  const [badges, setBadges] = useState<string[]>([]);
  const [mapUrl, setMapUrl] = useState('');
  const [jargonSynonyms, setJargonSynonyms] = useState<string[]>([]);
  const [specificServices, setSpecificServices] = useState('');
  const [approxPrice, setApproxPrice] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const MAX_PHOTOS = 8;

  // Quick Action Toggles
  const [verification, setVerification] = useState<'VERIFIED' | 'COMMUNITY_UNVERIFIED'>('COMMUNITY_UNVERIFIED');
  const [status, setStatus] = useState<'ACTIVE' | 'PAUSED'>('ACTIVE');
  // Kategoriya ichidagi "1/2/3-o'rin" belgisi — bu yerda faqat ko'rsatiladi,
  // o'zi "Baza" ro'yzatidagi 1/2/3 tugmalari orqali belgilanadi/o'chiriladi.
  const [priorityRank, setPriorityRank] = useState<number | null>(null);

  // Related Sub-data
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [corrections, setCorrections] = useState<CorrectionItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [botPreviewText, setBotPreviewText] = useState('');
  const [addedByUser, setAddedByUser] = useState<any>(null);

  // UI Modals & Menus
  const [showMenu, setShowMenu] = useState(false);
  const [showBotModal, setShowBotModal] = useState(false);
  const [newBadgeInput, setNewBadgeInput] = useState('');
  const [showNewBadgeInput, setShowNewBadgeInput] = useState(false);
  const [newJargonInput, setNewJargonInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const headers = {
    'Content-Type': 'application/json',
    'x-init-data': initData,
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch listing detail
  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/listings/${listingId}`, { headers });
      const data = await res.json();
      if (data.success && data.listing) {
        const l = data.listing;
        setOriginalData(l);
        setName(l.name || '');
        setPhone(l.phone || '');
        setCategoryName(l.category?.name || '');
        setLandmarkName(l.primaryLandmark?.name || '');
        setLandmarkId(l.primaryLandmark?.id || '');
        setWorkFrom(l.workFrom || '08:00');
        setWorkTo(l.workTo || '20:00');
        setBadges(l.badges || []);
        setMapUrl(l.mapUrl || '');
        setJargonSynonyms(l.jargonSynonyms || []);
        setSpecificServices(l.specificServices || '');
        setApproxPrice(l.approxPrice || '');
        setDescription(l.description || '');
        setPhotoUrls(l.photoUrls || []);
        setVerification(l.verification || 'COMMUNITY_UNVERIFIED');
        setStatus(l.status || 'ACTIVE');
        setPriorityRank(l.priorityRank ?? null);

        setReviews(l.reviews || []);
        setCorrections(l.corrections || []);
        setHistory(l.history || []);
        setBotPreviewText(data.botPreviewText || '');
        setAddedByUser(l.addedByUser || null);
      }
    } catch (err) {
      console.error('Error loading listing detail:', err);
    } finally {
      setLoading(false);
    }
  }, [listingId, initData]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // Check if form has unsaved changes (Controls visibility of "Saqlash" button)
  const hasChanges = Boolean(
    originalData &&
      (name !== originalData.name ||
        phone !== originalData.phone ||
        categoryName !== (originalData.category?.name || '') ||
        landmarkName !== (originalData.primaryLandmark?.name || '') ||
        workFrom !== (originalData.workFrom || '08:00') ||
        workTo !== (originalData.workTo || '20:00') ||
        verification !== originalData.verification ||
        status !== originalData.status ||
        specificServices !== (originalData.specificServices || '') ||
        approxPrice !== (originalData.approxPrice || '') ||
        description !== (originalData.description || '') ||
        JSON.stringify(badges) !== JSON.stringify(originalData.badges || []) ||
        JSON.stringify(jargonSynonyms) !== JSON.stringify(originalData.jargonSynonyms || []) ||
        JSON.stringify(photoUrls) !== JSON.stringify(originalData.photoUrls || []) ||
        mapUrl !== (originalData.mapUrl || ''))
  );

  // Save changes — muvaffaqiyatli saqlangach DARHOL serverdan qayta
  // yuklaymiz (loadDetail), shunda ekrandagi HAR BIR maydon serverda
  // haqiqatan ham nima saqlanganini aniq aks ettiradi (real vaqtda,
  // taxmin qilingan lokal holat emas).
  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/listings/${listingId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          name,
          phone,
          categoryName,
          landmarkId,
          landmarkName,
          workFrom,
          workTo,
          badges,
          jargonSynonyms,
          verification,
          status,
          specificServices,
          approxPrice,
          description,
          photoUrls,
          mapUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("✅ O'zgarishlar saqlandi");
        await loadDetail();
      } else {
        showToast('❌ Xatolik yuz berdi');
      }
    } catch {
      showToast('❌ Aloqa xatoligi');
    } finally {
      setSaving(false);
    }
  };

  // Toggle Pause status
  const handleToggleStatus = async () => {
    const nextStatus = status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setStatus(nextStatus);
    setShowMenu(false);
    await fetch(`/api/admin/listings/${listingId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status: nextStatus }),
    });
    showToast(nextStatus === 'PAUSED' ? "⏸️ Yozuv pauzaga qo'yildi" : '🟢 Yozuv faollashtirildi');
  };

  // Toggle Verification status
  const handleToggleVerification = async () => {
    const nextVerif = verification === 'VERIFIED' ? 'COMMUNITY_UNVERIFIED' : 'VERIFIED';
    setVerification(nextVerif);
    await fetch(`/api/admin/listings/${listingId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ verification: nextVerif }),
    });
    showToast(nextVerif === 'VERIFIED' ? '✅ Tasdiqlandi!' : "⚠️ Xalq aytgan holatiga o'tkazildi");
  };

  // Delete listing
  const handleDelete = async () => {
    setShowMenu(false);
    if (!window.confirm(`"${name}" yozuvini bazadan butunlay o'chirmoqchimisiz?`)) return;
    const res = await fetch(`/api/admin/listings/${listingId}`, { method: 'DELETE', headers });
    const data = await res.json();
    if (data.success) {
      onBack();
    }
  };

  // Copy listing formatted details
  const handleCopyDetails = () => {
    setShowMenu(false);
    const copyText = `${name}\n📞 ${phone}\n📍 ${landmarkName}\n🏷 ${badges.join(', ')}`;
    navigator.clipboard.writeText(copyText);
    showToast("📋 Ma'lumot nusxalandi!");
  };

  const handleAddBadge = () => {
    if (newBadgeInput.trim() && !badges.includes(newBadgeInput.trim())) {
      setBadges([...badges, newBadgeInput.trim()]);
      setNewBadgeInput('');
      setShowNewBadgeInput(false);
    }
  };

  const handleRemoveBadge = (bToRemove: string) => {
    setBadges(badges.filter(b => b !== bToRemove));
  };

  const handleAddJargon = () => {
    const clean = newJargonInput.trim().toLowerCase();
    if (clean && !jargonSynonyms.includes(clean)) {
      setJargonSynonyms([...jargonSynonyms, clean]);
      setNewJargonInput('');
    }
  };

  const handleRemoveJargon = (wToRemove: string) => {
    setJargonSynonyms(jargonSynonyms.filter(w => w !== wToRemove));
  };

  // Rasm qo'shish — yuklash darhol serverga saqlanadi (AddListingScreen'dagi
  // bilan bir xil endpoint), lekin yozuvning o'ziga BIRIKTIRILISHI
  // "O'zgarishlarni saqlash" tugmasi bosilgandagina yakunlanadi — shu bilan
  // boshqa maydonlar kabi bir xil, bashorat qilinadigan tartibda ishlaydi.
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

  const handleRemovePhoto = (urlToRemove: string) => {
    setPhotoUrls(photoUrls.filter((u) => u !== urlToRemove));
  };

  if (loading) {
    return (
      <div
        className="min-h-screen bg-background dark:bg-[#121417] flex items-center justify-center p-6"
        style={{ fontFamily: IOS_FONT }}
      >
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-[72px] h-[72px] rounded-full bg-[#8E8E93]/20" />
          <div className="h-3.5 w-32 bg-[#8E8E93]/20 rounded-full" />
        </div>
      </div>
    );
  }

  const isZapravka = originalData?.type === 'ZAPRAVKA';

  return (
    <div className="animate-fade-in -mx-4 -mt-2 pb-24 relative" style={{ fontFamily: IOS_FONT }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#1C1C1E] text-white text-[13px] font-medium px-4 py-2.5 rounded-full shadow-2xl animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* NAV BAR — "‹ Orqaga" + "⋯" menyu + "Saqlash" */}
      <div className="px-4 pt-1 pb-2 flex items-center justify-between relative">
        <button
          onClick={onBack}
          className="flex items-center gap-0.5 text-[#007AFF] dark:text-[#0A84FF] text-[15px] font-normal -ml-1.5 active:opacity-40"
        >
          <span className="material-symbols-outlined text-[22px]">chevron_left</span>
          Baza
        </button>

        <div className="flex items-center gap-3.5">
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="text-[#007AFF] dark:text-[#0A84FF] active:opacity-40 p-0.5"
          >
            <span className="material-symbols-outlined text-[22px]">more_horiz</span>
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="text-[15px] font-semibold text-[#007AFF] dark:text-[#0A84FF] active:opacity-40 disabled:opacity-30"
          >
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>

        {/* MENU dropdown — iOS action-sheet uslubida */}
        {showMenu && (
          <div className="absolute right-4 top-11 bg-white dark:bg-[#1C1C1E] rounded-[14px] shadow-2xl z-40 w-60 overflow-hidden animate-fadeIn">
            <button
              onClick={() => {
                setShowMenu(false);
                setShowBotModal(true);
              }}
              className="w-full text-left px-4 py-3 text-[15px] font-normal text-[#007AFF] dark:text-[#0A84FF] active:bg-[#F2F2F7] dark:active:bg-[#2C2C2E] flex items-center justify-between"
            >
              Bot javobini ko'rish
              <span className="material-symbols-outlined text-[18px]">smart_toy</span>
            </button>
            <button
              onClick={handleToggleStatus}
              className="w-full text-left px-4 py-3 text-[15px] font-normal text-on-surface dark:text-white active:bg-[#F2F2F7] dark:active:bg-[#2C2C2E] flex items-center justify-between"
              style={{ borderTop: HAIRLINE }}
            >
              {status === 'ACTIVE' ? "Pauzaga qo'yish" : 'Faollashtirish'}
              <span className="material-symbols-outlined text-[18px] text-[#8E8E93]">
                {status === 'ACTIVE' ? 'pause_circle' : 'play_circle'}
              </span>
            </button>
            <button
              onClick={handleCopyDetails}
              className="w-full text-left px-4 py-3 text-[15px] font-normal text-on-surface dark:text-white active:bg-[#F2F2F7] dark:active:bg-[#2C2C2E] flex items-center justify-between"
              style={{ borderTop: HAIRLINE }}
            >
              Nusxa olish
              <span className="material-symbols-outlined text-[18px] text-[#8E8E93]">content_copy</span>
            </button>
            <button
              onClick={handleDelete}
              className="w-full text-left px-4 py-3 text-[15px] font-normal text-[#FF3B30] active:bg-[#F2F2F7] dark:active:bg-[#2C2C2E] flex items-center justify-between"
              style={{ borderTop: HAIRLINE }}
            >
              O'chirish
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Contacts-app uslubidagi avatar sarlavha */}
      <div className="flex flex-col items-center gap-1.5 pt-1 pb-5">
        <span
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-white text-[28px] font-semibold shadow-sm"
          style={{ backgroundColor: avatarColorForName(name || '?') }}
        >
          {name.trim()[0]?.toUpperCase() || '?'}
        </span>
        <h1 className="text-[20px] font-semibold text-on-surface dark:text-white text-center px-6 mt-0.5">
          {name || 'Yozuv'}
        </h1>
        <p className="text-[13px] text-[#8E8E93] text-center px-6">
          {categoryName || 'Kasb'} · {landmarkName || 'Olmaliq'}
          {addedByUser?.firstName ? ` · ${addedByUser.firstName} qo'shgan` : ''}
        </p>
        {priorityRank && (
          <div className="flex items-center gap-1 text-[#34C759] text-[12px] font-semibold mt-0.5">
            <span className="material-symbols-outlined text-[14px]">military_tech</span>
            Kategoriyada {priorityRank}-o'rin
          </div>
        )}
      </div>

      {/* TEZKOR HOLAT TUGMALARI */}
      <div className="px-4 flex items-center gap-2 mb-5">
        <button
          onClick={handleToggleVerification}
          className="flex-1 py-2 rounded-[10px] text-[13px] font-semibold flex items-center justify-center gap-1.5 active:opacity-70 transition-opacity"
          style={{
            backgroundColor: verification === 'VERIFIED' ? `${IOS_GREEN}1F` : `${IOS_ORANGE}1F`,
            color: verification === 'VERIFIED' ? IOS_GREEN : IOS_ORANGE,
          }}
        >
          {verification === 'VERIFIED' ? '✅ Tasdiqlangan' : '⚠️ Xalq aytgan'}
        </button>
        <button
          onClick={handleToggleStatus}
          className="py-2 px-4 rounded-[10px] text-[13px] font-semibold flex items-center justify-center gap-1.5 active:opacity-70 transition-opacity"
          style={{
            backgroundColor: status === 'ACTIVE' ? `${IOS_BLUE}1F` : `${IOS_GRAY}26`,
            color: status === 'ACTIVE' ? IOS_BLUE : IOS_GRAY,
          }}
        >
          {status === 'ACTIVE' ? '🟢 Faol' : '⏸️ Pauzada'}
        </button>
      </div>

      {/* iOS SEGMENTED CONTROL — Ma'lumot / Tarix */}
      <div className="px-4 mb-5">
        <div className="bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] rounded-[9px] p-[2px] flex">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-1.5 rounded-[7px] text-[13px] font-medium transition-all ${
              activeTab === 'info'
                ? 'bg-white dark:bg-[#3A3A3C] shadow-sm text-on-surface dark:text-white font-semibold'
                : 'text-[#8E8E93]'
            }`}
          >
            Ma'lumot
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1.5 rounded-[7px] text-[13px] font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-white dark:bg-[#3A3A3C] shadow-sm text-on-surface dark:text-white font-semibold'
                : 'text-[#8E8E93]'
            }`}
          >
            Tarix ({history.length + reviews.length})
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* TAB 1: MA'LUMOT */}
      {/* ────────────────────────────────────────────────────────────── */}
      {activeTab === 'info' && (
        <div className="px-4 space-y-6 animate-fadeIn">
          {/* GURUH: ASOSIY MA'LUMOT */}
          <div>
            <SectionLabel>Asosiy ma'lumot</SectionLabel>
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] shadow-sm overflow-hidden mt-1.5">
              <FieldRow label="Ism / Nom">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 bg-transparent text-[15px] text-on-surface dark:text-white focus:outline-none text-right"
                />
              </FieldRow>
              <FieldRow label="Telefon" hairlineTop>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="ixtiyoriy"
                  className="flex-1 bg-transparent text-[15px] font-mono text-on-surface dark:text-white placeholder:text-[#8E8E93] placeholder:font-sans focus:outline-none text-right"
                />
              </FieldRow>
              <FieldRow label="Kasb / soha" hairlineTop>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="flex-1 bg-transparent text-[15px] text-on-surface dark:text-white focus:outline-none text-right"
                />
              </FieldRow>
              <div className="px-3.5 py-2.5 flex items-center gap-3" style={{ borderTop: HAIRLINE }}>
                <span className="text-[15px] text-on-surface dark:text-white w-[104px] shrink-0">Manzil</span>
                <div className="flex-1 min-w-0">
                  <LandmarkPicker
                    value={landmarkId || null}
                    displayName={landmarkName}
                    onChange={(id, nm) => {
                      setLandmarkId(id);
                      setLandmarkName(nm);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* GURUH: ISH VAQTI VA TAFSILOTLAR */}
          <div>
            <SectionLabel>Ish vaqti va tafsilotlar</SectionLabel>
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] shadow-sm overflow-hidden mt-1.5">
              <FieldRow label="Boshlanishi">
                <input
                  type="text"
                  value={workFrom}
                  onChange={(e) => setWorkFrom(e.target.value)}
                  placeholder="08:00"
                  className="flex-1 bg-transparent text-[15px] font-mono text-on-surface dark:text-white placeholder:text-[#8E8E93] placeholder:font-sans focus:outline-none text-right"
                />
              </FieldRow>
              <FieldRow label="Tugashi" hairlineTop>
                <input
                  type="text"
                  value={workTo}
                  onChange={(e) => setWorkTo(e.target.value)}
                  placeholder="20:00"
                  className="flex-1 bg-transparent text-[15px] font-mono text-on-surface dark:text-white placeholder:text-[#8E8E93] placeholder:font-sans focus:outline-none text-right"
                />
              </FieldRow>

              {isZapravka && (
                <>
                  <div className="px-3.5 pt-3 pb-1.5" style={{ borderTop: HAIRLINE }}>
                    <span className="text-[15px] text-on-surface dark:text-white">Xarita havolasi (Yandex)</span>
                  </div>
                  <div className="px-3.5 pb-3">
                    <input
                      type="text"
                      value={mapUrl}
                      onChange={(e) => setMapUrl(e.target.value)}
                      placeholder="https://yandex.uz/maps/..."
                      className="w-full bg-[#767680]/[0.08] dark:bg-[#767680]/[0.16] rounded-[8px] px-3 py-2 text-[13px] text-on-surface dark:text-white placeholder:text-[#8E8E93] focus:outline-none"
                    />
                    <p className="text-[11px] text-[#8E8E93] mt-1.5">
                      {mapUrl.trim()
                        ? 'Bot javobida yashil "📍 Lokatsiya" tugmasi shu havolaga olib boradi.'
                        : 'Havola bo\'sh bo\'lsa, bot javobida "Lokatsiya" tugmasi umuman chiqmaydi.'}
                    </p>
                  </div>
                </>
              )}

              <div className="px-3.5 pt-3 pb-1.5" style={{ borderTop: HAIRLINE }}>
                <span className="text-[15px] text-on-surface dark:text-white">Aniq xizmatlar</span>
              </div>
              <div className="px-3.5 pb-3">
                <input
                  type="text"
                  value={specificServices}
                  onChange={(e) => setSpecificServices(e.target.value)}
                  placeholder="masalan: gaz kolonka ta'mirlash, plita o'rnatish"
                  className="w-full bg-[#767680]/[0.08] dark:bg-[#767680]/[0.16] rounded-[8px] px-3 py-2 text-[13px] text-on-surface dark:text-white placeholder:text-[#8E8E93] focus:outline-none"
                />
              </div>

              <FieldRow label="Taxminiy narx" hairlineTop>
                <input
                  type="text"
                  value={approxPrice}
                  onChange={(e) => setApproxPrice(e.target.value)}
                  placeholder="masalan: 50,000 so'mdan"
                  className="flex-1 bg-transparent text-[15px] text-on-surface dark:text-white placeholder:text-[#8E8E93] focus:outline-none text-right"
                />
              </FieldRow>

              <div className="px-3.5 pt-3 pb-3" style={{ borderTop: HAIRLINE }}>
                <span className="text-[15px] text-on-surface dark:text-white block mb-1.5">Izoh</span>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Qo'shimcha izoh..."
                  className="w-full bg-[#767680]/[0.08] dark:bg-[#767680]/[0.16] rounded-[8px] px-3 py-2 text-[13px] text-on-surface dark:text-white placeholder:text-[#8E8E93] focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* GURUH: BELGILAR */}
          <div>
            <SectionLabel>Belgilar</SectionLabel>
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] shadow-sm overflow-hidden mt-1.5">
              <div className="px-3.5 py-3 flex flex-wrap gap-1.5">
                {badges.length === 0 && !showNewBadgeInput && (
                  <span className="text-[13px] text-[#8E8E93]">Hali belgi qo'shilmagan</span>
                )}
                {badges.map((b) => (
                  <span
                    key={b}
                    className="bg-[#007AFF]/10 dark:bg-[#0A84FF]/15 text-[#007AFF] dark:text-[#0A84FF] pl-3 pr-1.5 py-1 rounded-full text-[13px] font-medium flex items-center gap-1"
                  >
                    {b}
                    <button
                      onClick={() => handleRemoveBadge(b)}
                      className="w-4 h-4 rounded-full bg-[#007AFF]/20 dark:bg-[#0A84FF]/25 flex items-center justify-center hover:bg-[#FF3B30] hover:text-white transition-colors"
                      aria-label={`${b}ni o'chirish`}
                    >
                      <span className="material-symbols-outlined text-[11px] leading-none">close</span>
                    </button>
                  </span>
                ))}

                {showNewBadgeInput ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newBadgeInput}
                      onChange={(e) => setNewBadgeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddBadge();
                      }}
                      placeholder="belgi..."
                      autoFocus
                      className="bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] rounded-full px-3 py-1 text-[13px] outline-none text-on-surface dark:text-white"
                    />
                    <button
                      onClick={handleAddBadge}
                      className="text-[#007AFF] dark:text-[#0A84FF] text-[13px] font-semibold px-1"
                    >
                      Qo'shish
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewBadgeInput(true)}
                    className="flex items-center gap-1 pl-2 pr-2.5 py-1 rounded-full border border-dashed border-[#007AFF]/50 dark:border-[#0A84FF]/50 text-[#007AFF] dark:text-[#0A84FF] text-[13px] font-medium active:bg-[#007AFF]/5"
                  >
                    <span className="material-symbols-outlined text-[13px]">add</span>
                    Qo'shish
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* GURUH: MAHALLIY ATAMALAR (JARGON) */}
          <div>
            <div className="flex items-center justify-between px-1 mb-1.5">
              <span className="text-[13px] font-normal text-[#8E8E93] uppercase tracking-wide">
                Mahalliy atamalar
              </span>
            </div>
            <p className="text-[12px] text-[#8E8E93] px-1 mb-1.5">
              Guruhda shu so'zlar bilan yozilsa, bot shu yozuvni topib javob beradi.
            </p>
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] shadow-sm overflow-hidden">
              <div className="px-3.5 py-3 flex flex-wrap gap-1.5">
                {jargonSynonyms.length === 0 && (
                  <span className="text-[13px] text-[#8E8E93]">Hali atama qo'shilmagan</span>
                )}
                {jargonSynonyms.map((w) => (
                  <span
                    key={w}
                    className="bg-[#007AFF]/10 dark:bg-[#0A84FF]/15 text-[#007AFF] dark:text-[#0A84FF] pl-3 pr-1.5 py-1 rounded-full text-[13px] font-medium flex items-center gap-1"
                  >
                    {w}
                    <button
                      onClick={() => handleRemoveJargon(w)}
                      className="w-4 h-4 rounded-full bg-[#007AFF]/20 dark:bg-[#0A84FF]/25 flex items-center justify-center hover:bg-[#FF3B30] hover:text-white transition-colors"
                      aria-label={`${w}ni o'chirish`}
                    >
                      <span className="material-symbols-outlined text-[11px] leading-none">close</span>
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2.5" style={{ borderTop: HAIRLINE }}>
                <span className="material-symbols-outlined text-[18px] text-[#8E8E93]">add_circle</span>
                <input
                  type="text"
                  value={newJargonInput}
                  onChange={(e) => setNewJargonInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddJargon();
                    }
                  }}
                  placeholder="masalan: trubkachi"
                  className="flex-1 bg-transparent text-[15px] text-on-surface dark:text-white placeholder:text-[#8E8E93] focus:outline-none"
                />
                <button
                  onClick={handleAddJargon}
                  disabled={!newJargonInput.trim()}
                  className="text-[#007AFF] dark:text-[#0A84FF] text-[13px] font-semibold disabled:opacity-30"
                >
                  Qo'shish
                </button>
              </div>
            </div>
          </div>

          {/* GURUH: RASMLAR */}
          <div>
            <div className="flex items-center justify-between px-1 mb-1.5">
              <span className="text-[13px] font-normal text-[#8E8E93] uppercase tracking-wide">
                Rasmlar ({photoUrls.length}/{MAX_PHOTOS})
              </span>
            </div>
            <p className="text-[12px] text-[#8E8E93] px-1 mb-1.5">
              Bir nechta rasm bo'lsa, bot javobida suriladigan albom sifatida ko'rsatiladi.
            </p>
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] shadow-sm overflow-hidden p-3.5 space-y-2.5">
              {photoUrls.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-0.5">
                  {photoUrls.map((url) => (
                    <div key={url} className="relative shrink-0 w-16 h-16 rounded-[10px] overflow-hidden">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => handleRemovePhoto(url)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white text-[10px] leading-none flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {photoUrls.length < MAX_PHOTOS && (
                <label className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-[10px] border border-dashed border-[#007AFF]/40 dark:border-[#0A84FF]/40 text-[#007AFF] dark:text-[#0A84FF] text-[13px] font-semibold cursor-pointer">
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
              {photoUploadError && <p className="text-[#FF3B30] text-[12px] font-medium">{photoUploadError}</p>}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* TAB 2: TARIX */}
      {/* ────────────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="px-4 space-y-6 animate-fadeIn">
          {/* BAHOLAR VA SHARHLAR */}
          <div>
            <SectionLabel>Baholar va sharhlar ({reviews.length})</SectionLabel>
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] shadow-sm overflow-hidden mt-1.5">
              {reviews.length === 0 ? (
                <p className="px-3.5 py-3 text-[13px] text-[#8E8E93]">Hali baholar berilmagan</p>
              ) : (
                reviews.map((r, i) => (
                  <div
                    key={r.id}
                    className="px-3.5 py-3 flex items-start gap-3"
                    style={i > 0 ? { borderTop: HAIRLINE } : undefined}
                  >
                    <span className="text-[17px] leading-none mt-0.5">{r.isPositive ? '👍' : '👎'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-on-surface dark:text-white">
                        {r.isPositive ? 'Ijobiy tavsiya' : 'Salbiy sharh'}
                      </p>
                      {r.comment && <p className="text-[13px] text-[#8E8E93] mt-0.5">{r.comment}</p>}
                      <span className="text-[11px] text-[#8E8E93] block mt-1">
                        {new Date(r.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* TUZATISHLAR */}
          <div>
            <SectionLabel>Tuzatishlar ({corrections.length})</SectionLabel>
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] shadow-sm overflow-hidden mt-1.5">
              {corrections.length === 0 ? (
                <p className="px-3.5 py-3 text-[13px] text-[#8E8E93]">Tuzatish takliflari yo'q</p>
              ) : (
                corrections.map((c, i) => (
                  <div key={c.id} className="px-3.5 py-3" style={i > 0 ? { borderTop: HAIRLINE } : undefined}>
                    <p className="text-[13px] font-medium text-[#FF9500]">{c.message}</p>
                    <span className="text-[11px] text-[#8E8E93] block mt-1">
                      {new Date(c.createdAt).toLocaleString()} · {c.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* O'ZGARISHLAR TARIXI */}
          <div>
            <SectionLabel>O'zgarishlar tarixi ({history.length})</SectionLabel>
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] shadow-sm overflow-hidden mt-1.5">
              {history.length === 0 ? (
                <p className="px-3.5 py-3 text-[13px] text-[#8E8E93]">O'zgarishlar tarixi hali saqlanmagan</p>
              ) : (
                history.map((h, i) => (
                  <div
                    key={h.id}
                    className="px-3.5 py-3 flex items-center gap-2.5"
                    style={i > 0 ? { borderTop: HAIRLINE } : undefined}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: IOS_BLUE }} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-on-surface dark:text-white">
                        Tahrir qilindi ({h.changedBy || 'Admin'})
                      </p>
                      <p className="text-[11px] text-[#8E8E93]">{new Date(h.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* MODAL: BOT JAVOBINI KO'RISH */}
      {/* ────────────────────────────────────────────────────────────── */}
      {showBotModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fadeIn"
          style={{ fontFamily: IOS_FONT }}
        >
          <div className="bg-white dark:bg-[#1C1C1E] rounded-t-[20px] sm:rounded-[20px] p-4 w-full sm:max-w-sm space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between px-1">
              <span className="text-[15px] font-semibold text-on-surface dark:text-white">Bot javobi ko'rinishi</span>
              <button
                onClick={() => setShowBotModal(false)}
                className="w-7 h-7 rounded-full bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] flex items-center justify-center text-[#8E8E93]"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div className="bg-[#182533] rounded-[14px] p-4 text-[13px] font-sans text-slate-100 whitespace-pre-wrap leading-relaxed">
              {botPreviewText}
            </div>

            <p className="text-[12px] text-[#8E8E93] text-center px-2">
              Foydalanuvchi botga "{categoryName}" deb so'raganda guruhda aynan shu xabar ko'rinadi.
            </p>

            <button
              onClick={() => setShowBotModal(false)}
              className="w-full bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] text-on-surface dark:text-white font-semibold py-2.5 rounded-[10px] text-[15px]"
            >
              Yopish
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
