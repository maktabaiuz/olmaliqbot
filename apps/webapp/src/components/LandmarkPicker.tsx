import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../config';

interface LandmarkOption {
  id: string;
  name: string;
  synonyms: string[];
}

export interface LandmarkPickerProps {
  /** Hozir tanlangan mo'ljal ID'si (yoki null — hali tanlanmagan). */
  value: string | null;
  /** Tanlangan mo'ljalning ko'rsatiladigan nomi (input matnini boshlash uchun). */
  displayName?: string;
  onChange: (landmarkId: string, landmarkName: string) => void;
  error?: string;
}

/**
 * Mo'ljal — ERKIN MATN emas, balki bazadagi MAVJUD mo'ljallar ro'yxatidan
 * TANLASH orqali kiritiladi (2026-09 qaror: yangi ikkilanuvchi mo'ljallar
 * — "5/1", "5/1 dahasi", "5/1 dahasi blok c" kabi — tasodifan
 * ko'payib ketmasligi uchun). Qidiruv hech narsa topmasa, "+ Yangi mo'ljal
 * sifatida qo'shish" tugmasi chiqadi — shu bosilgandagina YANGI mo'ljal
 * ataylab, ochiq ko'z bilan yaratiladi.
 */
export const LandmarkPicker: React.FC<LandmarkPickerProps> = ({ value, displayName, onChange, error }) => {
  const [query, setQuery] = useState(displayName || '');
  const [allLandmarks, setAllLandmarks] = useState<LandmarkOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch('/api/admin/landmarks')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setAllLandmarks(data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setQuery(displayName || '');
  }, [displayName]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = allLandmarks.filter((l) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return l.name.toLowerCase().includes(q) || l.synonyms.some((s) => s.toLowerCase().includes(q));
  });

  const exactMatchExists = allLandmarks.some((l) => l.name.toLowerCase() === query.trim().toLowerCase());
  const selectedLandmark = allLandmarks.find((l) => l.id === value) || null;

  const selectLandmark = (l: LandmarkOption) => {
    onChange(l.id, l.name);
    setQuery(l.name);
    setIsOpen(false);
  };

  const createAndSelect = async () => {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await apiFetch('/api/admin/landmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAllLandmarks((prev) => [...prev, data.landmark]);
        selectLandmark(data.landmark);
      }
    } catch (err) {
      console.error('Failed to create landmark:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-ios-label-secondary/70 pointer-events-none">search</span>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            setIsOpen(true);
            // Matn tanlangan manzil nomidan farqli bo'lib qolsa (masalan admin
            // tanlangandan keyin ustidan qayta yoza boshlasa), eski ID'ni
            // darhol bekor qilamiz — aks holda ekranda ko'rinayotgan matn bilan
            // saqlanadigan manzil ID'si mos kelmay qoladi.
            if (!next.trim() || (selectedLandmark && next !== selectedLandmark.name)) {
              onChange('', next);
            }
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Manzilni qidiring..."
          className={`w-full bg-ios-fill/[0.12] rounded-ios pl-9 pr-3.5 py-2.5 text-[15px] text-ios-label outline-none transition-colors ${
            error ? 'ring-1 ring-ios-red' : 'focus:ring-1 focus:ring-ios-blue'
          }`}
        />
      </div>

      {isOpen && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-ios-card rounded-ios shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 && !query.trim() && (
            <div className="px-3.5 py-3 text-[13px] text-ios-label-secondary/70">Manzil nomini yozing...</div>
          )}
          {filtered.slice(0, 30).map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => selectLandmark(l)}
              className="w-full text-left px-3.5 py-2.5 text-[13px] font-medium text-ios-label active:bg-ios-fill/10 border-b-[0.5px] border-ios-separator/[0.29] last:border-b-0"
            >
              📍 {l.name}
              {l.synonyms.length > 0 && (
                <span className="text-[11px] text-ios-label-secondary/70 font-normal ml-1.5">({l.synonyms.join(', ')})</span>
              )}
            </button>
          ))}

          {query.trim() && !exactMatchExists && (
            <button
              type="button"
              onClick={createAndSelect}
              disabled={creating}
              className="w-full text-left px-3.5 py-2.5 text-[13px] font-semibold text-ios-blue active:bg-ios-blue/5 disabled:opacity-50"
            >
              {creating ? 'Qo\'shilmoqda...' : `+ "${query.trim()}"ni yangi manzil sifatida qo'shish`}
            </button>
          )}
        </div>
      )}

      {error && <p className="text-ios-red text-[11px] font-medium mt-0.5">{error}</p>}
      {!value && !error && (
        <p className="text-[11px] text-ios-label-secondary/70 mt-0.5">Ro'yxatdan tanlang, yoki topilmasa yangi qo'shing.</p>
      )}
    </div>
  );
};
