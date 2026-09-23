import React, { useState, useEffect } from 'react';
import { avatarColorForName } from '../utils/avatarColor';
import { useFeedback } from '../context/FeedbackContext';
import { useAuth } from '../context/AuthContext';
import { MapView } from '../components/MapView';

interface LandmarkDetailScreenProps {
  landmarkId: string;
  landmarkName: string;
  onBack: () => void;
}

const IOS_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, sans-serif';
const HAIRLINE = '0.5px solid rgba(60,60,67,0.29)';

export const LandmarkDetailScreen: React.FC<LandmarkDetailScreenProps> = ({
  landmarkId,
  landmarkName,
  onBack,
}) => {
  const { showToast, confirm } = useFeedback();
  const { user } = useAuth();
  // AI-taklif backendda FAQAT SUPER_ADMIN'ga ruxsat etilgan — boshqa
  // rollar uchun tugma yashiriladi (avval doim ko'rinardi, bosilsa
  // 403 xatosi bilan duch kelinardi).
  const canSuggestAi = user?.role === 'SUPER_ADMIN';
  const [name, setName] = useState(landmarkName);
  const [synonyms, setSynonyms] = useState<string[]>([]);
  const [newSynonym, setNewSynonym] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [listingCount, setListingCount] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  // Xarita chegarasi (2026-09) — avval alohida "Mahalla chegaralari" ekrani
  // bor edi, lekin bir xil ma'lumot (manzil) ikki xil joyda tahrirlansa
  // chalkashlik keltirib chiqaradi — endi HAMMASI shu yerda, bitta joyda.
  const [boundary, setBoundary] = useState<[number, number][] | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [isSavingBoundary, setIsSavingBoundary] = useState(false);
  const [analytics, setAnalytics] = useState<{ totalListings: number; breakdown: { categoryName: string; count: number }[] } | null>(null);
  // Xarita bo'limi SODDA holatda faqat bitta qator (boshqa maydonlar
  // kabi) — bosilganda ochiladi. Aks holda har bir manzil ekranida
  // doim 260px xarita ko'rinib, ekranni band qilib turardi, garchi
  // ko'pchilik oddiy nuqta-manzillarda chegara umuman kerak bo'lmasa ham.
  const [mapExpanded, setMapExpanded] = useState(false);

  const fetchLandmarkDetails = async () => {
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const headers = { 'x-init-data': initData };
      const response = await fetch(`/api/admin/landmarks/${landmarkId}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setName(data.name || landmarkName);
        setSynonyms(data.synonyms || []);
        setListingCount(typeof data.listingCount === 'number' ? data.listingCount : null);
        setBoundary(Array.isArray(data.boundary) && data.boundary.length >= 3 ? data.boundary : null);
      } else {
        showToast("Manzil ma'lumotlarini yuklab bo'lmadi.", 'error');
      }
    } catch {
      showToast("Aloqa xatosi — manzil ma'lumotlari yuklanmadi.", 'error');
    }
  };

  useEffect(() => {
    fetchLandmarkDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landmarkId]);

  const handleAddSynonym = (raw?: string) => {
    const clean = (raw ?? newSynonym).trim().toLowerCase();
    if (clean && !synonyms.includes(clean)) {
      setSynonyms([...synonyms, clean]);
      if (!raw) setNewSynonym('');
    }
    setSuggestions((prev) => prev.filter((s) => s !== clean));
  };

  const handleSuggest = async () => {
    setIsSuggesting(true);
    setSuggestError(null);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const response = await fetch(`/api/admin/landmarks/${landmarkId}/suggest-synonyms`, {
        method: 'POST',
        headers: { 'x-init-data': initData },
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        const fresh = (data.suggestions || []).filter((s: string) => !synonyms.includes(s));
        setSuggestions(fresh);
        if (fresh.length === 0) setSuggestError("AI hozircha yangi variant taklif qilolmadi.");
      } else {
        setSuggestError(data.message || 'AI taklifi muvaffaqiyatsiz bo\'ldi.');
      }
    } catch {
      setSuggestError('Aloqa xatosi.');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const response = await fetch(`/api/admin/landmarks/${landmarkId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-init-data': initData,
        },
        body: JSON.stringify({
          name,
          synonyms,
        }),
      });
      if (response.ok) {
        onBack();
      } else {
        showToast("Saqlashda xatolik yuz berdi.", 'error');
      }
    } catch {
      showToast("Aloqa xatosi.", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: `"${name}" o'chirilsinmi?`,
      message: "Bu amalni ortga qaytarib bo'lmaydi.",
      confirmLabel: "O'chirish",
      destructive: true,
    });
    if (!ok) return;
    setIsDeleting(true);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const response = await fetch(`/api/admin/landmarks/${landmarkId}`, {
        method: 'DELETE',
        headers: { 'x-init-data': initData },
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        onBack();
      } else {
        showToast(data.message || "O'chirishda xatolik yuz berdi.", 'error');
      }
    } catch {
      showToast('Aloqa xatosi.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const startDrawing = () => {
    setDrawingPoints(boundary || []);
    setIsDrawing(true);
    setAnalytics(null);
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setDrawingPoints([]);
  };

  const saveBoundary = async () => {
    if (drawingPoints.length < 3) {
      showToast("Poligon kamida 3 ta nuqtadan iborat bo'lishi kerak", 'error');
      return;
    }
    setIsSavingBoundary(true);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch(`/api/admin/landmarks/${landmarkId}/boundary`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-init-data': initData },
        body: JSON.stringify({ boundary: drawingPoints }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showToast('Chegara saqlandi', 'success');
        setBoundary(drawingPoints);
        cancelDrawing();
      } else {
        showToast(data.message || 'Saqlashda xatolik yuz berdi.', 'error');
      }
    } catch {
      showToast('Aloqa xatosi.', 'error');
    } finally {
      setIsSavingBoundary(false);
    }
  };

  const clearBoundary = async () => {
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch(`/api/admin/landmarks/${landmarkId}/boundary`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-init-data': initData },
        body: JSON.stringify({ boundary: null }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showToast('Chegara olib tashlandi', 'success');
        setBoundary(null);
        cancelDrawing();
        setAnalytics(null);
      }
    } catch {
      showToast('Aloqa xatosi.', 'error');
    }
  };

  const loadAnalytics = async () => {
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch(`/api/admin/landmarks/${landmarkId}/analytics`, { headers: { 'x-init-data': initData } });
      const data = await res.json().catch(() => ({}));
      if (data.success) setAnalytics({ totalListings: data.totalListings, breakdown: data.breakdown });
    } catch {
      showToast('Aloqa xatosi.', 'error');
    }
  };

  const canDelete = listingCount === 0;

  return (
    <div className="animate-fade-in -mx-4 -mt-2 pb-10" style={{ fontFamily: IOS_FONT }}>
      {/* Nav bar */}
      <div className="px-4 pt-1 pb-2 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-0.5 text-[#007AFF] dark:text-[#0A84FF] text-[15px] font-normal -ml-1.5 active:opacity-40"
        >
          <span className="material-symbols-outlined text-[22px]">chevron_left</span>
          Manzillar
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="text-[15px] font-semibold text-[#007AFF] dark:text-[#0A84FF] active:opacity-40 disabled:opacity-40"
        >
          {isSaving ? 'Saqlanmoqda...' : 'Tayyor'}
        </button>
      </div>

      {/* Avatar header — Contacts-app style */}
      <div className="flex flex-col items-center gap-2 pt-2 pb-6">
        <span
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-white text-[28px] font-semibold shadow-sm"
          style={{ backgroundColor: avatarColorForName(name || '?') }}
        >
          {name.trim()[0]?.toUpperCase() || '?'}
        </span>
        <h1 className="text-[20px] font-semibold text-on-surface dark:text-white text-center px-6">{name}</h1>
        <p className="text-[13px] text-[#8E8E93]">
          {listingCount !== null ? `${listingCount} ta yozuv bog'langan` : 'Yuklanmoqda...'}
        </p>
      </div>

      <div className="px-4 space-y-6">
        {/* Guruh: Nomi */}
        <div>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] shadow-sm overflow-hidden">
            <div className="flex items-center px-3.5 py-2.5 gap-3">
              <span className="text-[15px] text-on-surface dark:text-white w-20 shrink-0">Nomi</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 bg-transparent text-[15px] text-[#8E8E93] focus:outline-none text-right"
              />
            </div>
          </div>
        </div>

        {/* Guruh: Mahalliy nomlari */}
        <div>
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="text-[13px] font-normal text-[#8E8E93] uppercase tracking-wide">Mahalliy nomlari</span>
            {canSuggestAi && (
              <button
                onClick={handleSuggest}
                disabled={isSuggesting}
                className="flex items-center gap-1 text-[13px] font-medium text-[#007AFF] dark:text-[#0A84FF] disabled:opacity-50 active:opacity-50"
              >
                <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                {isSuggesting ? 'So\'ralmoqda...' : 'AI taklif qilsin'}
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] shadow-sm overflow-hidden">
            <div className="px-3.5 py-3 flex flex-wrap gap-1.5">
              {synonyms.length === 0 && (
                <span className="text-[13px] text-[#8E8E93]">Hali mahalliy nom qo'shilmagan</span>
              )}
              {synonyms.map(syn => (
                <span
                  key={syn}
                  className="bg-[#007AFF]/10 dark:bg-[#0A84FF]/15 text-[#007AFF] dark:text-[#0A84FF] pl-3 pr-1.5 py-1 rounded-full text-[13px] font-medium flex items-center gap-1"
                >
                  {syn}
                  <button
                    onClick={() => setSynonyms(synonyms.filter(s => s !== syn))}
                    className="w-4 h-4 rounded-full bg-[#007AFF]/20 dark:bg-[#0A84FF]/25 flex items-center justify-center hover:bg-[#FF3B30] hover:text-white transition-colors"
                    aria-label={`${syn}ni o'chirish`}
                  >
                    <span className="material-symbols-outlined text-[11px] leading-none">close</span>
                  </button>
                </span>
              ))}
            </div>

            {suggestions.length > 0 && (
              <div className="px-3.5 py-3 flex flex-wrap gap-1.5" style={{ borderTop: HAIRLINE }}>
                {suggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => handleAddSynonym(s)}
                    className="flex items-center gap-1 pl-2 pr-2.5 py-1 rounded-full border border-dashed border-[#007AFF]/50 dark:border-[#0A84FF]/50 text-[#007AFF] dark:text-[#0A84FF] text-[13px] font-medium active:bg-[#007AFF]/5 dark:active:bg-[#0A84FF]/10"
                  >
                    <span className="material-symbols-outlined text-[13px]">add</span>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {suggestError && (
              <p className="px-3.5 pb-2.5 text-[12px] text-[#8E8E93]" style={{ borderTop: suggestions.length === 0 ? HAIRLINE : undefined, paddingTop: suggestions.length === 0 ? 10 : undefined }}>
                {suggestError}
              </p>
            )}

            <div className="flex items-center gap-2 px-3.5 py-2.5" style={{ borderTop: HAIRLINE }}>
              <span className="material-symbols-outlined text-[18px] text-[#8E8E93]">add_circle</span>
              <input
                type="text"
                value={newSynonym}
                onChange={(e) => setNewSynonym(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddSynonym(); }}
                placeholder="Yangi mahalliy nom qo'shish..."
                className="flex-1 bg-transparent text-[15px] text-on-surface dark:text-white placeholder:text-[#8E8E93] focus:outline-none"
              />
              <button
                onClick={() => handleAddSynonym()}
                disabled={!newSynonym.trim()}
                className="text-[#007AFF] dark:text-[#0A84FF] text-[13px] font-semibold disabled:opacity-30"
              >
                Qo'shish
              </button>
            </div>
          </div>
        </div>

        {/* Guruh: Xarita chegarasi (2026-09) — shu manzil bir vaqtning
            o'zida "mahalla" bo'lishi ham mumkin: xaritada chegara chizilsa,
            yangi yozuv qo'shishda "Xaritadan belgilash" shu chegara ichiga
            tushgan nuqtani AVTOMATIK shu manzilga bog'laydi, va guruhda
            "X da nima bor?" so'roviga bot shu manzildagi barcha yozuvlarni
            sanab beradi. SODDA holatda faqat bitta qator — xarita FAQAT
            bosilganda ochiladi (har doim 260px joy band qilib turmasin). */}
        <div>
          <div className="px-1 mb-1.5">
            <span className="text-[13px] font-normal text-[#8E8E93] uppercase tracking-wide">Xarita chegarasi</span>
          </div>

          <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] shadow-sm overflow-hidden">
            <button
              onClick={() => setMapExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 active:bg-[#F2F2F7] dark:active:bg-[#2C2C2E]"
            >
              <span className="text-[15px] text-on-surface dark:text-white flex items-center gap-1.5">
                {boundary ? (
                  <>Chegarasi bor <span className="text-ios-red text-[10px]">●</span></>
                ) : (
                  <span className="text-[#8E8E93]">Chegara belgilanmagan</span>
                )}
              </span>
              <span className="material-symbols-outlined text-[18px] text-[#8E8E93]">
                {mapExpanded ? 'expand_less' : 'chevron_right'}
              </span>
            </button>

            {mapExpanded && (
              <div className="p-2" style={{ borderTop: HAIRLINE }}>
                <MapView
                  height={260}
                  polygons={boundary && !isDrawing ? [{ id: landmarkId, name, points: boundary, color: 'red' }] : []}
                  drawingPoints={isDrawing ? drawingPoints : []}
                  onMapClick={isDrawing ? (lat, lng) => setDrawingPoints((prev) => [...prev, [lat, lng]]) : undefined}
                />

                {analytics && (
                  <div className="px-1.5 pt-2 pb-1">
                    <p className="text-[12px] text-[#8E8E93]">Jami: {analytics.totalListings} ta yozuv</p>
                    {analytics.breakdown.map((b) => (
                      <p key={b.categoryName} className="text-[12px] text-on-surface dark:text-white">— {b.categoryName}: {b.count}</p>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2 px-0.5 flex-wrap">
                  {!isDrawing ? (
                    <>
                      <button onClick={startDrawing} className="text-[13px] font-semibold text-[#007AFF] dark:text-[#0A84FF] active:opacity-50">
                        {boundary ? 'Chegarani tahrirlash' : 'Chegara chizish'}
                      </button>
                      {boundary && (
                        <button onClick={loadAnalytics} className="text-[13px] font-medium text-[#8E8E93] active:opacity-50">
                          Tahlil
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        onClick={saveBoundary}
                    disabled={isSavingBoundary || drawingPoints.length < 3}
                    className="text-[13px] font-semibold text-white bg-[#007AFF] dark:bg-[#0A84FF] rounded-full px-3 py-1.5 active:opacity-60 disabled:opacity-40"
                  >
                    {isSavingBoundary ? 'Saqlanmoqda...' : `Saqlash (${drawingPoints.length})`}
                  </button>
                  <button onClick={() => setDrawingPoints([])} className="text-[13px] font-medium text-[#8E8E93] active:opacity-50">
                    Tozalash
                  </button>
                  <button onClick={cancelDrawing} className="text-[13px] font-medium text-[#FF3B30] active:opacity-50">
                    Bekor qilish
                  </button>
                </>
              )}
              {boundary && !isDrawing && (
                <button onClick={clearBoundary} className="text-[13px] font-medium text-[#FF3B30] active:opacity-50">
                  Chegarani o'chirish
                </button>
              )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Destructive action — iOS "Delete Contact" pattern */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] shadow-sm overflow-hidden">
          <button
            onClick={handleDelete}
            disabled={isDeleting || !canDelete}
            className="w-full text-center py-3 text-[15px] font-normal text-[#FF3B30] active:bg-[#F2F2F7] dark:active:bg-[#2C2C2E] disabled:opacity-40 disabled:text-[#8E8E93]"
          >
            {isDeleting
              ? "O'chirilmoqda..."
              : canDelete
              ? "Manzilni o'chirish"
              : `O'chirish uchun avval ${listingCount} ta yozuvni ko'chiring`}
          </button>
        </div>
      </div>
    </div>
  );
};
