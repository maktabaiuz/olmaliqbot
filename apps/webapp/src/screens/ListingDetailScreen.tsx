import React, { useState, useEffect, useCallback } from 'react';

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
  const [workFrom, setWorkFrom] = useState('08:00');
  const [workTo, setWorkTo] = useState('20:00');
  const [badges, setBadges] = useState<string[]>([]);
  const [jargonSynonyms, setJargonSynonyms] = useState<string[]>([]);
  const [specificServices, setSpecificServices] = useState('');
  const [approxPrice, setApproxPrice] = useState('');
  const [description, setDescription] = useState('');

  // Quick Action Toggles
  const [verification, setVerification] = useState<'VERIFIED' | 'COMMUNITY_UNVERIFIED'>('COMMUNITY_UNVERIFIED');
  const [status, setStatus] = useState<'ACTIVE' | 'PAUSED'>('ACTIVE');

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
        setWorkFrom(l.workFrom || '08:00');
        setWorkTo(l.workTo || '20:00');
        setBadges(l.badges || []);
        setJargonSynonyms(l.jargonSynonyms || []);
        setSpecificServices(l.specificServices || '');
        setApproxPrice(l.approxPrice || '');
        setDescription(l.description || '');
        setVerification(l.verification || 'COMMUNITY_UNVERIFIED');
        setStatus(l.status || 'ACTIVE');

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
        JSON.stringify(jargonSynonyms) !== JSON.stringify(originalData.jargonSynonyms || []))
  );

  // Save changes
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
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ O\'zgarishlar muvaffaqiyatli saqlandi!');
        loadDetail();
      } else {
        showToast('❌ Xatolik yuz berdi');
      }
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
    showToast(nextStatus === 'PAUSED' ? '⏸️ Yozuv pauzaga qo\'yildi' : '🟢 Yozuv faollashtirildi');
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
    showToast(nextVerif === 'VERIFIED' ? '✅ Tasdiqlandi!' : '⚠️ Xalq aytgan holatiga o\'tkazildi');
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
    showToast('📋 Ma\'lumot nusxalandi!');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121417] text-white flex items-center justify-center p-6 font-sans">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800" />
          <div className="h-4 w-32 bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-[#121417] text-on-surface dark:text-slate-100 font-sans flex flex-col pb-24 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-full shadow-2xl border border-slate-700 animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* HEADER BAR */}
      <header className="sticky top-0 z-30 bg-surface/95 dark:bg-[#17212B]/95 backdrop-blur-md border-b border-outline-variant/30 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 rounded-xl hover:bg-surface-container-low dark:hover:bg-slate-800 text-on-surface-variant dark:text-slate-300 transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          <div className="min-w-0">
            <h1 className="font-bold text-base text-on-surface dark:text-slate-100 truncate">
              {name || 'Yozuv'} — {categoryName || 'Kasb'}
            </h1>
            <p className="text-[11px] text-on-surface-variant dark:text-slate-400 truncate">
              {landmarkName || 'Olmaliq'} {addedByUser?.firstName ? `· ${addedByUser.firstName} qo'shgan` : ''}
            </p>
          </div>
        </div>

        {/* ⋯ MENU BUTTON */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-xl text-on-surface-variant dark:text-slate-300 hover:bg-surface-container-low dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">more_vert</span>
          </button>

          {showMenu && (
            <div className="absolute right-0 top-10 bg-surface dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-2xl z-40 w-56 py-1.5 animate-fadeIn">
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowBotModal(true);
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-surface-container-low dark:hover:bg-slate-800 transition-colors flex items-center gap-2.5 text-primary dark:text-sky-400"
              >
                <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                Bot javobini ko'rish
              </button>

              <button
                onClick={handleToggleStatus}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-surface-container-low dark:hover:bg-slate-800 transition-colors flex items-center gap-2.5 text-amber-600 dark:text-amber-400"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {status === 'ACTIVE' ? 'pause_circle' : 'play_circle'}
                </span>
                {status === 'ACTIVE' ? 'Pauzaga qo\'yish' : 'Faollashtirish'}
              </button>

              <button
                onClick={handleCopyDetails}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-surface-container-low dark:hover:bg-slate-800 transition-colors flex items-center gap-2.5 text-on-surface dark:text-slate-200"
              >
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
                Nusxa olish
              </button>

              <div className="border-t border-outline-variant/20 dark:border-slate-800 my-1" />

              <button
                onClick={handleDelete}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-error dark:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2.5"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                O'chirish
              </button>
            </div>
          )}
        </div>
      </header>

      {/* TAB NAVIGATION (MA'LUMOT / TARIX) */}
      <div className="bg-surface dark:bg-[#17212B] border-b border-outline-variant/30 dark:border-slate-800 px-4 flex">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
            activeTab === 'info'
              ? 'border-primary text-primary dark:text-sky-400'
              : 'border-transparent text-on-surface-variant dark:text-slate-400 hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">badge</span>
          Ma'lumot
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-primary text-primary dark:text-sky-400'
              : 'border-transparent text-on-surface-variant dark:text-slate-400 hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">history</span>
          Tarix ({history.length + reviews.length})
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: MA'LUMOT (INLINE EDITABLE FIELDS) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'info' && (
        <main className="p-4 space-y-4 animate-fadeIn">
          {/* QUICK ACTION STATUS CHIPS */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleVerification}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                verification === 'VERIFIED'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-sm'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
              }`}
            >
              <span>{verification === 'VERIFIED' ? '✅' : '⚠️'}</span>
              {verification === 'VERIFIED' ? 'Tasdiqlangan' : 'Xalq aytgan'}
            </button>

            <button
              onClick={handleToggleStatus}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                status === 'ACTIVE'
                  ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <span>{status === 'ACTIVE' ? '🟢' : '⏸️'}</span>
              {status === 'ACTIVE' ? 'Faol' : 'Pauzada'}
            </button>
          </div>

          {/* INLINE EDITABLE FORM */}
          <div className="bg-surface-container-lowest dark:bg-[#17212B] rounded-2xl p-4 border border-outline-variant/30 dark:border-slate-800 space-y-3.5 shadow-sm">
            {/* ISM */}
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-1">
                Ism / Nom *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-surface-container-low dark:bg-[#1C2733] border border-outline-variant/40 dark:border-slate-700 rounded-xl px-3.5 py-3 text-sm text-on-surface dark:text-slate-100 font-semibold outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* TELEFON */}
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-1">
                Telefon raqam *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-surface-container-low dark:bg-[#1C2733] border border-outline-variant/40 dark:border-slate-700 rounded-xl px-3.5 py-3 text-sm text-on-surface dark:text-slate-100 font-mono font-semibold outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* KASB / KATEGORIYA */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-1">
                  Kasb (Kategoriya) *
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={e => setCategoryName(e.target.value)}
                  className="w-full bg-surface-container-low dark:bg-[#1C2733] border border-outline-variant/40 dark:border-slate-700 rounded-xl px-3.5 py-3 text-sm text-on-surface dark:text-slate-100 outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* MO'LJAL */}
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-1">
                  Mo'ljal *
                </label>
                <input
                  type="text"
                  value={landmarkName}
                  onChange={e => setLandmarkName(e.target.value)}
                  className="w-full bg-surface-container-low dark:bg-[#1C2733] border border-outline-variant/40 dark:border-slate-700 rounded-xl px-3.5 py-3 text-sm text-on-surface dark:text-slate-100 outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* ISH VAQTI */}
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-1">
                Ish vaqti
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={workFrom}
                  onChange={e => setWorkFrom(e.target.value)}
                  placeholder="08:00"
                  className="w-full bg-surface-container-low dark:bg-[#1C2733] border border-outline-variant/40 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-on-surface dark:text-slate-100 outline-none"
                />
                <input
                  type="text"
                  value={workTo}
                  onChange={e => setWorkTo(e.target.value)}
                  placeholder="20:00"
                  className="w-full bg-surface-container-low dark:bg-[#1C2733] border border-outline-variant/40 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-on-surface dark:text-slate-100 outline-none"
                />
              </div>
            </div>

            {/* BELGILAR (BADGES CHIPS) */}
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-1">
                Belgilar (Chiplar)
              </label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {badges.map((b) => (
                  <span
                    key={b}
                    className="bg-primary/10 dark:bg-sky-500/20 text-primary dark:text-sky-300 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5"
                  >
                    🏷️ {b}
                    <button
                      type="button"
                      onClick={() => handleRemoveBadge(b)}
                      className="hover:text-red-400 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}

                {showNewBadgeInput ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newBadgeInput}
                      onChange={e => setNewBadgeInput(e.target.value)}
                      placeholder="belgi..."
                      className="bg-surface-container-low dark:bg-[#1C2733] border border-slate-700 rounded-full px-3 py-1 text-xs outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddBadge}
                      className="bg-sky-500 text-white text-xs px-2.5 py-1 rounded-full font-bold"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowNewBadgeInput(true)}
                    className="border border-dashed border-outline-variant dark:border-slate-700 text-on-surface-variant dark:text-slate-400 text-xs font-semibold px-3 py-1 rounded-full hover:bg-surface-container-low"
                  >
                    + Qo'shish
                  </button>
                )}
              </div>
            </div>

            {/* JARGON / XALQ ATAMALARI */}
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-1">
                Jargon / xalq atamalari
              </label>
              <p className="text-[10px] text-on-surface-variant dark:text-slate-500 mb-1.5">
                Guruhda shu so'zlar bilan yozilsa, bot shu yozuvni topib javob beradi.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {jargonSynonyms.map((w) => (
                  <span
                    key={w}
                    className="bg-primary/10 dark:bg-sky-500/20 text-primary dark:text-sky-300 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5"
                  >
                    {w}
                    <button
                      type="button"
                      onClick={() => handleRemoveJargon(w)}
                      className="hover:text-red-400 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}

                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newJargonInput}
                    onChange={e => setNewJargonInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddJargon();
                      }
                    }}
                    placeholder="masalan: trubkachi"
                    className="bg-surface-container-low dark:bg-[#1C2733] border border-slate-700 rounded-full px-3 py-1 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddJargon}
                    className="bg-sky-500 text-white text-xs px-2.5 py-1 rounded-full font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* ANIQ XIZMATLAR */}
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-1">
                Aniq xizmatlar
              </label>
              <input
                type="text"
                value={specificServices}
                onChange={e => setSpecificServices(e.target.value)}
                placeholder="masalan: gaz kolonka tammirlash, plita ornatish"
                className="w-full bg-surface-container-low dark:bg-[#1C2733] border border-outline-variant/40 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-on-surface dark:text-slate-100 outline-none"
              />
            </div>

            {/* TAXMINIY NARX */}
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-1">
                Taxminiy narx
              </label>
              <input
                type="text"
                value={approxPrice}
                onChange={e => setApproxPrice(e.target.value)}
                placeholder="masalan: 50,000 - 150,000 som"
                className="w-full bg-surface-container-low dark:bg-[#1C2733] border border-outline-variant/40 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-on-surface dark:text-slate-100 outline-none"
              />
            </div>

            {/* IZOH */}
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-1">
                Izoh
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Qo'shimcha izoh..."
                className="w-full bg-surface-container-low dark:bg-[#1C2733] border border-outline-variant/40 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-on-surface dark:text-slate-100 outline-none resize-none"
              />
            </div>
          </div>
        </main>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: TARIX (HISTORY & REVIEWS) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <main className="p-4 space-y-4 animate-fadeIn">
          {/* BAHOLAR VA SHARHLAR */}
          <section className="bg-surface-container-lowest dark:bg-[#17212B] rounded-2xl p-4 border border-outline-variant/30 dark:border-slate-800 space-y-3">
            <h2 className="text-xs font-bold tracking-wider text-primary dark:text-sky-400 uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">grade</span>
              Baholar va Sharhlar ({reviews.length})
            </h2>

            {reviews.length === 0 ? (
              <p className="text-xs text-on-surface-variant dark:text-slate-400">Hali baholar berilmagan</p>
            ) : (
              <div className="space-y-2">
                {reviews.map(r => (
                  <div
                    key={r.id}
                    className="p-3 rounded-xl bg-surface-container-low dark:bg-[#1C2733] flex items-start gap-3 border border-outline-variant/20 dark:border-slate-800"
                  >
                    <span className="text-lg">{r.isPositive ? '👍' : '👎'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-on-surface dark:text-slate-100">
                        {r.isPositive ? 'Ijobiy tavsiya' : 'Salbiy sharh'}
                      </p>
                      {r.comment && (
                        <p className="text-xs text-on-surface-variant dark:text-slate-300 mt-0.5">{r.comment}</p>
                      )}
                      <span className="text-[10px] text-slate-500 block mt-1">
                        {new Date(r.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* TUZATISHLAR */}
          <section className="bg-surface-container-lowest dark:bg-[#17212B] rounded-2xl p-4 border border-outline-variant/30 dark:border-slate-800 space-y-3">
            <h2 className="text-xs font-bold tracking-wider text-amber-500 uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">build</span>
              Tuzatishlar ({corrections.length})
            </h2>

            {corrections.length === 0 ? (
              <p className="text-xs text-on-surface-variant dark:text-slate-400">Tuzatish takliflari yo'q</p>
            ) : (
              <div className="space-y-2">
                {corrections.map(c => (
                  <div key={c.id} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
                    <p className="font-semibold text-amber-300">{c.message}</p>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {new Date(c.createdAt).toLocaleString()} · Status: {c.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* O'ZGARISHLAR TARIXI (SNAPSHOT HISTORY) */}
          <section className="bg-surface-container-lowest dark:bg-[#17212B] rounded-2xl p-4 border border-outline-variant/30 dark:border-slate-800 space-y-3">
            <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">history</span>
              O'zgarishlar tarixi ({history.length})
            </h2>

            {history.length === 0 ? (
              <p className="text-xs text-on-surface-variant dark:text-slate-400">O'zgarishlar tarixi hali saqlanmagan</p>
            ) : (
              <div className="space-y-2.5 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {history.map(h => (
                  <div key={h.id} className="relative pl-7 text-xs">
                    <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-sky-500 border-2 border-[#17212B]" />
                    <p className="font-semibold text-slate-200">
                      Tahrir qilindi ({h.changedBy || 'Admin'})
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(h.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {/* FLOATING "SAQLASH" BUTTON (Appears ONLY if hasChanges === true) */}
      {hasChanges && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-container-max mx-auto animate-slide-up">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-14 bg-gradient-to-r from-primary to-secondary text-white font-bold text-base rounded-2xl shadow-2xl flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50 border border-white/20"
          >
            <span className="material-symbols-outlined text-[22px]">save</span>
            {saving ? 'Saqlanmoqda...' : 'O\'zgarishlarni Saqlash'}
          </button>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: BOT JAVOBINI KO'RISH */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showBotModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                Bot Javobi Ko'rinishi
              </div>
              <button
                onClick={() => setShowBotModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Telegram Message Bubble */}
            <div className="bg-[#182533] rounded-2xl p-4 text-xs font-sans text-slate-100 shadow-md border border-slate-800/80 whitespace-pre-wrap leading-relaxed">
              {botPreviewText}
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              Foydalanuvchi botga "{categoryName}" deb so'raganda guruhda aynan shu xabar ko'rinadi.
            </p>

            <button
              onClick={() => setShowBotModal(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors"
            >
              Yopish
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
