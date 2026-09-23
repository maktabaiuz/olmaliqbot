import React, { useState, useEffect, useCallback } from 'react';
import { LandmarkPicker } from '../components/LandmarkPicker';
import { avatarColorForName } from '../utils/avatarColor';
import { useFeedback } from '../context/FeedbackContext';
import { DEFAULT_BADGE_OPTIONS, ZAPRAVKA_BADGE_OPTIONS } from '../constants/badges';
import { RENTAL_CATEGORY_NAMES, RENT_TERM_TYPE_OPTIONS, RENT_CURRENCY_OPTIONS } from '../constants/rentalCategories';

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

const HAIRLINE = '0.5px solid rgb(var(--ios-separator) / 0.29)';

// Grouped-inset-list bo'lim sarlavhasi — UISettings.app'dagi kabi kichik,
// katta harfli, kulrang label.
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide px-1">{children}</span>
);

// Bitta qator: chapda label, o'ngda tahrirlanadigan qiymat (iOS Settings
// "Nomi"/"Telefon" qatorlari kabi).
const FieldRow: React.FC<{
  label: string;
  children: React.ReactNode;
  hairlineTop?: boolean;
}> = ({ label, children, hairlineTop }) => (
  <div className="flex items-center px-3.5 py-2.5 gap-3" style={hairlineTop ? { borderTop: HAIRLINE } : undefined}>
    <span className="text-[15px] text-ios-label w-[104px] shrink-0">{label}</span>
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
  const [listingType, setListingType] = useState('');
  const [landmarkName, setLandmarkName] = useState('');
  const [landmarkId, setLandmarkId] = useState('');
  const [workFrom, setWorkFrom] = useState('08:00');
  const [workTo, setWorkTo] = useState('20:00');
  const [badges, setBadges] = useState<string[]>([]);
  const [mapUrl, setMapUrl] = useState('');
  const [jargonSynonyms, setJargonSynonyms] = useState<string[]>([]);
  const [specificServices, setSpecificServices] = useState('');
  const [approxPrice, setApproxPrice] = useState('');
  // Ko'chmas mulk arenda kategoriyalari uchun strukturaviy maydonlar (2026-09).
  const [roomCount, setRoomCount] = useState('');
  const [rentPrice, setRentPrice] = useState('');
  const [rentPriceCurrency, setRentPriceCurrency] = useState<'UZS' | 'USD'>('USD');
  const [rentTermType, setRentTermType] = useState<'KUNLIK' | 'OYLIK' | 'YILLIK'>('OYLIK');
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
  const [newJargonInput, setNewJargonInput] = useState('');
  // Shu kategoriyadagi boshqa yozuvlarning jargon so'zlari — taklif
  // sifatida (2026-09). Faqat bazadagi haqiqiy so'zlar, generativ AI emas.
  const [jargonSuggestions, setJargonSuggestions] = useState<{ phrase: string; count: number }[]>([]);
  const { showToast, confirm } = useFeedback();

  const headers = {
    'Content-Type': 'application/json',
    'x-init-data': initData,
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
        setListingType(l.type || '');
        setLandmarkName(l.primaryLandmark?.name || '');
        setLandmarkId(l.primaryLandmark?.id || '');
        setWorkFrom(l.workFrom || '08:00');
        setWorkTo(l.workTo || '20:00');
        setBadges(l.badges || []);
        setMapUrl(l.mapUrl || '');
        setJargonSynonyms(l.jargonSynonyms || []);
        setSpecificServices(l.specificServices || '');
        setApproxPrice(l.approxPrice || '');
        setRoomCount(l.roomCount != null ? String(l.roomCount) : '');
        setRentPrice(l.rentPrice != null ? String(l.rentPrice) : '');
        setRentPriceCurrency(l.rentPriceCurrency || 'USD');
        setRentTermType(l.rentTermType || 'OYLIK');
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
        roomCount !== (originalData.roomCount != null ? String(originalData.roomCount) : '') ||
        rentPrice !== (originalData.rentPrice != null ? String(originalData.rentPrice) : '') ||
        rentPriceCurrency !== (originalData.rentPriceCurrency || 'USD') ||
        rentTermType !== (originalData.rentTermType || 'OYLIK') ||
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
          ...(RENTAL_CATEGORY_NAMES.has(categoryName) && {
            roomCount: roomCount || null,
            rentPrice: rentPrice || null,
            rentPriceCurrency,
            rentTermType,
          }),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("O'zgarishlar saqlandi", 'success');
        await loadDetail();
      } else {
        showToast('Xatolik yuz berdi', 'error');
      }
    } catch {
      showToast('Aloqa xatoligi', 'error');
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
    showToast(nextStatus === 'PAUSED' ? "Yozuv pauzaga qo'yildi" : 'Yozuv faollashtirildi');
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
    showToast(nextVerif === 'VERIFIED' ? 'Tasdiqlandi!' : "Xalq aytgan holatiga o'tkazildi", nextVerif === 'VERIFIED' ? 'success' : undefined);
  };

  // Delete listing
  const handleDelete = async () => {
    setShowMenu(false);
    const ok = await confirm({
      title: `"${name}" yozuvini bazadan butunlay o'chirmoqchimisiz?`,
      message: 'Bu amalni ortga qaytarib bo\'lmaydi.',
      confirmLabel: "O'chirish",
      destructive: true,
    });
    if (!ok) return;
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
    showToast("Ma'lumot nusxalandi!", 'success');
  };

  // MUHIM (2026-09, real xato bilan tasdiqlangan): avval bu yerda erkin
  // matn kiritish orqali belgi qo'shilardi — admin "Propan" o'rniga
  // "propan" yoki boshqa yozilishda kiritsa, qidiruv tizimi (aniq
  // harfma-harf solishtirish) buni HECH QACHON tanimasdi, garchi belgi
  // "qo'shilgan" bo'lib ko'rinsa ham. Endi AddListingScreen bilan bir xil,
  // qat'iy ro'yxatdan (constants/badges.ts) tanlanadi — yozilish xatosi
  // butunlay istisno qilinadi.
  const badgeOptions = listingType === 'ZAPRAVKA' ? ZAPRAVKA_BADGE_OPTIONS : DEFAULT_BADGE_OPTIONS;
  const customBadges = badges.filter((b) => !badgeOptions.includes(b));

  const toggleBadge = (badge: string) => {
    setBadges(badges.includes(badge) ? badges.filter((b) => b !== badge) : [...badges, badge]);
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

  const handleAddJargonSuggestion = (phrase: string) => {
    const clean = phrase.trim().toLowerCase();
    if (clean && !jargonSynonyms.includes(clean)) {
      setJargonSynonyms([...jargonSynonyms, clean]);
    }
  };

  // Kategoriya o'zgarganda — shu turdagi boshqa yozuvlarning jargon
  // so'zlarini bazadan olib, taklif sifatida ko'rsatadi.
  useEffect(() => {
    let active = true;
    const clean = categoryName.trim();
    if (!clean) {
      setJargonSuggestions([]);
      return;
    }
    fetch(`/api/admin/categories/jargon-suggestions?name=${encodeURIComponent(clean)}`)
      .then((r) => r.json())
      .then((data) => {
        if (active) setJargonSuggestions(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setJargonSuggestions([]);
      });
    return () => {
      active = false;
    };
  }, [categoryName]);

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
      <div className="min-h-screen bg-ios-bg flex items-center justify-center p-6">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-[72px] h-[72px] rounded-full bg-ios-fill/20" />
          <div className="h-3.5 w-32 bg-ios-fill/20 rounded-full" />
        </div>
      </div>
    );
  }

  const isZapravka = originalData?.type === 'ZAPRAVKA';

  return (
    <div className="animate-fade-in -mx-4 -mt-2 pb-24 relative">
      {/* NAV BAR — "‹ Orqaga" + "⋯" menyu + "Saqlash" */}
      <div className="px-4 pt-1 pb-2 flex items-center justify-between relative">
        <button
          onClick={onBack}
          className="flex items-center gap-0.5 text-ios-blue text-[15px] font-normal -ml-1.5 active:opacity-40"
        >
          <span className="material-symbols-outlined text-[22px]">chevron_left</span>
          Baza
        </button>

        <div className="flex items-center gap-3.5">
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="text-ios-blue active:opacity-40 p-0.5"
          >
            <span className="material-symbols-outlined text-[22px]">more_horiz</span>
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="text-[15px] font-semibold text-ios-blue active:opacity-40 disabled:opacity-30"
          >
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>

        {/* MENU dropdown — iOS action-sheet uslubida */}
        {showMenu && (
          <div className="absolute right-4 top-11 bg-ios-card rounded-ios-lg shadow-2xl z-40 w-60 overflow-hidden animate-fadeIn">
            <button
              onClick={() => {
                setShowMenu(false);
                setShowBotModal(true);
              }}
              className="w-full text-left px-4 py-3 text-[15px] font-normal text-ios-blue active:bg-ios-fill/10 flex items-center justify-between"
            >
              Bot javobini ko'rish
              <span className="material-symbols-outlined text-[18px]">smart_toy</span>
            </button>
            <button
              onClick={handleToggleStatus}
              className="w-full text-left px-4 py-3 text-[15px] font-normal text-ios-label active:bg-ios-fill/10 flex items-center justify-between"
              style={{ borderTop: HAIRLINE }}
            >
              {status === 'ACTIVE' ? "Pauzaga qo'yish" : 'Faollashtirish'}
              <span className="material-symbols-outlined text-[18px] text-ios-label-secondary/70">
                {status === 'ACTIVE' ? 'pause_circle' : 'play_circle'}
              </span>
            </button>
            <button
              onClick={handleCopyDetails}
              className="w-full text-left px-4 py-3 text-[15px] font-normal text-ios-label active:bg-ios-fill/10 flex items-center justify-between"
              style={{ borderTop: HAIRLINE }}
            >
              Nusxa olish
              <span className="material-symbols-outlined text-[18px] text-ios-label-secondary/70">content_copy</span>
            </button>
            <button
              onClick={handleDelete}
              className="w-full text-left px-4 py-3 text-[15px] font-normal text-ios-red active:bg-ios-fill/10 flex items-center justify-between"
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
        <h1 className="text-[20px] font-semibold text-ios-label text-center px-6 mt-0.5">
          {name || 'Yozuv'}
        </h1>
        <p className="text-[13px] text-ios-label-secondary/70 text-center px-6">
          {categoryName || 'Kasb'} · {landmarkName || 'Olmaliq'}
          {addedByUser?.firstName ? ` · ${addedByUser.firstName} qo'shgan` : ''}
        </p>
        {priorityRank && (
          <div className="flex items-center gap-1 text-ios-green text-[12px] font-semibold mt-0.5">
            <span className="material-symbols-outlined text-[14px]">military_tech</span>
            Kategoriyada {priorityRank}-o'rin
          </div>
        )}
      </div>

      {/* TEZKOR HOLAT TUGMALARI */}
      <div className="px-4 flex items-center gap-2 mb-5">
        <button
          onClick={handleToggleVerification}
          className={`flex-1 py-2 rounded-ios text-[13px] font-semibold flex items-center justify-center gap-1.5 active:opacity-70 transition-opacity ${
            verification === 'VERIFIED' ? 'bg-ios-green/[0.12] text-ios-green' : 'bg-ios-orange/[0.12] text-ios-orange'
          }`}
        >
          {verification === 'VERIFIED' ? '✅ Tasdiqlangan' : '⚠️ Xalq aytgan'}
        </button>
        <button
          onClick={handleToggleStatus}
          className={`py-2 px-4 rounded-ios text-[13px] font-semibold flex items-center justify-center gap-1.5 active:opacity-70 transition-opacity ${
            status === 'ACTIVE' ? 'bg-ios-blue/[0.12] text-ios-blue' : 'bg-ios-fill/[0.15] text-ios-label-secondary/70'
          }`}
        >
          {status === 'ACTIVE' ? '🟢 Faol' : '⏸️ Pauzada'}
        </button>
      </div>

      {/* iOS SEGMENTED CONTROL — Ma'lumot / Tarix */}
      <div className="px-4 mb-5">
        <div className="bg-ios-fill/[0.12] rounded-ios p-[2px] flex">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-1.5 rounded-[7px] text-[13px] font-medium transition-all ${
              activeTab === 'info'
                ? 'bg-ios-card shadow-sm text-ios-label font-semibold'
                : 'text-ios-label-secondary/70'
            }`}
          >
            Ma'lumot
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1.5 rounded-[7px] text-[13px] font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-ios-card shadow-sm text-ios-label font-semibold'
                : 'text-ios-label-secondary/70'
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
            <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden mt-1.5">
              <FieldRow label="Ism / Nom">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 bg-transparent text-[15px] text-ios-label focus:outline-none text-right"
                />
              </FieldRow>
              <FieldRow label="Telefon" hairlineTop>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="ixtiyoriy"
                  className="flex-1 bg-transparent text-[15px] font-mono text-ios-label placeholder:text-ios-label-secondary/70 placeholder:font-sans focus:outline-none text-right"
                />
              </FieldRow>
              <FieldRow label="Kasb / soha" hairlineTop>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="flex-1 bg-transparent text-[15px] text-ios-label focus:outline-none text-right"
                />
              </FieldRow>
              <div className="px-3.5 py-2.5 flex items-center gap-3" style={{ borderTop: HAIRLINE }}>
                <span className="text-[15px] text-ios-label w-[104px] shrink-0">Manzil</span>
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
            <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden mt-1.5">
              <FieldRow label="Boshlanishi">
                <input
                  type="text"
                  value={workFrom}
                  onChange={(e) => setWorkFrom(e.target.value)}
                  placeholder="08:00"
                  className="flex-1 bg-transparent text-[15px] font-mono text-ios-label placeholder:text-ios-label-secondary/70 placeholder:font-sans focus:outline-none text-right"
                />
              </FieldRow>
              <FieldRow label="Tugashi" hairlineTop>
                <input
                  type="text"
                  value={workTo}
                  onChange={(e) => setWorkTo(e.target.value)}
                  placeholder="20:00"
                  className="flex-1 bg-transparent text-[15px] font-mono text-ios-label placeholder:text-ios-label-secondary/70 placeholder:font-sans focus:outline-none text-right"
                />
              </FieldRow>

              {isZapravka && (
                <>
                  <div className="px-3.5 pt-3 pb-1.5" style={{ borderTop: HAIRLINE }}>
                    <span className="text-[15px] text-ios-label">Xarita havolasi (Yandex)</span>
                  </div>
                  <div className="px-3.5 pb-3">
                    <input
                      type="text"
                      value={mapUrl}
                      onChange={(e) => setMapUrl(e.target.value)}
                      onBlur={(e) => {
                        // Yandex "Ulashish"da ko'pincha joy nomi + manzil +
                        // havola BIRGALIKDA nusxalanadi — bunday holatda
                        // tugma Telegram tomonidan rad etilib, bot UMUMAN
                        // javob bermay qolgan (2026-09 topilgan xato). Shu
                        // sabab maydondan chiqqanda faqat havola qismi
                        // ajratib qoldiriladi.
                        const match = e.target.value.match(/https?:\/\/\S+/);
                        if (match && match[0] !== e.target.value.trim()) setMapUrl(match[0]);
                      }}
                      placeholder="https://yandex.uz/maps/..."
                      className="w-full bg-ios-fill/[0.12] rounded-ios px-3 py-2 text-[13px] text-ios-label placeholder:text-ios-label-secondary/70 focus:outline-none"
                    />
                    <p className="text-[11px] text-ios-label-secondary/70 mt-1.5">
                      {mapUrl.trim()
                        ? 'Bot javobida yashil "📍 Lokatsiya" tugmasi shu havolaga olib boradi.'
                        : 'Havola bo\'sh bo\'lsa, bot javobida "Lokatsiya" tugmasi umuman chiqmaydi.'}
                    </p>
                  </div>
                </>
              )}

              {RENTAL_CATEGORY_NAMES.has(categoryName) && (
                <>
                  <div className="px-3.5 pt-3 pb-1.5" style={{ borderTop: HAIRLINE }}>
                    <span className="text-[15px] text-ios-label">Xonalar soni</span>
                  </div>
                  <div className="px-3.5 pb-3">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={roomCount}
                      onChange={(e) => setRoomCount(e.target.value)}
                      placeholder="masalan: 2"
                      className="w-full bg-ios-fill/[0.12] rounded-ios px-3 py-2 text-[13px] text-ios-label placeholder:text-ios-label-secondary/70 focus:outline-none"
                    />
                  </div>

                  <div className="px-3.5 pt-3 pb-1.5" style={{ borderTop: HAIRLINE }}>
                    <span className="text-[15px] text-ios-label">Narx</span>
                  </div>
                  <div className="px-3.5 pb-3 flex gap-1.5">
                    <input
                      type="number"
                      min="0"
                      value={rentPrice}
                      onChange={(e) => setRentPrice(e.target.value)}
                      placeholder="masalan: 300"
                      className="flex-1 bg-ios-fill/[0.12] rounded-ios px-3 py-2 text-[13px] text-ios-label placeholder:text-ios-label-secondary/70 focus:outline-none"
                    />
                    <div className="flex gap-1">
                      {RENT_CURRENCY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setRentPriceCurrency(opt.value)}
                          className={`px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
                            rentPriceCurrency === opt.value ? 'bg-ios-blue text-white shadow-sm' : 'bg-ios-fill/[0.12] text-ios-label-secondary/70'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="px-3.5 pt-3 pb-1.5" style={{ borderTop: HAIRLINE }}>
                    <span className="text-[15px] text-ios-label">Ijara muddati</span>
                  </div>
                  <div className="px-3.5 pb-3 flex gap-1.5">
                    {RENT_TERM_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRentTermType(opt.value)}
                        className={`flex-1 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
                          rentTermType === opt.value ? 'bg-ios-blue text-white shadow-sm' : 'bg-ios-fill/[0.12] text-ios-label-secondary/70'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div className="px-3.5 pt-3 pb-1.5" style={{ borderTop: HAIRLINE }}>
                <span className="text-[15px] text-ios-label">Aniq xizmatlar</span>
              </div>
              <div className="px-3.5 pb-3">
                <input
                  type="text"
                  value={specificServices}
                  onChange={(e) => setSpecificServices(e.target.value)}
                  placeholder="masalan: gaz kolonka ta'mirlash, plita o'rnatish"
                  className="w-full bg-ios-fill/[0.12] rounded-ios px-3 py-2 text-[13px] text-ios-label placeholder:text-ios-label-secondary/70 focus:outline-none"
                />
              </div>

              <FieldRow label="Taxminiy narx" hairlineTop>
                <input
                  type="text"
                  value={approxPrice}
                  onChange={(e) => setApproxPrice(e.target.value)}
                  placeholder="masalan: 50,000 so'mdan"
                  className="flex-1 bg-transparent text-[15px] text-ios-label placeholder:text-ios-label-secondary/70 focus:outline-none text-right"
                />
              </FieldRow>

              <div className="px-3.5 pt-3 pb-3" style={{ borderTop: HAIRLINE }}>
                <span className="text-[15px] text-ios-label block mb-1.5">Izoh</span>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Qo'shimcha izoh..."
                  className="w-full bg-ios-fill/[0.12] rounded-ios px-3 py-2 text-[13px] text-ios-label placeholder:text-ios-label-secondary/70 focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* GURUH: BELGILAR */}
          <div>
            <SectionLabel>Belgilar</SectionLabel>
            <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden mt-1.5">
              <div className="px-3.5 py-3 flex flex-wrap gap-1.5">
                {badgeOptions.map((option) => {
                  const active = badges.includes(option);
                  return (
                    <button
                      key={option}
                      onClick={() => toggleBadge(option)}
                      className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                        active ? 'bg-ios-blue text-white' : 'bg-ios-fill/[0.12] text-ios-label-secondary/70'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {customBadges.length > 0 && (
                <div className="px-3.5 pb-3 flex flex-wrap gap-1.5" style={{ borderTop: HAIRLINE, paddingTop: '10px' }}>
                  <span className="text-[11px] text-ios-label-secondary/60 w-full mb-0.5">
                    Eski/maxsus belgilar (ro'yxatda yo'q):
                  </span>
                  {customBadges.map((b) => (
                    <span
                      key={b}
                      className="bg-ios-fill/[0.12] text-ios-label pl-3 pr-1.5 py-1 rounded-full text-[13px] font-medium flex items-center gap-1"
                    >
                      {b}
                      <button
                        onClick={() => handleRemoveBadge(b)}
                        className="w-4 h-4 rounded-full bg-ios-fill/20 flex items-center justify-center hover:bg-ios-red hover:text-white transition-colors"
                        aria-label={`${b}ni o'chirish`}
                      >
                        <span className="material-symbols-outlined text-[11px] leading-none">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* GURUH: MAHALLIY ATAMALAR (JARGON) */}
          <div>
            <div className="flex items-center justify-between px-1 mb-1.5">
              <span className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide">
                Mahalliy atamalar
              </span>
            </div>
            <p className="text-[12px] text-ios-label-secondary/70 px-1 mb-1.5">
              Guruhda shu so'zlar bilan yozilsa, bot shu yozuvni topib javob beradi.
            </p>
            <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden">
              <div className="px-3.5 py-3 flex flex-wrap gap-1.5">
                {jargonSynonyms.length === 0 && (
                  <span className="text-[13px] text-ios-label-secondary/70">Hali atama qo'shilmagan</span>
                )}
                {jargonSynonyms.map((w) => (
                  <span
                    key={w}
                    className="bg-ios-blue/10 text-ios-blue pl-3 pr-1.5 py-1 rounded-full text-[13px] font-medium flex items-center gap-1"
                  >
                    {w}
                    <button
                      onClick={() => handleRemoveJargon(w)}
                      className="w-4 h-4 rounded-full bg-ios-blue/20 flex items-center justify-center hover:bg-ios-red hover:text-white transition-colors"
                      aria-label={`${w}ni o'chirish`}
                    >
                      <span className="material-symbols-outlined text-[11px] leading-none">close</span>
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2.5" style={{ borderTop: HAIRLINE }}>
                <span className="material-symbols-outlined text-[18px] text-ios-label-secondary/70">add_circle</span>
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
                  className="flex-1 bg-transparent text-[15px] text-ios-label placeholder:text-ios-label-secondary/70 focus:outline-none"
                />
                <button
                  onClick={handleAddJargon}
                  disabled={!newJargonInput.trim()}
                  className="text-ios-blue text-[13px] font-semibold disabled:opacity-30"
                >
                  Qo'shish
                </button>
              </div>
            </div>

            {/* Bazadagi shu turdagi boshqa yozuvlarning jargon so'zlari —
                bosilsa darhol qo'shiladi. */}
            {jargonSuggestions.filter((s) => !jargonSynonyms.includes(s.phrase.toLowerCase())).length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2">
                <p className="text-[11px] text-ios-label-secondary/70 px-1">
                  💡 Bazada shu turdagi boshqa yozuvlarda ishlatilgan:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {jargonSuggestions
                    .filter((s) => !jargonSynonyms.includes(s.phrase.toLowerCase()))
                    .map((s) => (
                      <button
                        key={s.phrase}
                        onClick={() => handleAddJargonSuggestion(s.phrase)}
                        className="bg-ios-fill/[0.12] text-ios-label px-3 py-1 rounded-full text-[13px] font-medium flex items-center gap-1.5 active:opacity-60"
                      >
                        <span className="material-symbols-outlined text-[14px] text-ios-blue">add_circle</span>
                        {s.phrase}
                        {s.count > 1 && (
                          <span className="text-ios-label-secondary/60 text-[11px]">×{s.count}</span>
                        )}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* GURUH: RASMLAR */}
          <div>
            <div className="flex items-center justify-between px-1 mb-1.5">
              <span className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide">
                Rasmlar ({photoUrls.length}/{MAX_PHOTOS})
              </span>
            </div>
            <p className="text-[12px] text-ios-label-secondary/70 px-1 mb-1.5">
              Bir nechta rasm bo'lsa, bot javobida suriladigan albom sifatida ko'rsatiladi.
            </p>
            <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden p-3.5 space-y-2.5">
              {photoUrls.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-0.5">
                  {photoUrls.map((url) => (
                    <div key={url} className="relative shrink-0 w-16 h-16 rounded-ios overflow-hidden">
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
              {photoUploadError && <p className="text-ios-red text-[12px] font-medium">{photoUploadError}</p>}
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
            <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden mt-1.5">
              {reviews.length === 0 ? (
                <p className="px-3.5 py-3 text-[13px] text-ios-label-secondary/70">Hali baholar berilmagan</p>
              ) : (
                reviews.map((r, i) => (
                  <div
                    key={r.id}
                    className="px-3.5 py-3 flex items-start gap-3"
                    style={i > 0 ? { borderTop: HAIRLINE } : undefined}
                  >
                    <span className="text-[17px] leading-none mt-0.5">{r.isPositive ? '👍' : '👎'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-ios-label">
                        {r.isPositive ? 'Ijobiy tavsiya' : 'Salbiy sharh'}
                      </p>
                      {r.comment && <p className="text-[13px] text-ios-label-secondary/70 mt-0.5">{r.comment}</p>}
                      <span className="text-[11px] text-ios-label-secondary/70 block mt-1">
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
            <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden mt-1.5">
              {corrections.length === 0 ? (
                <p className="px-3.5 py-3 text-[13px] text-ios-label-secondary/70">Tuzatish takliflari yo'q</p>
              ) : (
                corrections.map((c, i) => (
                  <div key={c.id} className="px-3.5 py-3" style={i > 0 ? { borderTop: HAIRLINE } : undefined}>
                    <p className="text-[13px] font-medium text-ios-orange">{c.message}</p>
                    <span className="text-[11px] text-ios-label-secondary/70 block mt-1">
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
            <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden mt-1.5">
              {history.length === 0 ? (
                <p className="px-3.5 py-3 text-[13px] text-ios-label-secondary/70">O'zgarishlar tarixi hali saqlanmagan</p>
              ) : (
                history.map((h, i) => (
                  <div
                    key={h.id}
                    className="px-3.5 py-3 flex items-center gap-2.5"
                    style={i > 0 ? { borderTop: HAIRLINE } : undefined}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0 bg-ios-blue" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-ios-label">
                        Tahrir qilindi ({h.changedBy || 'Admin'})
                      </p>
                      <p className="text-[11px] text-ios-label-secondary/70">{new Date(h.createdAt).toLocaleString()}</p>
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fadeIn">
          <div className="bg-ios-card rounded-t-ios-lg sm:rounded-ios-lg p-4 w-full sm:max-w-sm space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between px-1">
              <span className="text-[15px] font-semibold text-ios-label">Bot javobi ko'rinishi</span>
              <button
                onClick={() => setShowBotModal(false)}
                className="w-7 h-7 rounded-full bg-ios-fill/[0.12] flex items-center justify-center text-ios-label-secondary/70"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div className="bg-[#182533] rounded-ios-lg p-4 text-[13px] font-sans text-slate-100 whitespace-pre-wrap leading-relaxed">
              {botPreviewText}
            </div>

            <p className="text-[12px] text-ios-label-secondary/70 text-center px-2">
              Foydalanuvchi botga "{categoryName}" deb so'raganda guruhda aynan shu xabar ko'rinadi.
            </p>

            <button
              onClick={() => setShowBotModal(false)}
              className="w-full bg-ios-fill/[0.12] text-ios-label font-semibold py-2.5 rounded-ios text-[15px]"
            >
              Yopish
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
