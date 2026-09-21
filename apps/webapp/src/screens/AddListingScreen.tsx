import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LandmarkPicker } from '../components/LandmarkPicker';
import { useFeedback } from '../context/FeedbackContext';
import { IosHeader } from '../components/ios/IosHeader';

export interface AddListingScreenProps {
  initialCategory?: string;
  onNavigateTab: (tab: 'home' | 'database' | 'add' | 'users' | 'more') => void;
}

// Turi tanlanganda yonidagi maydon shu turga mos nom bilan ochiladi
const CATEGORY_FIELD_LABEL: Record<string, string> = {
  USTA: 'Usta turi',
  DOKON_OBYEKT: "Do'kon turi",
  MUASSASA: 'Muassasa turi',
  TRANSPORT: 'Transport turi',
  ARENDA: 'Arenda turi',
  ZAPRAVKA: 'Zapravka turi',
};
const CATEGORY_FIELD_PLACEHOLDER: Record<string, string> = {
  USTA: 'Masalan, Santexnik',
  DOKON_OBYEKT: 'Masalan, Dorixona',
  MUASSASA: 'Masalan, Notarius',
  TRANSPORT: 'Masalan, Taksi',
  ARENDA: 'Masalan, Lesa',
  ZAPRAVKA: 'Masalan, Avtomobil Zapravkasi',
};
// "Nomi" maydoni — odam ismi (Usta) yoki shoxobcha nomi (Zapravka/Do'kon)
// bo'lishi mumkin, shunga qarab yorliq/namuna o'zgaradi.
const NAME_FIELD_LABEL: Record<string, string> = {
  ZAPRAVKA: 'Zapravka nomi',
};
const NAME_FIELD_PLACEHOLDER: Record<string, string> = {
  ZAPRAVKA: 'Masalan, Lukoil - Olmaliq 3',
};
const LISTING_TYPE_OPTIONS: { id: 'USTA' | 'DOKON_OBYEKT' | 'MUASSASA' | 'TRANSPORT' | 'ARENDA' | 'ZAPRAVKA'; label: string; icon: string }[] = [
  { id: 'USTA', label: 'Usta', icon: 'engineering' },
  { id: 'DOKON_OBYEKT', label: "Do'kon", icon: 'storefront' },
  { id: 'MUASSASA', label: 'Muassasa', icon: 'account_balance' },
  { id: 'TRANSPORT', label: 'Avtomobil', icon: 'directions_car' },
  { id: 'ARENDA', label: 'Arenda', icon: 'key' },
  { id: 'ZAPRAVKA', label: 'Zapravka', icon: 'local_gas_station' },
];

// Zapravkalar uchun yoqilg'i turi belgilar — boshqa turlarda ko'rinmaydi
// (2026-09, deep-TZ'da kelishilgan: "tanlanadigan maydon (badge kabi)").
const DEFAULT_BADGE_OPTIONS = [
  'Uyga boradi', 'Kafolat', '24/7', 'Karta', 'Zudlik', 'Ruscha',
  'Bepul yetkazib berish', 'Nasiya', 'Sertifikatlangan',
];
const ZAPRAVKA_BADGE_OPTIONS = ['Metan', 'Propan', 'AI-80', 'AI-91', 'AI-92', 'AI-95', 'Dizel', '24/7'];

