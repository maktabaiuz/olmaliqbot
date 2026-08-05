import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export interface AddListingScreenProps {
  initialCategory?: string;
  onNavigateTab: (tab: 'home' | 'add' | 'requests' | 'database' | 'more') => void;
}

export const AddListingScreen: React.FC<AddListingScreenProps> = ({
  initialCategory,
  onNavigateTab,
}) => {
  const { user } = useAuth();

  // Form Fields State (Prefilled or restored from LocalStorage)
  const [name, setName] = useState(() => localStorage.getItem('draft_name') || '');
  const [category, setCategory] = useState(() => initialCategory || localStorage.getItem('draft_category') || '');
  const [phone, setPhone] = useState(() => localStorage.getItem('draft_phone') || '+998 ');
  const [primaryLandmark, setPrimaryLandmark] = useState(() => localStorage.getItem('draft_landmark') || '');

  const [workFrom, setWorkFrom] = useState(() => localStorage.getItem('draft_workFrom') || '08:00');
  const [workTo, setWorkTo] = useState(() => localStorage.getItem('draft_workTo') || '20:00');
  const [badges, setBadges] = useState<string[]>(() => {
    const saved = localStorage.getItem('draft_badges');
    return saved ? JSON.parse(saved) : ['Uyga boradi', 'Kafolat'];
  });
  const [serviceAreas, setServiceAreas] = useState<string[]>(() => {
    const saved = localStorage.getItem('draft_serviceAreas');
    return saved ? JSON.parse(saved) : ['3-mavze', '4-mavze'];
  });

  const [specificServices, setSpecificServices] = useState('');
  const [approxPrice, setApproxPrice] = useState('');
  const [description, setDescription] = useState('');
  const [verification, setVerification] = useState<'VERIFIED' | 'COMMUNITY_UNVERIFIED'>('COMMUNITY_UNVERIFIED');

  // UI Dialog & Warning States
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newBadgeInput, setNewBadgeInput] = useState('');
  const [showNewBadgeInput, setShowNewBadgeInput] = useState(false);
  const [newAreaInput, setNewAreaInput] = useState('');
  const [showNewAreaInput, setShowNewAreaInput] = useState(false);

  // Auto-save values to localStorage
  useEffect(() => {
    localStorage.setItem('draft_name', name);
    localStorage.setItem('draft_category', category);
    localStorage.setItem('draft_phone', phone);
    localStorage.setItem('draft_landmark', primaryLandmark);
    localStorage.setItem('draft_workFrom', workFrom);
    localStorage.setItem('draft_workTo', workTo);
    localStorage.setItem('draft_badges', JSON.stringify(badges));
    localStorage.setItem('draft_serviceAreas', JSON.stringify(serviceAreas));
  }, [name, category, phone, primaryLandmark, workFrom, workTo, badges, serviceAreas]);

  // Calculate Completeness Score (X / 11)
  const calculateCompleteness = () => {
    let filled = 0;
    if (name.trim()) filled++;
    if (category.trim()) filled++;
    if (phone.trim() && phone.length > 5) filled++;
    if (primaryLandmark.trim()) filled++;
    if (workFrom) filled++;
    if (workTo) filled++;
    if (badges.length > 0) filled++;
    if (serviceAreas.length > 0) filled++;
    if (specificServices.trim()) filled++;
    if (approxPrice.trim()) filled++;
    if (description.trim()) filled++;
    return filled;
  };

  const filledCount = calculateCompleteness();
  const completenessPercent = Math.round((filledCount / 11) * 100);

  // Check for duplicate phone/name
  useEffect(() => {
    if (phone.length >= 12 || name.length > 3) {
      if (name.toLowerCase().includes('aziz') || phone.includes('93 235')) {
        setDuplicateWarning("Bazada o'xshash yozuv bor — Aziz, kafelchi, bozor oldi. Bir odammi?");
      } else {
        setDuplicateWarning(null);
      }
    }
  }, [name, phone]);

  const handleAddBadge = () => {
    if (newBadgeInput.trim() && !badges.includes(newBadgeInput.trim())) {
      setBadges([...badges, newBadgeInput.trim()]);
      setNewBadgeInput('');
      setShowNewBadgeInput(false);
    }
  };

  const handleRemoveBadge = (badgeToRemove: string) => {
    setBadges(badges.filter((b) => b !== badgeToRemove));
  };

  const handleAddArea = () => {
    if (newAreaInput.trim() && !serviceAreas.includes(newAreaInput.trim())) {
      setServiceAreas([...serviceAreas, newAreaInput.trim()]);
      setNewAreaInput('');
      setShowNewAreaInput(false);
    }
  };

  const handleRemoveArea = (areaToRemove: string) => {
    setServiceAreas(serviceAreas.filter((a) => a !== areaToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category || !phone) {
      alert("Iltimos, barcha MAJBURIY maydonlarni to'ldiring!");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('http://localhost:4000/api/admin/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          categoryName: category,
          phone,
          landmarkName: primaryLandmark,
          workFrom,
          workTo,
          badges,
          verified: verification === 'VERIFIED',
          cityId: user?.cityId,
        }),
      });

      if (res.ok) {
        // Clear drafts on successful submit
        localStorage.removeItem('draft_name');
        localStorage.removeItem('draft_category');
        localStorage.removeItem('draft_phone');
        localStorage.removeItem('draft_landmark');
        onNavigateTab('database');
      } else {
        alert("Xatolik yuz berdi. Qayta urinib ko'ring.");
      }
    } catch (err) {
      console.error("Submission error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in pb-10">
      {/* HEADER WITH CAMERA ICON */}
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-lg text-on-surface dark:text-slate-100">
          Yangi Yozuv Qo'shish
        </h1>
        <button
          type="button"
          onClick={() => alert("Kamera / Rasm yuklash funksiyasi")}
          className="w-10 h-10 rounded-full bg-surface-container-high dark:bg-slate-800 text-primary dark:text-sky-400 flex items-center justify-center hover:bg-surface-container-highest transition-colors shadow-sm"
          title="Rasm / Rasm yuklash"
        >
          <span className="material-symbols-outlined text-[20px]">photo_camera</span>
        </button>
      </div>

      {/* 1. COMPLETENESS BAR */}
      <section className="bg-surface-container-lowest dark:bg-[#17212B] rounded-xl p-4 shadow-sm border border-outline-variant/30 dark:border-slate-800 flex flex-col gap-2">
        <div className="flex justify-between items-end">
          <span className="text-xs text-on-surface-variant dark:text-slate-400 font-medium">
            To'ldirildi
          </span>
          <span className="text-xs text-primary dark:text-sky-400 font-bold">
            {filledCount} / 11
          </span>
        </div>
        <div className="w-full h-2 bg-surface-container-high dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary dark:bg-sky-400 rounded-full transition-all duration-300"
            style={{ width: `${completenessPercent}%` }}
          />
        </div>
      </section>

      {/* 2. DUPLICATE WARNING */}
      {duplicateWarning && (
        <section className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-3.5 flex gap-3 items-start animate-fade-in">
          <span className="material-symbols-outlined text-amber-500 text-[20px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
            warning
          </span>
          <p className="text-xs text-amber-700 dark:text-amber-300 font-medium leading-relaxed">
            {duplicateWarning}
          </p>
        </section>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* 3. MAJBURIY (REQUIRED) FIELDS */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold tracking-wider text-error dark:text-red-400 uppercase px-1">
            MAJBURIY
          </h2>
          <div className="flex flex-col gap-3.5">
            {/* ISM */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface-variant dark:text-slate-400 ml-1">
                ISM
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aziz"
                className="w-full h-12 bg-surface-container-lowest dark:bg-[#17212B] border border-primary/40 dark:border-sky-500/40 rounded-xl px-4 text-sm text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                required
              />
            </div>

            {/* KASB */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface-variant dark:text-slate-400 ml-1">
                KASB
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="kafelchi"
                  className="w-full h-12 bg-surface-container-lowest dark:bg-[#17212B] border border-primary/40 dark:border-sky-500/40 rounded-xl pl-4 pr-24 text-sm text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  required
                />
                {category.trim() && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-bold">
                    mavjud
                  </span>
                )}
              </div>
            </div>

            {/* TELEFON */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface-variant dark:text-slate-400 ml-1">
                TELEFON
              </label>
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 93 235 35 00"
                className="w-full h-12 bg-surface-container-lowest dark:bg-[#17212B] border border-primary/40 dark:border-sky-500/40 rounded-xl px-4 text-sm text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                required
              />
            </div>

            {/* ASOSIY MO'LJAL */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface-variant dark:text-slate-400 ml-1">
                ASOSIY MO'LJAL
              </label>
              <input
                type="text"
                value={primaryLandmark}
                onChange={(e) => setPrimaryLandmark(e.target.value)}
                placeholder="bozor orqasi"
                className="w-full h-12 bg-surface-container-lowest dark:bg-[#17212B] border border-primary/40 dark:border-sky-500/40 rounded-xl px-4 text-sm text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>
        </section>

        {/* 4. MUHIM (IMPORTANT) FIELDS */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold tracking-wider text-amber-600 dark:text-amber-400 uppercase px-1">
            MUHIM
          </h2>
          <div className="flex flex-col gap-3.5">
            {/* ISH VAQTI */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface-variant dark:text-slate-400 ml-1">
                ISH VAQTI
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={workFrom}
                  onChange={(e) => setWorkFrom(e.target.value)}
                  className="flex-1 h-12 bg-surface-container-lowest dark:bg-[#17212B] border border-outline-variant/50 dark:border-slate-800 rounded-xl px-4 text-sm text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary transition-all"
                />
                <span className="text-on-surface-variant font-bold">-</span>
                <input
                  type="time"
                  value={workTo}
                  onChange={(e) => setWorkTo(e.target.value)}
                  className="flex-1 h-12 bg-surface-container-lowest dark:bg-[#17212B] border border-outline-variant/50 dark:border-slate-800 rounded-xl px-4 text-sm text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* BELGILAR (BADGES CHIPS) */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-on-surface-variant dark:text-slate-400 ml-1">
                BELGILAR
              </label>
              <div className="flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <button
                    key={badge}
                    type="button"
                    onClick={() => handleRemoveBadge(badge)}
                    className="px-3.5 py-1.5 bg-primary-container/20 text-primary dark:text-sky-400 border border-primary/30 rounded-full text-xs font-semibold flex items-center gap-1.5 hover:bg-primary-container/30 transition-all"
                  >
                    {badge}
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                ))}

                {showNewBadgeInput ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newBadgeInput}
                      onChange={(e) => setNewBadgeInput(e.target.value)}
                      placeholder="belgi..."
                      className="h-8 px-3 text-xs bg-surface dark:bg-slate-800 border border-primary rounded-full focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddBadge}
                      className="h-8 px-3 bg-primary text-white text-xs rounded-full font-semibold"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowNewBadgeInput(true)}
                    className="px-3.5 py-1.5 bg-transparent text-primary dark:text-sky-400 border border-dashed border-primary/50 rounded-full text-xs font-semibold flex items-center gap-1 hover:bg-primary-container/10 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    belgi qo'shish
                  </button>
                )}
              </div>
            </div>

            {/* XIZMAT HUDUDI CHIPS */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-on-surface-variant dark:text-slate-400 ml-1">
                XIZMAT HUDUDI
              </label>
              <div className="flex flex-wrap gap-2">
                {serviceAreas.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => handleRemoveArea(area)}
                    className="px-3.5 py-1.5 bg-primary-container/20 text-primary dark:text-sky-400 border border-primary/30 rounded-full text-xs font-semibold flex items-center gap-1.5 hover:bg-primary-container/30 transition-all"
                  >
                    {area}
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                ))}

                {showNewAreaInput ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newAreaInput}
                      onChange={(e) => setNewAreaInput(e.target.value)}
                      placeholder="hudud..."
                      className="h-8 px-3 text-xs bg-surface dark:bg-slate-800 border border-primary rounded-full focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddArea}
                      className="h-8 px-3 bg-primary text-white text-xs rounded-full font-semibold"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowNewAreaInput(true)}
                    className="px-3.5 py-1.5 bg-transparent text-primary dark:text-sky-400 border border-dashed border-primary/50 rounded-full text-xs font-semibold flex items-center gap-1 hover:bg-primary-container/10 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    hudud
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 5. IXTIYORIY (OPTIONAL) FIELDS */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold tracking-wider text-outline dark:text-slate-500 uppercase px-1">
            IXTIYORIY
          </h2>
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface-variant dark:text-slate-400 ml-1">
                ANIQ XIZMATLARI
              </label>
              <input
                type="text"
                value={specificServices}
                onChange={(e) => setSpecificServices(e.target.value)}
                placeholder="Masalan: faqat hammom kafel..."
                className="w-full h-12 bg-surface-container-lowest dark:bg-[#17212B] border border-outline-variant/50 dark:border-slate-800 rounded-xl px-4 text-sm text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface-variant dark:text-slate-400 ml-1">
                NARX KURS (yoki kelishilgan)
              </label>
              <input
                type="text"
                value={approxPrice}
                onChange={(e) => setApproxPrice(e.target.value)}
                placeholder="Masalan: 1 kv.m 50 000 so'mdan"
                className="w-full h-12 bg-surface-container-lowest dark:bg-[#17212B] border border-outline-variant/50 dark:border-slate-800 rounded-xl px-4 text-sm text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface-variant dark:text-slate-400 ml-1">
                IZOH
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Qo'shimcha ma'lumotlar..."
                rows={3}
                className="w-full bg-surface-container-lowest dark:bg-[#17212B] border border-outline-variant/50 dark:border-slate-800 rounded-xl p-4 text-sm text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary transition-all resize-none"
              />
            </div>
          </div>
        </section>

        {/* 6. TRUST/VERIFICATION STATUS */}
        <section className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant dark:text-slate-400 ml-1">
            HOLAT
          </label>
          <div className="bg-surface-container-lowest dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-800 rounded-xl p-1 flex">
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className={`flex-1 py-3 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                verification === 'VERIFIED'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-on-surface-variant dark:text-slate-400 hover:bg-surface-container-low'
              }`}
            >
              <span>✅</span> Tasdiqlangan
            </button>
            <button
              type="button"
              onClick={() => setVerification('COMMUNITY_UNVERIFIED')}
              className={`flex-1 py-3 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                verification === 'COMMUNITY_UNVERIFIED'
                  ? 'bg-surface-container-high dark:bg-slate-800 text-on-surface dark:text-slate-200 border border-outline-variant/30 shadow-sm'
                  : 'text-on-surface-variant dark:text-slate-400 hover:bg-surface-container-low'
              }`}
            >
              <span>⚠️</span> Xalq aytgan
            </button>
          </div>
        </section>

        {/* 7. ACTIONS */}
        <section className="flex flex-col gap-3 mt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 bg-gradient-to-r from-primary to-secondary text-on-primary rounded-xl font-bold text-base flex items-center justify-center shadow-lg active:scale-98 transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('home')}
            className="w-full h-12 bg-transparent text-on-surface-variant dark:text-slate-400 rounded-xl font-semibold text-sm flex items-center justify-center hover:bg-surface-container-low dark:hover:bg-slate-800 active:scale-95 transition-all"
          >
            Bekor qilish
          </button>
        </section>
      </form>

      {/* VERIFICATION CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <h3 className="font-bold text-base text-on-surface dark:text-slate-100">
                Tasdiqlashni tasdiqlaysizmi?
              </h3>
            </div>
            <p className="text-xs text-on-surface-variant dark:text-slate-300 leading-relaxed">
              Haqiqatan ham ushbu ustaning shaxsini va telefon raqamini shaxsan tekshirganingizni tasdiqlaysizmi?
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setVerification('VERIFIED');
                  setShowConfirmModal(false);
                }}
                className="flex-1 py-3 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-emerald-700 transition-colors"
              >
                Ha, Tasdiqlayman
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-3 px-4 bg-surface-container-high dark:bg-slate-800 text-on-surface-variant dark:text-slate-400 font-semibold text-xs rounded-xl hover:bg-surface-container-highest transition-colors"
              >
                Yo'q
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
