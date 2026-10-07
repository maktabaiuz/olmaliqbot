import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '../config';

interface LandmarkOption {
  id: string;
  name: string;
  synonyms: string[];
  listingCount?: number;
}

export interface LandmarkPickerProps {
  /** Hozir tanlangan mo'ljal ID'si (yoki null — hali tanlanmagan). */
  value: string | null;
  /** Tanlangan mo'ljalning ko'rsatiladigan nomi. */
  displayName?: string;
  onChange: (landmarkId: string, landmarkName: string) => void;
  error?: string;
}

const PLACEHOLDER_NAME = 'MFY tanlanmagan';

const norm = (s: string) => s.toLowerCase().replace(/[ʻʼ‘’`']/g, "'").trim();

/** Avtomatik qo'shilgan "X mahalla/mfy" shakllarisiz — faqat haqiqiy mahalliy jargonlar. */
function jargonOf(l: LandmarkOption): string[] {
  const base = norm(l.name.replace(/\s*MFY$/i, ''));
  const seen = new Set<string>();
  return l.synonyms.filter((s) => {
    const n = norm(s);
    if (!n || n === base || n === base.replace(/'/g, '') || /(mahalla|mahallasi|mfy)$/.test(n) || seen.has(n)) return false;
    seen.add(n);
    return true;
  });
}

/**
 * Mahalla (MFY) tanlash — maydonga bosilganda pastdan to'liq ro'yxat
 * ochiladi. Har bir mahalla yonida uning mahalliy jargonlari ko'rinadi
 * ("5/1", "korzinka"...), qidiruv jargon bo'yicha ham ishlaydi. Yangi
 * mo'ljal faqat hech narsa topilmaganda, ataylab qo'shiladi.
 */
export const LandmarkPicker: React.FC<LandmarkPickerProps> = ({ value, displayName, onChange, error }) => {
  const [all, setAll] = useState<LandmarkOption[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch('/api/admin/landmarks')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setAll(data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const selected = all.find((l) => l.id === value) || null;
  const selectedName = selected?.name || displayName || '';
  const isUnset = !selectedName || selectedName === PLACEHOLDER_NAME;

  const results = useMemo(() => {
    const q = norm(query);
    const list = all
      .filter((l) => l.name !== PLACEHOLDER_NAME)
      .map((l) => {
        const jargon = jargonOf(l);
        if (!q) return { l, jargon, hits: [] as string[], rank: 0 };
        const nameHit = norm(l.name).includes(q);
        const hits = jargon.filter((j) => norm(j).includes(q));
        if (!nameHit && hits.length === 0) return null;
        return { l, jargon, hits, rank: norm(l.name).startsWith(q) ? 0 : nameHit ? 1 : 2 };
      })
      .filter(Boolean) as { l: LandmarkOption; jargon: string[]; hits: string[]; rank: number }[];
    return list.sort((a, b) => a.rank - b.rank || a.l.name.localeCompare(b.l.name));
  }, [all, query]);

  const pick = (l: LandmarkOption) => {
    onChange(l.id, l.name);
    setOpen(false);
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
        setAll((prev) => [...prev, data.landmark]);
        pick(data.landmark);
      }
    } catch (err) {
      console.error('Failed to create landmark:', err);
    } finally {
      setCreating(false);
    }
  };

  const selectedJargon = selected ? jargonOf(selected) : [];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full text-left rounded-ios px-3 py-2.5 flex items-center gap-2.5 transition-colors active:bg-ios-fill/20 ${
          error ? 'bg-ios-red/10 ring-1 ring-ios-red' : isUnset ? 'bg-ios-blue/10' : 'bg-ios-fill/[0.12]'
        }`}
      >
        <span
          className={`material-symbols-outlined text-[20px] shrink-0 ${isUnset ? 'text-ios-blue' : 'text-ios-green'}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {isUnset ? 'add_location_alt' : 'location_on'}
        </span>
        <span className="flex-1 min-w-0">
          <span className={`block text-[15px] font-semibold truncate ${isUnset ? 'text-ios-blue' : 'text-ios-label'}`}>
            {isUnset ? 'Mahallani tanlang' : selectedName}
          </span>
          {!isUnset && selectedJargon.length > 0 && (
            <span className="block text-[12px] text-ios-label-secondary/80 truncate mt-0.5">
              {selectedJargon.slice(0, 4).join(' · ')}
            </span>
          )}
        </span>
        <span className="material-symbols-outlined text-[20px] text-ios-label-secondary/60 shrink-0">chevron_right</span>
      </button>
      {error && <p className="text-ios-red text-[11px] font-medium mt-1">{error}</p>}

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex flex-col justify-end" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/45" onClick={() => setOpen(false)} />
            <div
              className="relative bg-ios-bg rounded-t-[22px] max-w-container-max w-full mx-auto flex flex-col shadow-2xl"
              style={{ height: '88vh', animation: 'lpSlideUp .28s cubic-bezier(.2,.8,.2,1)' }}
            >
              <style>{`@keyframes lpSlideUp{from{transform:translateY(100%)}to{transform:none}}`}</style>
              <div className="pt-2 pb-1 flex justify-center">
                <span className="w-9 h-[5px] rounded-full bg-ios-label-secondary/30" />
              </div>
              <div className="px-4 pt-1 pb-3 flex items-center justify-between">
                <div>
                  <div className="text-[20px] font-bold text-ios-label">Mahallani tanlang</div>
                  <div className="text-[12px] text-ios-label-secondary/80">Nomi yoki mahalliy atamasi bo'yicha qidiring</div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full bg-ios-fill/20 flex items-center justify-center active:opacity-60"
                  aria-label="Yopish"
                >
                  <span className="material-symbols-outlined text-[18px] text-ios-label-secondary">close</span>
                </button>
              </div>
              <div className="px-4 pb-3">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-ios-label-secondary/70 pointer-events-none">
                    search
                  </span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Masalan: Kimyogar, 5/1, korzinka..."
                    className="w-full bg-ios-fill/[0.16] rounded-[12px] pl-9 pr-9 py-2.5 text-[16px] text-ios-label outline-none focus:ring-1 focus:ring-ios-blue"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-ios-label-secondary/70"
                      aria-label="Tozalash"
                    >
                      cancel
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-8 overscroll-contain">
                {all.length === 0 && <div className="text-center text-[14px] text-ios-label-secondary/70 py-10">Yuklanmoqda...</div>}
                <div className="flex flex-col gap-2">
                  {results.map(({ l, jargon, hits }) => {
                    const active = l.id === value;
                    const chips = hits.length ? [...hits, ...jargon.filter((j) => !hits.includes(j))] : jargon;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => pick(l)}
                        className={`w-full text-left rounded-[14px] px-3.5 py-3 transition-colors active:scale-[.99] ${
                          active ? 'bg-ios-blue/12' : 'bg-ios-card active:bg-ios-fill/10'
                        }`}
                        style={active ? { boxShadow: 'inset 0 0 0 1.5px rgb(var(--ios-blue))' } : undefined}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`material-symbols-outlined text-[20px] shrink-0 ${active ? 'text-ios-blue' : 'text-ios-label-secondary/60'}`}
                            style={{ fontVariationSettings: active ? "'FILL' 1" : undefined }}
                          >
                            {active ? 'check_circle' : 'location_on'}
                          </span>
                          <span className="flex-1 min-w-0 text-[15px] font-semibold text-ios-label truncate">{l.name}</span>
                          {typeof l.listingCount === 'number' && l.listingCount > 0 && (
                            <span className="text-[11px] font-semibold text-ios-label-secondary/80 bg-ios-fill/15 rounded-full px-2 py-0.5 shrink-0">
                              {l.listingCount} ta
                            </span>
                          )}
                        </div>
                        {chips.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 mt-2 pl-[30px]">
                            {chips.slice(0, 8).map((j) => (
                              <span
                                key={j}
                                className={`text-[12px] rounded-full px-2 py-[3px] ${
                                  hits.includes(j) ? 'bg-ios-orange/20 text-ios-orange font-semibold' : 'bg-ios-fill/15 text-ios-label-secondary'
                                }`}
                              >
                                {j}
                              </span>
                            ))}
                            {chips.length > 8 && <span className="text-[12px] text-ios-label-secondary/60 px-1 py-[3px]">+{chips.length - 8}</span>}
                          </div>
                        ) : (
                          <div className="text-[12px] text-ios-label-secondary/50 mt-1 pl-[30px]">Mahalliy atama qo'shilmagan</div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {query.trim() && results.length === 0 && all.length > 0 && (
                  <div className="text-center py-8">
                    <div className="text-[15px] font-semibold text-ios-label">"{query.trim()}" topilmadi</div>
                    <div className="text-[13px] text-ios-label-secondary/80 mt-1 mb-4">Boshqa nom yoki mahalliy atama bilan qidirib ko'ring</div>
                    <button
                      type="button"
                      onClick={createAndSelect}
                      disabled={creating}
                      className="text-[13px] font-semibold text-ios-blue bg-ios-blue/10 rounded-full px-4 py-2 active:opacity-60 disabled:opacity-50"
                    >
                      {creating ? "Qo'shilmoqda..." : `+ "${query.trim()}"ni yangi manzil sifatida qo'shish`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