export const AddListingScreen: React.FC<AddListingScreenProps> = ({
  initialCategory,
  onNavigateTab,
}) => {
  const { user } = useAuth();
  const { showToast } = useFeedback();

  // Wizard Step State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  // MUHIM (2026-09 topilgan xato, tuzatildi): "Turi" (listingType) boshqa
  // barcha maydonlardan farqli o'laroq localStorage'da SAQLANMAS edi. Natija:
  // sahifa biror sababdan (masalan deploy paytida webapp qayta yuklansa)
  // qayta ochilsa, "category" qoralamadan ("Avtomobil zapravkasi" kabi)
  // tiklanardi, lekin "listingType" standart 'USTA'ga qaytib qolardi — va
  // foydalanuvchi buni sezmasdan "Tasdiqlash"ni bossa, yozuv NOTO'G'RI
  // turda (USTA) saqlanardi, garchi kategoriyasi Zapravka bo'lsa ham. Endi
  // "Turi" ham saqlanadi/tiklanadi.
  const [listingType, setListingType] = useState<'USTA' | 'DOKON_OBYEKT' | 'MUASSASA' | 'TRANSPORT' | 'ARENDA' | 'ZAPRAVKA'>(
    () => (localStorage.getItem('draft_listingType') as any) || 'USTA'
  );

  // Form Fields State (Prefilled or restored from LocalStorage)
  const [name, setName] = useState(() => localStorage.getItem('draft_name') || '');
  const [category, setCategory] = useState(() => initialCategory || localStorage.getItem('draft_category') || '');
  const [phone, setPhone] = useState(() => localStorage.getItem('draft_phone') || '+998 ');
  const [primaryLandmark, setPrimaryLandmark] = useState(() => localStorage.getItem('draft_landmark') || '');
  const [primaryLandmarkId, setPrimaryLandmarkId] = useState(() => localStorage.getItem('draft_landmarkId') || '');
  const [jargonWords, setJargonWords] = useState<string[]>(() => {
    const saved = localStorage.getItem('draft_jargonWords');
    return saved ? JSON.parse(saved) : [];
  });
  const [newJargonWord, setNewJargonWord] = useState('');
  // Tanlangan kategoriyada bazada ALLAQACHON bor boshqa yozuvlarning
  // jargon so'zlari — taklif sifatida ko'rsatish uchun (2026-09, admin
  // so'roviga ko'ra qo'shildi). Hech qanday generativ AI emas — faqat
  // bazadagi haqiqiy so'zlar, shuning uchun 100% aniq.
  const [jargonSuggestions, setJargonSuggestions] = useState<{ phrase: string; count: number }[]>([]);

  const [workFrom, setWorkFrom] = useState(() => localStorage.getItem('draft_workFrom') || '08:00');
  const [workTo, setWorkTo] = useState(() => localStorage.getItem('draft_workTo') || '20:00');
  const [badges, setBadges] = useState<string[]>(() => {
    const saved = localStorage.getItem('draft_badges');
    return saved ? JSON.parse(saved) : ['Uyga boradi', 'Kafolat'];
  });
  const [mapUrl, setMapUrl] = useState(() => localStorage.getItem('draft_mapUrl') || '');
  const [serviceAreas] = useState<string[]>(() => {
    const saved = localStorage.getItem('draft_serviceAreas');
    return saved ? JSON.parse(saved) : ['3-mavze', '4-mavze'];
  });

  const [specificServices] = useState(() => localStorage.getItem('draft_specificServices') || '');
  const [approxPrice, setApproxPrice] = useState(() => localStorage.getItem('draft_approxPrice') || '');
  const [description, setDescription] = useState(() => localStorage.getItem('draft_description') || '');
  const [photoUrls, setPhotoUrls] = useState<string[]>(() => {
    const saved = localStorage.getItem('draft_photoUrls');
    return saved ? JSON.parse(saved) : [];
  });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const MAX_PHOTOS = 8;
  const [verification] = useState<'VERIFIED' | 'COMMUNITY_UNVERIFIED'>('COMMUNITY_UNVERIFIED');
  const [consentGiven, setConsentGiven] = useState(() => localStorage.getItem('draft_consentGiven') === 'true');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; category?: string; phone?: string; landmark?: string }>({});

  interface CategoryOption { name: string; objectType: string | null; group: string | null }
  const [categoryList, setCategoryList] = useState<CategoryOption[]>([
    { name: 'Gazavik', objectType: 'USTA', group: null },
    { name: 'Santexnik', objectType: 'USTA', group: null },
    { name: 'Elektrik', objectType: 'USTA', group: null },
    { name: 'Kafelchi', objectType: 'USTA', group: null },
    { name: 'Notarius', objectType: 'MUASSASA', group: null },
    { name: 'Duradgor', objectType: 'USTA', group: null },
    { name: 'Malyar', objectType: 'USTA', group: null },
    { name: 'Dorixona', objectType: 'DOKON_OBYEKT', group: null },
    { name: 'Avtoelektrik', objectType: 'USTA', group: null },
    { name: 'Taksi', objectType: 'TRANSPORT', group: null },
  ]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categoryPickerSearch, setCategoryPickerSearch] = useState('');

  useEffect(() => {
    fetch('/api/admin/categories')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const opts: CategoryOption[] = data.map((c: any) => ({ name: c.name, objectType: c.objectType || null, group: c.group || null }));
          setCategoryList(prev => {
            const merged = new Map(prev.map(c => [c.name, c]));
            for (const o of opts) merged.set(o.name, o);
            return Array.from(merged.values());
          });
        }
      })
      .catch(() => {});
  }, []);

  // Tanlangan Turi (Usta/Do'kon/Muassasa/Zapravka)ga ANIQ mos kasblarnigina
  // ko'rsatamiz. MUHIM (2026-09 topilgan xato, tuzatildi): avval
  // `objectType` belgilanmagan (null) kategoriyalar HAR DOIM, har qanday
  // turda ko'rinardi — bu yangi turlar uchun (masalan Zapravka) haqiqiy
  // "bardak" edi: hech narsa mos kelmasa emas, DOIM boshqa turlarning
  // (Arenda/Usta/Do'kon) aloqasiz eski kategoriyalari ham aralashib
  // ko'rinardi. Endi FAQAT aniq shu turga tegishli kategoriyalar
  // ko'rsatiladi; agar shu turda HALI umuman kategoriya bo'lmasa
  // (haqiqatan bo'sh holat), shundagina butun ro'yxat zaxira sifatida
  // ko'rsatiladi — hech narsa yo'qolib qolmasligi uchun.
  // Xavfsizlik to'ri: agar tanlangan "category" ning HAQIQIY turi (bazadagi
  // objectType) joriy "listingType"dan farq qilsa — masalan yuqoridagi
  // holatlardan biri sabab ("Turi" 'USTA'ga qaytib qolgan, lekin "category"
  // hali ham "Avtomobil zapravkasi" bo'lib qolgan) — "Turi"ni kategoriyaga
  // MOS holga avtomatik to'g'rilaymiz. Shu orqali "category" va "listingType"
  // hech qachon bir-biridan uzilib qolmaydi, hatto sabab boshqacha bo'lsa ham.
  useEffect(() => {
    if (!category) return;
    const match = categoryList.find(c => c.name === category);
    const validTypes = LISTING_TYPE_OPTIONS.map(o => o.id);
    if (match?.objectType && match.objectType !== listingType && (validTypes as string[]).includes(match.objectType)) {
      setListingType(match.objectType as typeof listingType);
    }
  }, [category, categoryList]);

  const categoryMatchesType = (c: CategoryOption) => c.objectType === listingType;
  const relevantCategories = categoryList.filter(categoryMatchesType);
  const baseCategoryPool = relevantCategories.length > 0 ? relevantCategories : categoryList;
  const searchedCategories = baseCategoryPool.filter(
    c => c.name.toLowerCase().includes(categoryPickerSearch.trim().toLowerCase())
  );
  const groupedCategoryOptions = searchedCategories.reduce<Record<string, CategoryOption[]>>((acc, c) => {
    const key = c.group || 'Boshqa';
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});
  const categoryPickerGroupOrder = Object.keys(groupedCategoryOptions).sort((a, b) => {
    if (a === 'Boshqa') return 1;
    if (b === 'Boshqa') return -1;
    return groupedCategoryOptions[b].length - groupedCategoryOptions[a].length;
  });

  // Save draft state
  useEffect(() => {
    localStorage.setItem('draft_listingType', listingType);
    localStorage.setItem('draft_name', name);
    localStorage.setItem('draft_category', category);
    localStorage.setItem('draft_phone', phone);
    localStorage.setItem('draft_landmark', primaryLandmark);
    localStorage.setItem('draft_landmarkId', primaryLandmarkId);
    localStorage.setItem('draft_jargonWords', JSON.stringify(jargonWords));
    localStorage.setItem('draft_workFrom', workFrom);
    localStorage.setItem('draft_workTo', workTo);
    localStorage.setItem('draft_badges', JSON.stringify(badges));
    localStorage.setItem('draft_serviceAreas', JSON.stringify(serviceAreas));
    localStorage.setItem('draft_specificServices', specificServices);
    localStorage.setItem('draft_approxPrice', approxPrice);
    localStorage.setItem('draft_description', description);
    localStorage.setItem('draft_consentGiven', String(consentGiven));
    localStorage.setItem('draft_photoUrls', JSON.stringify(photoUrls));
    localStorage.setItem('draft_mapUrl', mapUrl);
  }, [listingType, name, category, phone, primaryLandmark, primaryLandmarkId, jargonWords, workFrom, workTo, badges, serviceAreas, specificServices, approxPrice, description, consentGiven, photoUrls, mapUrl]);

  const handlePhotoFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPhotoUploadError(null);
    const initData = window.Telegram?.WebApp?.initData || '';
    setIsUploadingPhoto(true);
    try {
      for (const file of Array.from(files)) {
        if (photoUrls.length >= MAX_PHOTOS) {
          setPhotoUploadError(`Eng ko'pi bilan ${MAX_PHOTOS} ta rasm yuklash mumkin`);
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

  const handleAddJargonWord = () => {
    const clean = newJargonWord.trim().toLowerCase();
    if (clean && !jargonWords.includes(clean)) {
      setJargonWords([...jargonWords, clean]);
      setNewJargonWord('');
    }
  };

  const handleAddJargonSuggestion = (phrase: string) => {
    const clean = phrase.trim().toLowerCase();
    if (clean && !jargonWords.includes(clean)) {
      setJargonWords([...jargonWords, clean]);
    }
  };

  // Kategoriya tanlanganda/o'zgarganda — shu turdagi boshqa yozuvlarning
  // jargon so'zlarini bazadan olib, taklif sifatida ko'rsatadi.
  useEffect(() => {
    let active = true;
    const clean = category.trim();
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
  }, [category]);

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
      // Telefon raqam IXTIYORIY (barcha turlarda, Zapravka ham) — faqat admin
      // biror narsa yoza boshlagan-u, lekin to'liq kiritmagan bo'lsa (masalan
      // "+998 90 12" kabi yarim), noto'g'ri/chala format haqida ogohlantiramiz.
      // Butunlay bo'sh qoldirilsa (yoki faqat standart "+998 " prefiksi) — bu
      // "kiritmadim" degani, xatolik emas.
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length > 3 && cleanPhone.length < 9) errors.phone = "Telefon raqam to'liq emas";
      if (!primaryLandmarkId) errors.landmark = "Manzilni ro'yxatdan tanlash (yoki yangi qo'shish) majburiy";

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
      showToast("Iltimos, mijoz roziligini tasdiqlang!", 'error');
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
          landmarkId: primaryLandmarkId,
          landmarkName: primaryLandmark,
          workFrom,
          workTo,
          badges,
          verified: verification === 'VERIFIED',
          cityId: user?.cityId,
          addedByUserId: user?.id,
          consentGiven: true,
          consentDevice: navigator.userAgent || 'Unknown Mobile Device',
          // DIQQAT: mo'ljal (primaryLandmark) nomi ATAYIN bu yerga
          // qo'shilmaydi. Avval "primaryLandmark.toLowerCase()" ham shu
          // ro'yxatga avtomatik qo'shilardi — natijada landmark nomi tilga
          // olingan HAR QANDAY xabar (masalan "Raduga tomonlar tinchmi?"
          // kabi aloqasiz savol ham) "jargon moslik" sifatida eng yuqori
          // ustuvorlik bilan mos kelib, botni umuman aloqasiz suhbatlarga
          // xato javob berishga majbur qilardi. Landmark o'zining alohida,
          // xavfsizroq qidiruv yo'liga (fuzzyFindLandmark) ega — bu yerda
          // faqat admin ATAYIN kiritgan xalq atamalari (jargonWords) bo'lishi kerak.
          jargonSynonyms: Array.from(new Set(jargonWords)),
          approxPrice,
          specificServices,
          description,
          photoUrls,
          mapUrl: listingType === 'ZAPRAVKA' ? mapUrl.trim() : '',
        }),
      });

      if (res.ok) {
        // Clear drafts
        localStorage.removeItem('draft_listingType');
        localStorage.removeItem('draft_name');
        localStorage.removeItem('draft_category');
        localStorage.removeItem('draft_phone');
        localStorage.removeItem('draft_landmark');
        localStorage.removeItem('draft_landmarkId');
        localStorage.removeItem('draft_jargonWords');
        localStorage.removeItem('draft_workFrom');
        localStorage.removeItem('draft_workTo');
        localStorage.removeItem('draft_badges');
        localStorage.removeItem('draft_serviceAreas');
        localStorage.removeItem('draft_specificServices');
        localStorage.removeItem('draft_approxPrice');
        localStorage.removeItem('draft_description');
        localStorage.removeItem('draft_consentGiven');
        localStorage.removeItem('draft_photoUrls');
        localStorage.removeItem('draft_mapUrl');

        onNavigateTab('database');
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(`Xatolik: ${errData.message || 'Saqlashda xatolik yuz berdi'}`, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Aloqa xatoligi. Qoralama qurilmangizda saqlab qolindi.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in pb-16">

      {/* Header */}
      <IosHeader
        title="Yozuv qo'shish"
        trailing={
          <span className="text-[12px] text-ios-blue font-bold bg-ios-blue/10 px-2.5 py-1 rounded-full">
            {filledCount}/11
          </span>
        }
      />

      {/* Progress Wizard Steps (Visual apple style steps) */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-ios-fill/[0.12] rounded-ios-lg">
        {[
          { num: 1, label: 'Asosiy' },
          { num: 2, label: 'Belgilar' },
          { num: 3, label: 'Tasdiq' },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-1.5">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold transition-colors ${
                step === s.num
                  ? 'bg-ios-blue text-white'
                  : step > s.num
                  ? 'bg-ios-green text-white'
                  : 'bg-ios-fill/20 text-ios-label-secondary/70'
              }`}
            >
              {step > s.num ? '✓' : s.num}
            </span>
            <span className={`text-[12px] font-bold ${step === s.num ? 'text-ios-label' : 'text-ios-label-secondary/70'}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Duplicate Warning banner */}
      {duplicateWarning && (
        <div className="p-3 bg-ios-orange/10 rounded-ios-lg text-ios-orange text-[13px] font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">warning</span>
          <span>{duplicateWarning}</span>
        </div>
      )}

      {/* STEP 1 FORM */}
      {step === 1 && (
        <div className="bg-ios-card p-4 rounded-ios-lg shadow-sm space-y-4">
          {/* 1-qadam: Turi — to'rtta aniq, teng o'lchamli karta sifatida, ustma-ust
              tor ustunga siqilgan tugmalar o'rniga. Har biri ikonka + nom bilan,
              tanlangani darhol ko'zga tashlanadi. */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide">1. Turi *</label>
            <div className="grid grid-cols-2 gap-2">
              {LISTING_TYPE_OPTIONS.map((seg) => (
                <button
                  key={seg.id}
                  type="button"
                  onClick={() => {
                    setListingType(seg.id);
                    setCategory('');
                  }}
                  className={`flex items-center gap-2 px-3 py-3 rounded-ios border text-left transition-all ${
                    listingType === seg.id
                      ? 'bg-ios-blue/10 border-ios-blue text-ios-blue shadow-sm'
                      : 'bg-ios-fill/[0.12] border-transparent text-ios-label-secondary/70'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px] shrink-0">{seg.icon}</span>
                  <span className="text-[13px] font-bold truncate">{seg.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2-qadam: tanlangan Turiga mos kasb/soha. Bosilganda to'liq,
              guruhlangan ro'yxat bilan tanlash oynasi ochiladi — oldingi kichik
              tor ro'yxat o'rniga aniq va oson topiladigan qilib. */}
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide">2. {CATEGORY_FIELD_LABEL[listingType]} *</label>
            <button
              type="button"
              onClick={() => {
                setCategoryPickerSearch('');
                setShowCategoryPicker(true);
              }}
              className={`w-full bg-ios-fill/[0.12] border rounded-ios px-3 py-2.5 text-[13px] text-left flex items-center justify-between gap-2 focus:outline-none ${
                fieldErrors.category ? 'border-ios-red' : 'border-transparent'
              }`}
            >
              <span className={category ? 'text-ios-label font-semibold truncate' : 'text-ios-label-secondary/70 truncate'}>
                {category || CATEGORY_FIELD_PLACEHOLDER[listingType]}
              </span>
              <span className="material-symbols-outlined text-[16px] text-ios-label-secondary/70 shrink-0">expand_more</span>
            </button>
            {fieldErrors.category && <p className="text-ios-red text-[11px] font-semibold mt-0.5">{fieldErrors.category}</p>}
          </div>

          {/* KASB TANLASH OYNASI (to'liq ekran bosqichi) */}
          {showCategoryPicker && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
              <div className="bg-ios-card w-full sm:max-w-sm sm:rounded-ios-lg rounded-t-ios-lg shadow-2xl flex flex-col max-h-[85vh]">
                <div className="p-4 space-y-3 shrink-0" style={{ borderBottom: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[15px] text-ios-label">{CATEGORY_FIELD_LABEL[listingType]}ni tanlang</h3>
                    <button type="button" onClick={() => setShowCategoryPicker(false)} className="p-1 text-ios-label-secondary/70 active:opacity-50 rounded-full">
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-ios-label-secondary/70">search</span>
                    <input
                      type="text"
                      autoFocus
                      value={categoryPickerSearch}
                      onChange={(e) => setCategoryPickerSearch(e.target.value)}
                      placeholder="Qidirish..."
                      className="w-full bg-ios-fill/[0.12] border border-transparent rounded-ios pl-9 pr-3 py-2.5 text-[13px] text-ios-label outline-none"
                    />
                  </div>
                </div>

                <div className="overflow-y-auto flex-1 p-2">
                  {categoryPickerGroupOrder.length === 0 ? (
                    <p className="px-3 py-8 text-[13px] text-ios-label-secondary/70 text-center">Mos kasb topilmadi</p>
                  ) : (
                    categoryPickerGroupOrder.map((groupName) => (
                      <div key={groupName} className="mb-2">
                        <p className="px-3 pt-2 pb-1 text-[11px] font-bold text-ios-blue uppercase tracking-wider">
                          {groupName}
                        </p>
                        {groupedCategoryOptions[groupName].map((item) => (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => {
                              setCategory(item.name);
                              setFieldErrors(prev => ({ ...prev, category: undefined }));
                              setShowCategoryPicker(false);
                            }}
                            className={`w-full text-left px-3 py-2.5 rounded-ios text-[13px] font-semibold flex items-center justify-between ${
                              category === item.name
                                ? 'bg-ios-blue/10 text-ios-blue'
                                : 'active:bg-ios-fill/10 text-ios-label'
                            }`}
                          >
                            {item.name}
                            {category === item.name && <span className="material-symbols-outlined text-[16px]">check</span>}
                          </button>
                        ))}
                      </div>
                    ))
                  )}

                  {categoryPickerSearch.trim() && !categoryList.some(c => c.name.toLowerCase() === categoryPickerSearch.trim().toLowerCase()) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCategory(categoryPickerSearch.trim());
                        setFieldErrors(prev => ({ ...prev, category: undefined }));
                        setShowCategoryPicker(false);
                      }}
                      className="w-full text-left px-3 py-2.5 mt-1 rounded-ios text-[13px] font-bold text-ios-blue border border-dashed border-ios-blue/40 flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      "{categoryPickerSearch.trim()}" nomi bilan yangi kasb sifatida qo'shish
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide">3. {NAME_FIELD_LABEL[listingType] || 'Ismi-familiyasi'} *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldErrors(prev => ({ ...prev, name: undefined }));
              }}
              placeholder={NAME_FIELD_PLACEHOLDER[listingType] || 'Masalan, Anvar Usta'}
              className={`w-full bg-ios-fill/[0.12] border rounded-ios px-3 py-2.5 text-[13px] text-ios-label placeholder:text-ios-label-secondary/70 focus:outline-none ${
                fieldErrors.name ? 'border-ios-red' : 'border-transparent'
              }`}
            />
            {fieldErrors.name && <p className="text-ios-red text-[11px] font-semibold mt-0.5">{fieldErrors.name}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide">4. Jargon / xalq atamalari</label>
            <p className="text-[11px] text-ios-label-secondary/70 -mt-1">Mahalliy odamlar buni qanday nomlar bilan atashadi? (masalan: "trubkachi", "gazon"). Guruhda shu so'zlar bilan yozilsa, bot shu yozuvni topib javob beradi.</p>
            {jargonWords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {jargonWords.map(word => (
                  <span key={word} className="bg-ios-blue/10 text-ios-blue px-3 py-1 rounded-full text-[13px] font-bold flex items-center gap-1.5">
                    {word}
                    <button
                      type="button"
                      onClick={() => setJargonWords(jargonWords.filter(w => w !== word))}
                      className="active:opacity-50 text-[14px] leading-none"
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
                className="flex-1 bg-ios-fill/[0.12] border border-transparent rounded-ios px-3 py-2 text-[13px] text-ios-label placeholder:text-ios-label-secondary/70 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddJargonWord}
                className="bg-ios-blue text-white px-4 py-2 rounded-ios text-[13px] font-bold active:opacity-70"
              >
                Qo'shish
              </button>
            </div>

            {/* Bazadagi shu turdagi boshqa yozuvlarning jargon so'zlari —
                bosilsa darhol qo'shiladi. Faqat hali qo'shilmagan
                so'zlar ko'rsatiladi. */}
            {jargonSuggestions.filter((s) => !jargonWords.includes(s.phrase.toLowerCase())).length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1">
                <p className="text-[11px] text-ios-label-secondary/70">
                  💡 Bazada shu turdagi boshqa yozuvlarda ishlatilgan:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {jargonSuggestions
                    .filter((s) => !jargonWords.includes(s.phrase.toLowerCase()))
                    .map((s) => (
                      <button
                        key={s.phrase}
                        type="button"
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

          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide">5. Telefon raqami</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setFieldErrors(prev => ({ ...prev, phone: undefined }));
              }}
              placeholder="+998 90 123 45 67"
              className={`w-full bg-ios-fill/[0.12] border rounded-ios px-3 py-2.5 text-[13px] text-ios-label placeholder:text-ios-label-secondary/70 focus:outline-none ${
                fieldErrors.phone ? 'border-ios-red' : 'border-transparent'
              }`}
            />
            {fieldErrors.phone && <p className="text-ios-red text-[11px] font-semibold mt-0.5">{fieldErrors.phone}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide">6. Manzil *</label>
            <LandmarkPicker
              value={primaryLandmarkId || null}
              displayName={primaryLandmark}
              onChange={(id, landmarkName) => {
                setPrimaryLandmarkId(id);
                setPrimaryLandmark(landmarkName);
                setFieldErrors(prev => ({ ...prev, landmark: undefined }));
              }}
              error={fieldErrors.landmark}
            />
          </div>
        </div>
      )}

      {/* STEP 2 FORM */}
      {step === 2 && (
        <div className="bg-ios-card p-4 rounded-ios-lg shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide">Ish boshlanishi</label>
              <input
                type="time"
                value={workFrom}
                onChange={(e) => setWorkFrom(e.target.value)}
                className="w-full bg-ios-fill/[0.12] border border-transparent rounded-ios px-3 py-2 text-[13px] text-ios-label focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide">Ish tugashi</label>
              <input
                type="time"
                value={workTo}
                onChange={(e) => setWorkTo(e.target.value)}
                className="w-full bg-ios-fill/[0.12] border border-transparent rounded-ios px-3 py-2 text-[13px] text-ios-label focus:outline-none"
              />
            </div>
          </div>

          {/* Zapravkalar uchun: manzil havolasi (Yandex Xarita) */}
          {listingType === 'ZAPRAVKA' && (
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide">Xarita havolasi (Yandex)</label>
              <input
                type="text"
                value={mapUrl}
                onChange={(e) => setMapUrl(e.target.value)}
                onBlur={(e) => {
                  // Yandex Navigator/Xarita "Ulashish"da ko'pincha joy nomi
                  // + manzil + havola BIRGALIKDA nusxalanadi ("Gondra Petrol
                  // ул. Равнак, 2 https://..."). Bunday holatda tugma
                  // Telegram tomonidan rad etilib, BOT UMUMAN javob
                  // bermay qolishiga olib kelgan — shu sabab bu yerda
                  // maydondan chiqqanda faqat haqiqiy havola qismi ajratib
                  // qoldiriladi.
                  const match = e.target.value.match(/https?:\/\/\S+/);
                  if (match && match[0] !== e.target.value.trim()) setMapUrl(match[0]);
                }}
                placeholder="https://yandex.uz/maps/..."
                className="w-full bg-ios-fill/[0.12] border border-transparent rounded-ios px-3 py-2.5 text-[13px] text-ios-label placeholder:text-ios-label-secondary/70 focus:outline-none"
              />
              <p className="text-[11px] text-ios-label-secondary/70 mt-0.5">
                Yandex Xarita ilovasida joyni toping → "Ulashish" → havolani shu yerga joylashtiring. Bot javobida yashil "📍 Lokatsiya" tugmasi shu havolaga olib boradi.
              </p>
            </div>
          )}

          {/* Badges Chips — Elektr zaryadlash shoxobchasi uchun yoqilg'i
              turi (Metan/Propan/AI-.../Dizel) mos emas, shuning uchun
              umuman ko'rsatilmaydi (2026-09, kelishilgan qaror). */}
          {!(listingType === 'ZAPRAVKA' && /elektr|zaryad/i.test(category)) && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide">
              {listingType === 'ZAPRAVKA' ? "Yoqilg'i turi" : 'Xizmat xususiyatlari (Belgilar)'}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(listingType === 'ZAPRAVKA' ? ZAPRAVKA_BADGE_OPTIONS : DEFAULT_BADGE_OPTIONS).map((badge) => {
                const hasBadge = badges.includes(badge);
                return (
                  <button
                    key={badge}
                    type="button"
                    onClick={() => {
                      if (hasBadge) setBadges(badges.filter(b => b !== badge));
                      else setBadges([...badges, badge]);
                    }}
                    className={`px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
                      hasBadge
                        ? 'bg-ios-blue text-white shadow-sm'
                        : 'bg-ios-fill/[0.12] text-ios-label-secondary/70'
                    }`}
                  >
                    {badge}
                  </button>
                );
              })}
            </div>
          </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide">Narxi (Taxminiy)</label>
            <input
              type="text"
              value={approxPrice}
              onChange={(e) => setApproxPrice(e.target.value)}
              placeholder="Masalan, 50,000 so'mdan boshlab"
              className="w-full bg-ios-fill/[0.12] border border-transparent rounded-ios px-3 py-2.5 text-[13px] text-ios-label placeholder:text-ios-label-secondary/70 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide">Tavsif / Izoh</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Xizmat haqida qo'shimcha ma'lumot kiriting..."
              className="w-full h-20 bg-ios-fill/[0.12] border border-transparent rounded-ios px-3 py-2 text-[13px] text-ios-label placeholder:text-ios-label-secondary/70 focus:outline-none resize-none"
            />
          </div>

          {/* Rasmlar — masalan "uy arendaga" e'lonlari uchun bir nechta
              foto. Mos so'rov kelganda bot buni suriladigan albom qilib
              yuboradi. */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide">
              Rasmlar ({photoUrls.length}/{MAX_PHOTOS})
            </label>
            <p className="text-[11px] text-ios-label-secondary/70 -mt-1">
              Masalan uy/kvartira arendaga bo'lsa, rasmlarini shu yerga yuklang — mos so'rov kelganda bot ularni suriladigan albom qilib yuboradi.
            </p>

            {photoUrls.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photoUrls.map((url) => (
                  <div key={url} className="relative shrink-0 w-16 h-16 rounded-ios overflow-hidden">
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
              <label className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-ios border border-dashed border-ios-blue/40 text-ios-blue text-[13px] font-bold cursor-pointer">
                <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
                {isUploadingPhoto ? 'Yuklanmoqda...' : 'Rasm qo\'shish'}
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
            {photoUploadError && <p className="text-ios-red text-[11px] font-semibold">{photoUploadError}</p>}
          </div>
        </div>
      )}

      {/* STEP 3 REVIEW & CONFIRM */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-ios-card p-4 rounded-ios-lg shadow-sm space-y-3">
            <h3 className="font-semibold text-[13px] text-ios-label-secondary/70 uppercase pb-1" style={{ borderBottom: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}>Kiritilgan Ma'lumotlarni Tekshirish</h3>

            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="text-ios-label-secondary/70">Ism:</span> <span className="font-bold text-ios-label">{name}</span></div>
              <div className="flex justify-between"><span className="text-ios-label-secondary/70">Kasb:</span> <span className="font-bold text-ios-label">{category}</span></div>
              <div className="flex justify-between"><span className="text-ios-label-secondary/70">Telefon:</span> <span className="font-bold text-ios-label">{phone}</span></div>
              <div className="flex justify-between"><span className="text-ios-label-secondary/70">Manzil:</span> <span className="font-bold text-ios-label">{primaryLandmark}</span></div>
              {listingType === 'ZAPRAVKA' && (
                <div className="flex justify-between">
                  <span className="text-ios-label-secondary/70">Xarita havolasi:</span>
                  <span className={`font-bold ${mapUrl.trim() ? 'text-ios-label' : 'text-ios-orange'}`}>
                    {mapUrl.trim() ? "✓ qo'shilgan" : "⚠️ kiritilmagan"}
                  </span>
                </div>
              )}
              <div className="flex justify-between"><span className="text-ios-label-secondary/70">Ish vaqti:</span> <span className="font-bold text-ios-label">{workFrom} - {workTo}</span></div>
              {approxPrice && <div className="flex justify-between"><span className="text-ios-label-secondary/70">Narx:</span> <span className="font-bold text-ios-label">{approxPrice}</span></div>}
              {badges.length > 0 && <div className="flex flex-wrap gap-1 mt-1"><span className="text-ios-label-secondary/70 w-full mb-0.5">Xususiyatlar:</span> {badges.map(b => <span key={b} className="bg-ios-fill/[0.12] px-2 py-0.5 rounded text-[11px] font-semibold text-ios-label">{b}</span>)}</div>}
              {jargonWords.length > 0 && <div className="flex flex-wrap gap-1 mt-1"><span className="text-ios-label-secondary/70 w-full mb-0.5">Jargon so'zlar:</span> {jargonWords.map(w => <span key={w} className="bg-ios-fill/[0.12] px-2 py-0.5 rounded text-[11px] font-semibold text-ios-label">{w}</span>)}</div>}
              {photoUrls.length > 0 && <div className="flex justify-between"><span className="text-ios-label-secondary/70">Rasmlar:</span> <span className="font-bold text-ios-label">{photoUrls.length} ta</span></div>}
            </div>
          </div>

          {/* Consent Checkbox */}
          <label className="flex items-start gap-2.5 p-3.5 bg-ios-blue/10 rounded-ios-lg cursor-pointer">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-ios-blue focus:ring-ios-blue"
            />
            <span className="text-[12px] font-semibold text-ios-blue">
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
            className="flex-1 py-3 bg-ios-fill/[0.12] text-ios-label font-bold text-[13px] rounded-ios active:opacity-60 transition-all flex items-center justify-center gap-1"
          >
            Orqaga
          </button>
        )}

        {step < 3 ? (
          <button
            onClick={handleNextStep}
            className="flex-1 py-3 bg-ios-blue text-white font-bold text-[13px] rounded-ios active:opacity-70 transition-all flex items-center justify-center gap-1"
          >
            Keyingi →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !consentGiven}
            className="flex-1 py-3 bg-ios-green text-white font-bold text-[13px] rounded-ios active:opacity-70 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
          >
            {isSubmitting ? 'Saqlanmoqda...' : 'Tasdiqlash & Saqlash'}
          </button>
        )}
      </div>

    </div>
  );
};
