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
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400 pointer-events-none">search</span>
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
          className={`w-full bg-slate-100 dark:bg-[#1C2733] border rounded-full pl-9 pr-3.5 py-2.5 text-sm text-on-surface dark:text-slate-100 outline-none focus:border-primary transition-colors ${
            error ? 'border-red-500' : 'border-transparent focus:bg-surface dark:focus:bg-[#1C2733]'
          }`}
        />
      </div>

      {isOpen && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-surface dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-800 rounded-2xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 && !query.trim() && (
            <div className="px-3.5 py-3 text-xs text-slate-500">Manzil nomini yozing...</div>
          )}
          {filtered.slice(0, 30).map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => selectLandmark(l)}
              className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-on-surface dark:text-slate-100 hover:bg-surface-container-low dark:hover:bg-slate-800/60 border-b border-outline-variant/10 dark:border-slate-800 last:border-0"
            >
              📍 {l.name}
              {l.synonyms.length > 0 && (
                <span className="text-[10px] text-slate-500 font-normal ml-1.5">({l.synonyms.join(', ')})</span>
              )}
            </button>
          ))}

          {query.trim() && !exactMatchExists && (
            <button
              type="button"
              onClick={createAndSelect}
              disabled={creating}
              className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-primary dark:text-sky-400 hover:bg-primary/5 dark:hover:bg-sky-500/10 disabled:opacity-50"
            >
              {creating ? 'Qo\'shilmoqda...' : `+ "${query.trim()}"ni yangi manzil sifatida qo'shish`}
            </button>
          )}
        </div>
      )}

      {error && <p className="text-red-500 text-[10px] font-semibold mt-0.5">{error}</p>}
      {!value && !error && (
        <p className="text-[10px] text-slate-500 mt-0.5">Ro'yxatdan tanlang, yoki topilmasa yangi qo'shing.</p>
      )}
    </div>
  );
};
