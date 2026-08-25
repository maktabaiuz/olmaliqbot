import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export interface AddListingScreenProps {
  initialCategory?: string;
  onNavigateTab: (tab: 'home' | 'database' | 'add' | 'users' | 'more') => void;
}

export const AddListingScreen: React.FC<AddListingScreenProps> = ({
  initialCategory,
  onNavigateTab,
}) => {
  const { user } = useAuth();

  // Wizard Step State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [listingType, setListingType] = useState<'USTA' | 'DOKON_OBYEKT' | 'MUASSASA'>('USTA');

  // Form Fields State (Prefilled or restored from LocalStorage)
  const [name, setName] = useState(() => localStorage.getItem('draft_name') || '');
  const [category, setCategory] = useState(() => initialCategory || localStorage.getItem('draft_category') || '');
  const [phone, setPhone] = useState(() => localStorage.getItem('draft_phone') || '+998 ');
  const [primaryLandmark, setPrimaryLandmark] = useState(() => localStorage.getItem('draft_landmark') || '');
  const [jargonWords, setJargonWords] = useState<string[]>(() => {
    const saved = localStorage.getItem('draft_jargonWords');
    return saved ? JSON.parse(saved) : [];
  });
  const [newJargonWord, setNewJargonWord] = useState('');

  const [workFrom, setWorkFrom] = useState(() => localStorage.getItem('draft_workFrom') || '08:00');
  const [workTo, setWorkTo] = useState(() => localStorage.getItem('draft_workTo') || '20:00');
  const [badges, setBadges] = useState<string[]>(() => {
    const saved = localStorage.getItem('draft_badges');
    return saved ? JSON.parse(saved) : ['Uyga boradi', 'Kafolat'];
  });
  const [serviceAreas] = useState<string[]>(() => {
    const saved = localStorage.getItem('draft_serviceAreas');
    return saved ? JSON.parse(saved) : ['3-mavze', '4-mavze'];
  });

  const [specificServices] = useState(() => localStorage.getItem('draft_specificServices') || '');
  const [approxPrice, setApproxPrice] = useState(() => localStorage.getItem('draft_approxPrice') || '');
  const [description, setDescription] = useState(() => localStorage.getItem('draft_description') || '');
  const [verification] = useState<'VERIFIED' | 'COMMUNITY_UNVERIFIED'>('COMMUNITY_UNVERIFIED');
  const [consentGiven, setConsentGiven] = useState(() => localStorage.getItem('draft_consentGiven') === 'true');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; category?: string; phone?: string; landmark?: string }>({});

  const [categoryList, setCategoryList] = useState<string[]>([
    'gazavik', 'santexnik', 'elektrik', 'kafelchi', 'notarius', 'duradgor', 'malyar', 'dorixona', 'avtoelektrik'
  ]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  useEffect(() => {
    fetch('/api/admin/categories')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const names = data.map((c: any) => c.name);
          setCategoryList(prev => Array.from(new Set([...prev, ...names])));
        }
      })
      .catch(() => {});
  }, []);

  // Save draft state
  useEffect(() => {
    localStorage.setItem('draft_name', name);
    localStorage.setItem('draft_category', category);
    localStorage.setItem('draft_phone', phone);
    localStorage.setItem('draft_landmark', primaryLandmark);
    localStorage.setItem('draft_jargonWords', JSON.stringify(jargonWords));
    localStorage.setItem('draft_workFrom', workFrom);
    localStorage.setItem('draft_workTo', workTo);
    localStorage.setItem('draft_badges', JSON.stringify(badges));
    localStorage.setItem('draft_serviceAreas', JSON.stringify(serviceAreas));
    localStorage.setItem('draft_specificServices', specificServices);
    localStorage.setItem('draft_approxPrice', approxPrice);
    localStorage.setItem('draft_description', description);
    localStorage.setItem('draft_consentGiven', String(consentGiven));
  }, [name, category, phone, primaryLandmark, jargonWords, workFrom, workTo, badges, serviceAreas, specificServices, approxPrice, description, consentGiven]);

  const handleAddJargonWord = () => {
    const clean = newJargonWord.trim().toLowerCase();
    if (clean && !jargonWords.includes(clean)) {
      setJargonWords([...jargonWords, clean]);
      setNewJargonWord('');
    }
  };

  // Duplicate checks
  useEffect(() => {
    let active = true;
    const cleanP = phone.replace(/\D/g, '');
    if (cleanP.length >= 7 || name.trim().length >= 3) {
      const initData = window.Telegram?.WebApp?.initData || '';
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/admin/listings/check-duplicate?phone=${encodeURIComponent(cleanP)}&name=${encodeURIComponent(name.trim())}`, {
            headers: { 'x-init-data': initData },
          });
          const data = await res.json();
          if (active && data.isDuplicate && data.existing) {
            setDuplicateWarning(
              `Bazada o'xshash yozuv bor — ${data.existing.name}, ${data.existing.categoryName}, ${data.existing.landmarkName}.`
            );
          } else if (active) {
            setDuplicateWarning(null);
          }
        } catch {
          if (active) setDuplicateWarning(null);
        }
      }, 400);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    } else {
      setDuplicateWarning(null);
    }
  }, [name, phone]);

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

  const handleNextStep = () => {
    const errors: { name?: string; category?: string; phone?: string; landmark?: string } = {};
    if (step === 1) {
      if (!name.trim()) errors.name = 'Ism majburiy';
      if (!category.trim()) errors.category = 'Kasb/soha majburiy';
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length < 9) errors.phone = "Telefon raqam to'liq emas";
      if (!primaryLandmark.trim()) errors.landmark = 'Mo\'ljal majburiy';

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      setFieldErrors({});
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBackStep = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const handleSubmit = async () => {
    if (!consentGiven) {
      alert("⚠️ Iltimos, mijoz roziligini tasdiqlang!");
      return;
    }

    setIsSubmitting(true);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch('/api/admin/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-init-data': initData,
        },
        body: JSON.stringify({
          type: listingType,
          name,
          categoryName: category,
          phone,
          landmarkName: primaryLandmark,
          workFrom,
          workTo,
          badges,
          verified: verification === 'VERIFIED',
          cityId: user?.cityId,
          addedByUserId: user?.id,
          consentGiven: true,
          consentDevice: navigator.userAgent || 'Unknown Mobile Device',
          jargonSynonyms: Array.from(new Set([...jargonWords, primaryLandmark.toLowerCase()])),
          approxPrice,
          specificServices,
          description,
        }),
      });

      if (res.ok) {
        // Clear drafts
        localStorage.removeItem('draft_name');
        localStorage.removeItem('draft_category');
        localStorage.removeItem('draft_phone');
        localStorage.removeItem('draft_landmark');
        localStorage.removeItem('draft_jargonWords');
        localStorage.removeItem('draft_workFrom');
        localStorage.removeItem('draft_workTo');
        localStorage.removeItem('draft_badges');
        localStorage.removeItem('draft_serviceAreas');
        localStorage.removeItem('draft_specificServices');
        localStorage.removeItem('draft_approxPrice');
        localStorage.removeItem('draft_description');
        localStorage.removeItem('draft_consentGiven');

        onNavigateTab('database');
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`⚠️ Xatolik: ${errData.message || 'Saqlashda xatolik yuz berdi'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Aloqa xatoligi. Qoralama qurilmangizda saqlab qolindi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in pb-16">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-on-surface dark:text-slate-100">Yozuv qo'shish</h1>
        <span className="text-xs text-primary dark:text-sky-400 font-bold bg-primary/10 dark:bg-sky-500/10 px-2.5 py-1 rounded-full">
          Completeness: {filledCount}/11
        </span>
      </div>

      {/* Progress Wizard Steps (Visual apple style steps) */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
        {[
          { num: 1, label: 'Asosiy' },
          { num: 2, label: 'Belgilar' },
          { num: 3, label: 'Tasdiq' },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-1.5">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s.num
                  ? 'bg-primary dark:bg-sky-500 text-white'
                  : step > s.num
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-300 dark:bg-slate-700 text-slate-500'
              }`}
            >
              {step > s.num ? '✓' : s.num}
            </span>
            <span className={`text-[11px] font-bold ${step === s.num ? 'text-on-surface dark:text-slate-100' : 'text-slate-500'}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Duplicate Warning banner */}
      {duplicateWarning && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-600 dark:text-amber-400 text-xs font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">warning</span>
          <span>{duplicateWarning}</span>
        </div>
      )}

      {/* STEP 1 FORM */}
      {step === 1 && (
        <div className="bg-surface dark:bg-[#17212B] p-4 border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Turi *</label>
            <div className="bg-slate-200/80 dark:bg-slate-800/80 p-0.5 rounded-xl flex items-center justify-between shadow-inner">
              {[
                { id: 'USTA', label: 'Usta' },
                { id: 'DOKON_OBYEKT', label: "Do'kon" },
                { id: 'MUASSASA', label: 'Muassasa' },
              ].map((seg) => (
                <button
                  key={seg.id}
                  type="button"
                  onClick={() => setListingType(seg.id as any)}
                  className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all ${
                    listingType === seg.id
                      ? 'bg-white dark:bg-[#1C2733] text-on-surface dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {seg.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Ismi-familiyasi *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldErrors(prev => ({ ...prev, name: undefined }));
              }}
              placeholder="Masalan, Anvar Usta"
              className={`w-full bg-slate-50 dark:bg-[#1C2733] border rounded-xl px-3 py-2.5 text-xs text-on-surface dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary ${
                fieldErrors.name ? 'border-red-500' : 'border-outline-variant/30 dark:border-slate-800'
              }`}
            />
            {fieldErrors.name && <p className="text-red-500 text-[10px] font-semibold mt-0.5">{fieldErrors.name}</p>}
          </div>

          <div className="flex flex-col gap-1 relative">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Kasb/Soha *</label>
            <input
              type="text"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setFieldErrors(prev => ({ ...prev, category: undefined }));
                setShowCategoryDropdown(true);
              }}
              onFocus={() => setShowCategoryDropdown(true)}
              placeholder="Masalan, Santexnik"
              className={`w-full bg-slate-50 dark:bg-[#1C2733] border rounded-xl px-3 py-2.5 text-xs text-on-surface dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary ${
                fieldErrors.category ? 'border-red-500' : 'border-outline-variant/30 dark:border-slate-800'
              }`}
            />
            {fieldErrors.category && <p className="text-red-500 text-[10px] font-semibold mt-0.5">{fieldErrors.category}</p>}
            {showCategoryDropdown && (
              <div className="absolute top-16 inset-x-0 bg-white dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-xl max-h-40 overflow-y-auto z-50 py-1 shadow-lg">
                {categoryList
                  .filter(c => c.toLowerCase().includes(category.toLowerCase()))
                  .map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setCategory(item);
                        setShowCategoryDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-on-surface dark:text-slate-200"
                    >
                      {item}
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Jargon / xalq atamalari</label>
            <p className="text-[10px] text-slate-500 -mt-1">Mahalliy odamlar bu usta/do'konni qanday nomlar bilan atashadi? (masalan: "trubkachi", "gazon"). Guruhda shu so'zlar bilan yozilsa, bot shu yozuvni topib javob beradi.</p>
            {jargonWords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {jargonWords.map(word => (
                  <span key={word} className="bg-primary/10 dark:bg-sky-500/10 text-primary dark:text-sky-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                    {word}
                    <button
                      type="button"
                      onClick={() => setJargonWords(jargonWords.filter(w => w !== word))}
                      className="hover:text-red-500 text-[14px] leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newJargonWord}
                onChange={(e) => setNewJargonWord(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddJargonWord();
                  }
                }}
                placeholder="Masalan, trubkachi"
                className="flex-1 bg-slate-50 dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-on-surface dark:text-slate-100 placeholder-slate-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddJargonWord}
                className="bg-primary dark:bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-bold active:scale-95"
              >
                Qo'shish
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Telefon raqami *</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setFieldErrors(prev => ({ ...prev, phone: undefined }));
              }}
              placeholder="+998 90 123 45 67"
              className={`w-full bg-slate-50 dark:bg-[#1C2733] border rounded-xl px-3 py-2.5 text-xs text-on-surface dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary ${
                fieldErrors.phone ? 'border-red-500' : 'border-outline-variant/30 dark:border-slate-800'
              }`}
            />
            {fieldErrors.phone && <p className="text-red-500 text-[10px] font-semibold mt-0.5">{fieldErrors.phone}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Mo'ljal manzili *</label>
            <input
              type="text"
              value={primaryLandmark}
              onChange={(e) => {
                setPrimaryLandmark(e.target.value);
                setFieldErrors(prev => ({ ...prev, landmark: undefined }));
              }}
              placeholder="Masalan, Korzinka orqasida"
              className={`w-full bg-slate-50 dark:bg-[#1C2733] border rounded-xl px-3 py-2.5 text-xs text-on-surface dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary ${
                fieldErrors.landmark ? 'border-red-500' : 'border-outline-variant/30 dark:border-slate-800'
              }`}
            />
            {fieldErrors.landmark && <p className="text-red-500 text-[10px] font-semibold mt-0.5">{fieldErrors.landmark}</p>}
          </div>
        </div>
      )}

      {/* STEP 2 FORM */}
      {step === 2 && (
        <div className="bg-surface dark:bg-[#17212B] p-4 border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Ish boshlanishi</label>
              <input
                type="time"
                value={workFrom}
                onChange={(e) => setWorkFrom(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-on-surface dark:text-slate-100 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Ish tugashi</label>
              <input
                type="time"
                value={workTo}
                onChange={(e) => setWorkTo(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-on-surface dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          {/* Badges Chips */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Xizmat xususiyatlari (Belgilar)</label>
            <div className="flex flex-wrap gap-1.5">
              {['Uyga boradi', 'Kafolat', '24/7', 'Karta', 'Zudlik', 'Ruscha'].map((badge) => {
                const hasBadge = badges.includes(badge);
                return (
                  <button
                    key={badge}
                    type="button"
                    onClick={() => {
                      if (hasBadge) setBadges(badges.filter(b => b !== badge));
                      else setBadges([...badges, badge]);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      hasBadge
                        ? 'bg-primary dark:bg-sky-500 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {badge}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Narxi (Taxminiy)</label>
            <input
              type="text"
              value={approxPrice}
              onChange={(e) => setApproxPrice(e.target.value)}
              placeholder="Masalan, 50,000 so'mdan boshlab"
              className="w-full bg-slate-50 dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-on-surface dark:text-slate-100 placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Tavsif / Izoh</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Xizmat haqida qo'shimcha ma'lumot kiriting..."
              className="w-full h-20 bg-slate-50 dark:bg-[#1C2733] border border-outline-variant/30 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-on-surface dark:text-slate-100 placeholder-slate-500 focus:outline-none resize-none"
            />
          </div>
        </div>
      )}

      {/* STEP 3 REVIEW & CONFIRM */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-surface dark:bg-[#17212B] p-4 border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
            <h3 className="font-bold text-xs text-slate-500 uppercase border-b pb-1">Kiritilgan Ma'lumotlarni Tekshirish</h3>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Ism:</span> <span className="font-bold text-on-surface dark:text-slate-100">{name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Kasb:</span> <span className="font-bold text-on-surface dark:text-slate-100">{category}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Telefon:</span> <span className="font-bold text-on-surface dark:text-slate-100">{phone}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Mo'ljal:</span> <span className="font-bold text-on-surface dark:text-slate-100">{primaryLandmark}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Ish vaqti:</span> <span className="font-bold text-on-surface dark:text-slate-100">{workFrom} - {workTo}</span></div>
              {approxPrice && <div className="flex justify-between"><span className="text-slate-500">Narx:</span> <span className="font-bold text-on-surface dark:text-slate-100">{approxPrice}</span></div>}
              {badges.length > 0 && <div className="flex flex-wrap gap-1 mt-1"><span className="text-slate-500 w-full mb-0.5">Xususiyatlar:</span> {badges.map(b => <span key={b} className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-semibold">{b}</span>)}</div>}
              {jargonWords.length > 0 && <div className="flex flex-wrap gap-1 mt-1"><span className="text-slate-500 w-full mb-0.5">Jargon so'zlar:</span> {jargonWords.map(w => <span key={w} className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-semibold">{w}</span>)}</div>}
            </div>
          </div>

          {/* Consent Checkbox */}
          <label className="flex items-start gap-2.5 p-3.5 bg-sky-500/10 border border-sky-500/20 rounded-2xl cursor-pointer">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary dark:bg-slate-800"
            />
            <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
              Ushbu usta yoki do'kon ma'lumotlarini bazada e'lon qilish bo'yicha ularning roziligi olindi. *
            </span>
          </label>
        </div>
      )}

      {/* FOOTER WIZARD ACTIONS */}
      <div className="flex items-center gap-3">
        {step > 1 && (
          <button
            onClick={handleBackStep}
            className="flex-1 py-3 bg-slate-200 dark:bg-slate-800 text-on-surface dark:text-slate-100 font-bold text-xs rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1"
          >
            Orqaga
          </button>
        )}
        
        {step < 3 ? (
          <button
            onClick={handleNextStep}
            className="flex-1 py-3 bg-gradient-to-r from-[#2AABEE] to-[#0088CC] text-white font-bold text-xs rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1 shadow-md shadow-blue-500/20"
          >
            Keyingi →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !consentGiven}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1 disabled:opacity-50 shadow-md shadow-emerald-500/20"
          >
            {isSubmitting ? 'Saqlanmoqda...' : 'Tasdiqlash & Saqlash'}
          </button>
        )}
      </div>

    </div>
  );
};
