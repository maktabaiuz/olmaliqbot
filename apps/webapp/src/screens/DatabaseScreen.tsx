import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NavTab } from '../components/BottomNav';
import { apiFetch } from '../config';
import { IosHeader } from '../components/ios/IosHeader';
import { IosSearchBar } from '../components/ios/IosSearchBar';
import { useFeedback } from '../context/FeedbackContext';
import { BottomSheet } from './rentals/shared';
import { LandmarkPicker } from '../components/LandmarkPicker';

/**
 * Baza (2026-10-08 qayta qurilgan). Bitta /admin/db/overview so'rovi —
 * yozuvlar, toifalar, statistika va muammolar. 15 soniyada va ekranga
 * qaytilganda jonli yangilanadi. Bo'limlar TOIFA turiga qarab (yozuvning
 * eskirgan o'z turiga emas) — shu sabab hech bir yozuv "yo'qolib" qolmaydi.
 */

type Section = 'USTA' | 'DOKON_OBYEKT' | 'MUASSASA' | 'TRANSPORT' | 'ARENDA' | 'ZAPRAVKA';
type View = 'sections' | 'problems' | 'archive' | 'categories';
type StatusFilter = 'all' | 'ACTIVE' | 'PAUSED' | 'pending' | 'verified';
type Sort = 'new' | 'az' | 'popular' | 'priority';

interface Item {
  id: string;
  name: string;
  phone: string;
  section: Section;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'INCOMPLETE';
  moderationStatus: string | null;
  verified: boolean;
  source: string;
  priorityRank: number | null;
  photo: string | null;
  createdAt: string;
  updatedAt: string;
  hours: string | null;
  categoryId: string | null;
  categoryName: string;
  categoryEmoji: string | null;
  landmarkName: string | null;
  search: string;
  shown30: number;
  shownAll: number;
  issues: string[];
}

interface Cat {
  id: string;
  name: string;
  emoji: string | null;
  objectType: Section | null;
  group: string | null;
  count: number;
}

const SECTIONS: { id: Section; label: string; icon: string; tint: string }[] = [
  { id: 'USTA', label: 'Ustalar', icon: 'handyman', tint: 'text-ios-blue bg-ios-blue/10' },
  { id: 'DOKON_OBYEKT', label: "Do'konlar", icon: 'storefront', tint: 'text-ios-orange bg-ios-orange/10' },
  { id: 'MUASSASA', label: 'Muassasalar', icon: 'restaurant', tint: 'text-ios-purple bg-ios-purple/10' },
  { id: 'TRANSPORT', label: 'Transport', icon: 'local_taxi', tint: 'text-ios-green bg-ios-green/10' },
  { id: 'ARENDA', label: 'Arenda', icon: 'key', tint: 'text-ios-red bg-ios-red/10' },
  { id: 'ZAPRAVKA', label: 'Zapravkalar', icon: 'local_gas_station', tint: 'text-ios-label bg-ios-fill/20' },
];
const SECTION_LABEL = Object.fromEntries(SECTIONS.map((s) => [s.id, s.label])) as Record<Section, string>;

// Toifaga emoji qo'yilmagan bo'lsa — nomiga qarab mavzuga mos belgi
const EMOJI_RULES: [RegExp, string][] = [
  [/zaprav|benzin|metan|propan/, '⛽'], [/zaryad/, '🔌'], [/fast|lavash|pizza|burger/, '🍔'], [/choyx/, '🫖'],
  [/restoran|kafe|oshxona|ovqat/, '🍽'], [/shirin|tort|konditer/, '🎂'], [/sug.?urta/, '🛡'], [/bank|moliya|buxgal/, '🏦'],
  [/advokat|yurist|notarius/, '⚖️'], [/maktab|repetitor|kurs|ta.?lim|bog.?cha/, '🎓'], [/dorixona|apteka/, '💊'],
  [/shifo|klinika|stomat|doktor|tibbiy/, '🩺'], [/taksi/, '🚕'], [/labo|yuk|gruz|evakuator/, '🚚'], [/to.?y|marosim|kortej/, '💐'],
  [/avto|moyka|shina|vulkan|diagnos|texosmotr|tuning|vakum/, '🚗'], [/santex/, '🚰'], [/elektr/, '⚡'], [/gaz/, '🔥'],
  [/kafel|g.?isht|beton|gipso|qurilish|tom /, '🧱'], [/malyar|bo.?yoq/, '🎨'], [/duradgor|mebel|eshik|deraza|akfa/, '🚪'],
  [/qulf|kalit|domofon/, '🔑'], [/kompyuter|internet|kamera|televizor|telefon|patalog/, '💻'], [/sartarosh|salon|go.?zallik|tahriyat/, '💇'],
  [/gilam|tozala|kimyoviy|kir yuv/, '🧺'], [/kvartira|arenda|ijara|uy/, '🏠'], [/do.?kon|magazin|savdo|metalom/, '🛒'],
  [/foto|video/, '📸'], [/fitnes|sport/, '🏋️'], [/mahal/, '🏘'], [/gul/, '💐'], [/hostel|mehmonxona/, '🛏'],
];
const EMOJI_CHOICES = ['🔧', '⚡', '🚰', '🔥', '🧱', '🎨', '🚪', '🔑', '💻', '🚗', '🚕', '🚚', '⛽', '🔌', '🍔', '🍽', '🫖', '🎂', '🛒', '💊', '🩺', '🎓', '⚖️', '🛡', '🏦', '💇', '🧺', '🏠', '📸', '💐', '🏋️', '🏘'];

function catEmoji(name: string, emoji?: string | null): string {
  if (emoji) return emoji;
  const n = name.toLowerCase();
  return EMOJI_RULES.find(([re]) => re.test(n))?.[1] || '📋';
}

const norm = (x: string) => x.toLowerCase().replace(/[’‘ʻʼ`´]/g, "'").replace(/\s+/g, ' ').trim();
const fold = (x: string) => norm(x).replace(/'/g, '');

const SOURCE: Record<string, { icon: string; label: string }> = {
  bot_chat: { icon: 'smart_toy', label: 'Bot' },
  webapp: { icon: 'smartphone', label: 'Ilova' },
  restored: { icon: 'history', label: 'Tiklangan' },
};

function relTime(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000);
  if (days <= 0) return 'bugun';
  if (days === 1) return 'kecha';
  if (days < 30) return `${days} kun oldin`;
  return `${Math.floor(days / 30)} oy oldin`;
}

function StatusPill({ it }: { it: Item }) {
  const [label, cls] =
    it.status === 'ARCHIVED' ? ['Arxivda', 'bg-ios-fill/20 text-ios-label-secondary']
    : it.moderationStatus === 'pending' ? ['Tekshiruvda', 'bg-ios-orange/15 text-ios-orange']
    : it.moderationStatus === 'rejected' ? ['Rad etilgan', 'bg-ios-red/15 text-ios-red']
    : it.status === 'PAUSED' ? ['Pauzada', 'bg-ios-fill/20 text-ios-label-secondary']
    : ['Faol', 'bg-ios-green/15 text-ios-green'];
  return <span className={`text-[11px] font-semibold rounded-full px-2 py-[2px] ${cls}`}>{label}</span>;
}

export interface DatabaseScreenProps {
  onNavigateTab: (tab: NavTab) => void;
  onSelectListing?: (listingId: string) => void;
  onAddToCategory?: (categoryName: string) => void;
}

export const DatabaseScreen: React.FC<DatabaseScreenProps> = ({ onNavigateTab, onSelectListing, onAddToCategory }) => {
  const { user } = useAuth();
  const { showToast } = useFeedback();
  const canSetPriority = user?.role === 'SUPER_ADMIN';

  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [sectionCounts, setSectionCounts] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const [view, setView] = useState<View>('sections');
  const [section, setSection] = useState<Section>('USTA');
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<Sort>('new');
  const [showEmpty, setShowEmpty] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [armArchive, setArmArchive] = useState<string | null>(null);
  const [sheet, setSheet] = useState<null | 'bulkLandmark' | 'bulkCategory' | 'catEdit'>(null);
  const [editCat, setEditCat] = useState<Cat | null>(null);

  // ---------- jonli ma'lumot ----------
  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/db/overview');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.listings || []);
      setCats(data.categories || []);
      setSectionCounts(data.sectionCounts || {});
      setLastSync(new Date());
      setLoadError(null);
    } catch (err) {
      console.error('Baza yuklanmadi:', err);
      setLoadError("Baza yuklanmadi — internet yoki server xatosi. Qayta urinilmoqda…");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 15000);
    const onVis = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [load]);

  useEffect(() => {
    if (!armArchive) return;
    const t = setTimeout(() => setArmArchive(null), 3000);
    return () => clearTimeout(t);
  }, [armArchive]);

  // ---------- hisoblangan ro'yxatlar ----------
  const live = useMemo(() => items.filter((i) => i.status !== 'ARCHIVED'), [items]);
  const archived = useMemo(() => items.filter((i) => i.status === 'ARCHIVED'), [items]);
  const problems = useMemo(() => live.filter((i) => i.issues.length > 0), [live]);

  const q = fold(query);
  const searching = q.length > 0;

  const visibleItems = useMemo(() => {
    let base: Item[] =
      view === 'archive' ? archived
      : view === 'problems' ? problems
      : searching ? live
      : selectedCat ? live.filter((i) => i.categoryId === selectedCat.id)
      : [];
    if (searching) {
      const digits = q.replace(/\D/g, '');
      base = base.filter((i) => fold(i.search).includes(q) || (digits.length >= 3 && i.phone.replace(/\D/g, '').includes(digits)));
    }
    if (view !== 'archive') {
      base = base.filter((i) =>
        statusFilter === 'all' ? true
        : statusFilter === 'pending' ? i.moderationStatus === 'pending'
        : statusFilter === 'verified' ? i.verified
        : i.status === statusFilter && i.moderationStatus !== 'pending'
      );
    }
    return [...base].sort((a, b) =>
      sort === 'az' ? a.name.localeCompare(b.name)
      : sort === 'popular' ? b.shown30 - a.shown30 || b.shownAll - a.shownAll
      : sort === 'priority' ? (a.priorityRank ?? 99) - (b.priorityRank ?? 99) || a.name.localeCompare(b.name)
      : b.createdAt.localeCompare(a.createdAt)
    );
  }, [view, archived, problems, live, searching, selectedCat, q, statusFilter, sort]);

  const sectionCats = useMemo(() => {
    const list = cats.filter((c) => (c.objectType || 'USTA') === section || (!c.objectType && live.some((i) => i.categoryId === c.id && i.section === section)));
    return (showEmpty ? list : list.filter((c) => c.count > 0)).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [cats, section, showEmpty, live]);
  const emptyInSection = cats.filter((c) => (c.objectType || 'USTA') === section && c.count === 0).length;

  const showingList = view === 'archive' || view === 'problems' || searching || !!selectedCat;

  // ---------- amallar ----------
  const post = async (url: string, body: object) => {
    const res = await apiFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) throw new Error(data.message || 'Xatolik');
    return data;
  };

  const setStatus = async (it: Item, status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED') => {
    const prev = items;
    setItems((p) => p.map((x) => (x.id === it.id ? { ...x, status } : x)));
    try {
      await post(`/api/admin/db/listings/${it.id}/status`, { status });
      showToast(status === 'ARCHIVED' ? 'Arxivga olindi — «Arxiv»dan qaytarish mumkin' : status === 'PAUSED' ? "To'xtatildi — botda ko'rinmaydi" : 'Yoqildi — botda ko\'rinadi', 'success');
      load();
    } catch (e: any) {
      setItems(prev);
      showToast(e.message, 'error');
    }
  };

  const bulk = async (action: string, value?: string) => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const r = await post('/api/admin/db/bulk', { ids: Array.from(selected), action, value });
      showToast(`${r.count} ta yozuv yangilandi`, 'success');
      setSelected(new Set());
      setSelectMode(false);
      setSheet(null);
      await load();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const setPriority = async (it: Item, rank: number | null) => {
    try {
      const res = await apiFetch(`/api/admin/listings/${it.id}/priority`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ priorityRank: rank }) });
      if (!res.ok) throw new Error();
      load();
    } catch {
      showToast("O'rinni belgilashda xato", 'error');
    }
  };

  const toggleSel = (id: string) =>
    setSelected((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  // ---------- ko'rinish ----------
  const title = selectedCat && !searching && view === 'sections' ? selectedCat.name : 'Baza';
  const subtitle =
    loadError ? loadError
    : !loaded ? 'Yuklanmoqda…'
    : `${live.length} ta yozuv · ${lastSync ? `jonli, ${lastSync.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}`;

  const tabs: { id: View; label: string; icon: string; badge?: number }[] = [
    { id: 'sections', label: "Bo'limlar", icon: 'grid_view' },
    { id: 'problems', label: 'Muammoli', icon: 'report', badge: problems.length },
    { id: 'archive', label: 'Arxiv', icon: 'inventory_2', badge: archived.length },
    { id: 'categories', label: 'Toifalar', icon: 'sell' },
  ];

  return (
    <div className="flex flex-col gap-3.5 animate-fade-in pb-28">
      <IosHeader
        title={title}
        subtitle={subtitle}
        onBack={selectedCat && !searching && view === 'sections' ? () => setSelectedCat(null) : undefined}
        trailing={
          <button
            onClick={() => (selectedCat && onAddToCategory ? onAddToCategory(selectedCat.name) : onNavigateTab('add'))}
            className="bg-ios-blue text-white px-3.5 py-1.5 rounded-full text-[13px] font-bold active:opacity-70 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            {selectedCat ? 'Shu toifaga' : "Qo'shish"}
          </button>
        }
      />

      {/* Ko'rinishlar */}
      <div className="grid grid-cols-4 gap-1 bg-ios-fill/[0.12] rounded-ios p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setView(t.id);
              setSelectedCat(null);
              setSelectMode(false);
              setSelected(new Set());
            }}
            className={`relative flex flex-col items-center gap-0.5 py-1.5 rounded-[9px] text-[11px] font-semibold transition-all ${
              view === t.id ? 'bg-ios-card text-ios-label shadow-sm' : 'text-ios-label-secondary/80'
            }`}
          >
            <span className="material-symbols-outlined text-[19px]">{t.icon}</span>
            {t.label}
            {!!t.badge && (
              <span className={`absolute top-0.5 right-1.5 min-w-[17px] h-[17px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${t.id === 'problems' ? 'bg-ios-orange' : 'bg-ios-label-secondary/70'}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {view !== 'categories' && <IosSearchBar value={query} onChange={setQuery} placeholder="Hamma bo'limdan: nom, kasb, telefon, mahalla…" />}

      {/* BO'LIMLAR */}
      {view === 'sections' && !selectedCat && !searching && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`flex flex-col items-start gap-1.5 p-2.5 rounded-ios border transition-all text-left ${
                  section === s.id ? 'bg-ios-blue/10 border-ios-blue' : 'bg-ios-card border-transparent'
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] w-8 h-8 rounded-[9px] flex items-center justify-center ${s.tint}`}>{s.icon}</span>
                <span className={`text-[13px] font-semibold leading-tight ${section === s.id ? 'text-ios-blue' : 'text-ios-label'}`}>{s.label}</span>
                <span className="text-[11px] text-ios-label-secondary/80 -mt-1">{sectionCounts[s.id] ?? 0} ta</span>
              </button>
            ))}
          </div>

          <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden">
            {sectionCats.length === 0 && (
              <div className="p-6 text-center text-[13px] text-ios-label-secondary/80">{loaded ? "Bu bo'limda hozircha yozuv yo'q" : 'Yuklanmoqda…'}</div>
            )}
            {sectionCats.map((c, idx) => (
              <button
                key={c.id}
                onClick={() => setSelectedCat(c)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 active:bg-ios-fill/10 text-left"
                style={idx ? { borderTop: '0.5px solid rgb(var(--ios-separator) / 0.29)' } : undefined}
              >
                <span className="w-9 h-9 rounded-[10px] bg-ios-fill/[0.14] flex items-center justify-center text-[20px] shrink-0">{catEmoji(c.name, c.emoji)}</span>
                <span className="flex-1 min-w-0 text-[15px] text-ios-label truncate">{c.name}</span>
                <span className={`text-[13px] font-semibold shrink-0 ${c.count ? 'text-ios-label' : 'text-ios-label-secondary/50'}`}>{c.count}</span>
                <span className="material-symbols-outlined text-[18px] text-ios-label-secondary/50 shrink-0">chevron_right</span>
              </button>
            ))}
          </div>
          {emptyInSection > 0 && (
            <button onClick={() => setShowEmpty((v) => !v)} className="self-center flex items-center gap-1 text-[12px] font-semibold text-ios-blue active:opacity-60">
              <span className="material-symbols-outlined text-[16px]">{showEmpty ? 'visibility_off' : 'visibility'}</span>
              {showEmpty ? "Bo'sh toifalarni yashirish" : `Bo'sh toifalar ham (${emptyInSection})`}
            </button>
          )}
        </>
      )}

      {/* YOZUVLAR RO'YXATI */}
      {showingList && view !== 'categories' && (
        <>
          {view === 'problems' && (
            <div className="bg-ios-orange/10 rounded-ios px-3.5 py-2.5 text-[12.5px] text-ios-label leading-snug">
              ⚠️ Bu yozuvlarda kamchilik bor — har birining ostida nima tuzatish kerakligi yozilgan. Bir nechtasini belgilab, mahallani birdaniga biriktirish mumkin.
            </div>
          )}
          {view === 'archive' && (
            <div className="bg-ios-fill/[0.12] rounded-ios px-3.5 py-2.5 text-[12.5px] text-ios-label-secondary leading-snug">
              🗄 O'chirilgan yozuvlar shu yerda saqlanadi — botda ko'rinmaydi. «Qaytarish» bilan istalgan payt tiklanadi.
            </div>
          )}

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4">
            {view !== 'archive' &&
              ([
                ['all', 'Hammasi'],
                ['ACTIVE', 'Faol'],
                ['PAUSED', 'Pauzada'],
                ['pending', 'Tekshiruvda'],
                ['verified', '✅ Tasdiqlangan'],
              ] as [StatusFilter, string][]).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setStatusFilter(id)}
                  className={`shrink-0 px-3 py-1 rounded-full text-[12px] font-semibold ${statusFilter === id ? 'bg-ios-blue text-white' : 'bg-ios-fill/[0.12] text-ios-label-secondary'}`}
                >
                  {label}
                </button>
              ))}
          </div>

          <div className="flex items-center justify-between -mt-1">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {([
                ['new', 'Yangi'],
                ['az', 'A–Z'],
                ['popular', "🔥 Ko'p so'ralgan"],
                ['priority', 'Ustuvorlik'],
              ] as [Sort, string][]).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setSort(id)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold ${sort === id ? 'bg-ios-label text-ios-card' : 'text-ios-label-secondary/80'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setSelectMode((v) => !v);
                setSelected(new Set());
              }}
              className="shrink-0 text-[13px] font-semibold text-ios-blue active:opacity-60 pl-2"
            >
              {selectMode ? 'Bekor' : 'Tanlash'}
            </button>
          </div>

          <div className="text-[12px] text-ios-label-secondary/80 -mt-1 px-1">{visibleItems.length} ta yozuv{searching && ' · barcha bo\'limlardan'}</div>

          <div className="flex flex-col gap-2">
            {visibleItems.length === 0 && (
              <div className="bg-ios-card rounded-ios p-8 text-center text-[13px] text-ios-label-secondary/80">
                {view === 'problems' ? '🎉 Muammoli yozuv yo\'q' : view === 'archive' ? 'Arxiv bo\'sh' : 'Hech narsa topilmadi'}
              </div>
            )}
            {visibleItems.map((it) => {
              const isSel = selected.has(it.id);
              const src = SOURCE[it.source];
              return (
                <div
                  key={it.id}
                  className={`bg-ios-card rounded-ios shadow-sm overflow-hidden transition-all ${isSel ? 'ring-2 ring-ios-blue' : ''} ${it.status !== 'ACTIVE' ? 'opacity-[.82]' : ''}`}
                >
                  <button
                    className="w-full flex items-start gap-3 p-3 text-left active:bg-ios-fill/10"
                    onClick={() => (selectMode ? toggleSel(it.id) : onSelectListing?.(it.id))}
                  >
                    {selectMode && (
                      <span className={`material-symbols-outlined text-[22px] mt-2 shrink-0 ${isSel ? 'text-ios-blue' : 'text-ios-label-secondary/50'}`} style={isSel ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                        {isSel ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                    )}
                    {it.photo ? (
                      <img src={it.photo} alt="" className="w-12 h-12 rounded-[11px] object-cover shrink-0 bg-ios-fill/20" loading="lazy" />
                    ) : (
                      <span className="w-12 h-12 rounded-[11px] bg-ios-fill/[0.14] flex items-center justify-center text-[24px] shrink-0">{catEmoji(it.categoryName, it.categoryEmoji)}</span>
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[15px] font-semibold text-ios-label truncate">{it.name}</span>
                        {it.verified && <span className="material-symbols-outlined text-[15px] text-ios-blue shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>}
                        {it.priorityRank && <span className="text-[10px] font-bold text-white bg-ios-orange rounded-full px-1.5 shrink-0">{it.priorityRank}-o'rin</span>}
                      </span>
                      <span className="block text-[12.5px] text-ios-label-secondary truncate mt-0.5">
                        {it.categoryName}
                        {searching && ` · ${SECTION_LABEL[it.section]}`}
                        {it.landmarkName ? ` · 📍 ${it.landmarkName}` : ''}
                      </span>
                      <span className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <StatusPill it={it} />
                        <span className="text-[11px] text-ios-label-secondary/80 flex items-center gap-0.5" title="Oxirgi 30 kunda botda ko'rsatildi">
                          <span className="material-symbols-outlined text-[13px]">visibility</span>
                          {it.shown30}
                        </span>
                        {src && (
                          <span className="text-[11px] text-ios-label-secondary/80 flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[13px]">{src.icon}</span>
                            {src.label}
                          </span>
                        )}
                        <span className="text-[11px] text-ios-label-secondary/60">{relTime(it.updatedAt)}</span>
                      </span>
                      {it.issues.length > 0 && view !== 'archive' && (
                        <span className="block mt-1.5 text-[11.5px] text-ios-orange leading-snug">⚠️ {it.issues.join(' · ')}</span>
                      )}
                    </span>
                  </button>

                  {!selectMode && (
                    <div className="flex items-stretch border-t-[0.5px] border-ios-separator/[0.29] text-[12px] font-semibold">
                      <a href={`tel:${it.phone.replace(/[^\d+]/g, '')}`} className="flex-1 flex items-center justify-center gap-1 py-2 text-ios-green active:bg-ios-fill/10">
                        <span className="material-symbols-outlined text-[17px]">call</span>Qo'ng'iroq
                      </a>
                      <button onClick={() => onSelectListing?.(it.id)} className="flex-1 flex items-center justify-center gap-1 py-2 text-ios-blue active:bg-ios-fill/10">
                        <span className="material-symbols-outlined text-[17px]">edit</span>Tahrirlash
                      </button>
                      {it.status === 'ARCHIVED' ? (
                        <button onClick={() => setStatus(it, 'ACTIVE')} className="flex-1 flex items-center justify-center gap-1 py-2 text-ios-green active:bg-ios-fill/10">
                          <span className="material-symbols-outlined text-[17px]">restore</span>Qaytarish
                        </button>
                      ) : (
                        <>
                          {it.moderationStatus !== 'pending' && (
                            <button
                              onClick={() => setStatus(it, it.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')}
                              className={`flex-1 flex items-center justify-center gap-1 py-2 active:bg-ios-fill/10 ${it.status === 'ACTIVE' ? 'text-ios-label-secondary' : 'text-ios-green'}`}
                            >
                              <span className="material-symbols-outlined text-[17px]">{it.status === 'ACTIVE' ? 'pause_circle' : 'play_circle'}</span>
                              {it.status === 'ACTIVE' ? "To'xtatish" : 'Yoqish'}
                            </button>
                          )}
                          <button
                            onClick={() => (armArchive === it.id ? (setArmArchive(null), setStatus(it, 'ARCHIVED')) : setArmArchive(it.id))}
                            className={`flex-1 flex items-center justify-center gap-1 py-2 active:bg-ios-fill/10 ${armArchive === it.id ? 'bg-ios-red text-white' : 'text-ios-red'}`}
                          >
                            <span className="material-symbols-outlined text-[17px]">inventory_2</span>
                            {armArchive === it.id ? 'Tasdiqlang' : 'Arxiv'}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {!selectMode && canSetPriority && sort === 'priority' && it.status === 'ACTIVE' && (
                    <div className="flex items-center gap-1.5 px-3 pb-2.5 text-[11px]">
                      <span className="text-ios-label-secondary/80 mr-1">O'rin:</span>
                      {[1, 2, 3].map((r) => (
                        <button key={r} onClick={() => setPriority(it, it.priorityRank === r ? null : r)} className={`w-7 h-6 rounded-full font-bold ${it.priorityRank === r ? 'bg-ios-orange text-white' : 'bg-ios-fill/[0.14] text-ios-label-secondary'}`}>
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* TOIFALAR BOSHQARUVI */}
      {view === 'categories' && (
        <CategoriesManager
          cats={cats}
          onEdit={(c) => {
            setEditCat(c);
            setSheet('catEdit');
          }}
        />
      )}

      {/* Ommaviy amallar paneli */}
      {selectMode && (
        <div className="fixed left-0 right-0 bottom-[68px] z-40 px-3">
          <div className="max-w-container-max mx-auto bg-ios-card/95 backdrop-blur-xl rounded-ios-lg shadow-2xl p-2.5">
            <div className="flex items-center justify-between px-1 pb-2">
              <span className="text-[13px] font-semibold text-ios-label">{selected.size} ta tanlandi</span>
              <button
                className="text-[12px] font-semibold text-ios-blue"
                onClick={() => setSelected(selected.size === visibleItems.length ? new Set() : new Set(visibleItems.map((i) => i.id)))}
              >
                {selected.size === visibleItems.length && visibleItems.length > 0 ? 'Hech birini' : 'Hammasini'}
              </button>
            </div>
            <div className="grid grid-cols-5 gap-1 text-[10.5px] font-semibold">
              {(view === 'archive'
                ? [{ a: 'activate', icon: 'restore', label: 'Qaytarish', cls: 'text-ios-green' }]
                : [
                    { a: 'sheet:bulkLandmark', icon: 'location_on', label: 'Mahalla', cls: 'text-ios-blue' },
                    { a: 'sheet:bulkCategory', icon: 'drive_file_move', label: 'Toifa', cls: 'text-ios-purple' },
                    { a: 'pause', icon: 'pause_circle', label: "To'xtatish", cls: 'text-ios-label-secondary' },
                    { a: 'activate', icon: 'play_circle', label: 'Yoqish', cls: 'text-ios-green' },
                    { a: 'archive', icon: 'inventory_2', label: 'Arxiv', cls: 'text-ios-red' },
                  ]
              ).map((b) => (
                <button
                  key={b.a}
                  disabled={busy || selected.size === 0}
                  onClick={() => (b.a.startsWith('sheet:') ? setSheet(b.a.slice(6) as any) : bulk(b.a))}
                  className={`flex flex-col items-center gap-0.5 py-1.5 rounded-[10px] active:bg-ios-fill/15 disabled:opacity-40 ${b.cls}`}
                >
                  <span className="material-symbols-outlined text-[21px]">{b.icon}</span>
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <BottomSheet open={sheet === 'bulkLandmark'} onClose={() => setSheet(null)} title={`${selected.size} ta yozuvga mahalla`}>
        <p className="text-[13px] text-ios-label-secondary mb-3">Tanlangan mahalla barcha belgilangan yozuvlarga biriktiriladi.</p>
        <LandmarkPicker value={null} onChange={(id) => id && bulk('setLandmark', id)} />
      </BottomSheet>

      <BottomSheet open={sheet === 'bulkCategory'} onClose={() => setSheet(null)} title={`${selected.size} ta yozuvni ko'chirish`}>
        <CategoryPickList cats={cats} onPick={(c) => bulk('setCategory', c.id)} />
      </BottomSheet>

      <BottomSheet open={sheet === 'catEdit' && !!editCat} onClose={() => setSheet(null)} title="Toifani tahrirlash">
        {editCat && (
          <CategoryEditor
            cat={editCat}
            cats={cats}
            onDone={async (msg) => {
              setSheet(null);
              showToast(msg, 'success');
              await load();
            }}
            onError={(m) => showToast(m, 'error')}
          />
        )}
      </BottomSheet>
    </div>
  );
};

// ---------------------------------------------------------------- toifalar

const CategoriesManager: React.FC<{ cats: Cat[]; onEdit: (c: Cat) => void }> = ({ cats, onEdit }) => {
  const [q, setQ] = useState('');
  const [onlyEmpty, setOnlyEmpty] = useState(false);
  const dupKeys = useMemo(() => {
    const m = new Map<string, number>();
    cats.forEach((c) => m.set(fold(c.name), (m.get(fold(c.name)) || 0) + 1));
    return m;
  }, [cats]);
  const list = cats
    .filter((c) => (!q || fold(c.name).includes(fold(q))) && (!onlyEmpty || c.count === 0))
    .sort((a, b) => (dupKeys.get(fold(b.name))! > 1 ? 1 : 0) - (dupKeys.get(fold(a.name))! > 1 ? 1 : 0) || b.count - a.count);
  const dupCount = cats.filter((c) => (dupKeys.get(fold(c.name)) || 0) > 1).length;
  const noType = cats.filter((c) => !c.objectType).length;
  return (
    <>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ['Jami', cats.length, 'text-ios-label'],
          ['Ikkilangan', dupCount, dupCount ? 'text-ios-red' : 'text-ios-label'],
          ["Turi yo'q", noType, noType ? 'text-ios-orange' : 'text-ios-label'],
        ].map(([l, n, c]) => (
          <div key={l as string} className="bg-ios-card rounded-ios py-2.5">
            <div className={`text-[20px] font-bold ${c}`}>{n as number}</div>
            <div className="text-[11px] text-ios-label-secondary">{l as string}</div>
          </div>
        ))}
      </div>
      <IosSearchBar value={q} onChange={setQ} placeholder="Toifa nomi…" />
      <button onClick={() => setOnlyEmpty((v) => !v)} className={`self-start px-3 py-1 rounded-full text-[12px] font-semibold ${onlyEmpty ? 'bg-ios-blue text-white' : 'bg-ios-fill/[0.12] text-ios-label-secondary'}`}>
        Faqat bo'shlari ({cats.filter((c) => c.count === 0).length})
      </button>
      <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden">
        {list.map((c, idx) => (
          <button
            key={c.id}
            onClick={() => onEdit(c)}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 active:bg-ios-fill/10 text-left"
            style={idx ? { borderTop: '0.5px solid rgb(var(--ios-separator) / 0.29)' } : undefined}
          >
            <span className="w-9 h-9 rounded-[10px] bg-ios-fill/[0.14] flex items-center justify-center text-[20px] shrink-0">{catEmoji(c.name, c.emoji)}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] text-ios-label truncate">{c.name}</span>
              <span className="block text-[11.5px] text-ios-label-secondary/80">
                {c.objectType ? SECTION_LABEL[c.objectType] : <span className="text-ios-orange">Turi belgilanmagan</span>}
                {(dupKeys.get(fold(c.name)) || 0) > 1 && <span className="text-ios-red"> · ikkilangan</span>}
              </span>
            </span>
            <span className={`text-[13px] font-semibold ${c.count ? 'text-ios-label' : 'text-ios-label-secondary/50'}`}>{c.count}</span>
            <span className="material-symbols-outlined text-[18px] text-ios-label-secondary/50">edit</span>
          </button>
        ))}
      </div>
    </>
  );
};

const CategoryPickList: React.FC<{ cats: Cat[]; onPick: (c: Cat) => void; exclude?: string }> = ({ cats, onPick, exclude }) => {
  const [q, setQ] = useState('');
  const list = cats.filter((c) => c.id !== exclude && (!q || fold(c.name).includes(fold(q))));
  return (
    <div className="flex flex-col gap-2">
      <IosSearchBar value={q} onChange={setQ} placeholder="Toifa qidirish…" />
      <div className="bg-ios-card rounded-ios overflow-hidden max-h-[52vh] overflow-y-auto">
        {list.map((c, idx) => (
          <button
            key={c.id}
            onClick={() => onPick(c)}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 active:bg-ios-fill/10 text-left"
            style={idx ? { borderTop: '0.5px solid rgb(var(--ios-separator) / 0.29)' } : undefined}
          >
            <span className="text-[20px]">{catEmoji(c.name, c.emoji)}</span>
            <span className="flex-1 text-[15px] text-ios-label truncate">{c.name}</span>
            <span className="text-[12px] text-ios-label-secondary">{c.objectType ? SECTION_LABEL[c.objectType] : ''} · {c.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const CategoryEditor: React.FC<{ cat: Cat; cats: Cat[]; onDone: (msg: string) => void; onError: (m: string) => void }> = ({ cat, cats, onDone, onError }) => {
  const [name, setName] = useState(cat.name);
  const [emoji, setEmoji] = useState(cat.emoji || '');
  const [type, setType] = useState<Section | ''>(cat.objectType || '');
  const [merging, setMerging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [armDelete, setArmDelete] = useState(false);
  const mounted = useRef(true);
  useEffect(() => () => {
    mounted.current = false;
  }, []);

  const call = async (url: string, method: string, body?: object) => {
    const res = await apiFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) throw new Error(data.message || 'Xatolik');
    return data;
  };

  const save = async () => {
    setBusy(true);
    try {
      await call(`/api/admin/db/categories/${cat.id}`, 'PUT', { name, emoji, ...(type ? { objectType: type } : {}) });
      onDone(type && type !== cat.objectType ? `Saqlandi — ${cat.count} ta yozuv «${SECTION_LABEL[type]}» bo'limiga o'tdi` : 'Saqlandi');
    } catch (e: any) {
      onError(e.message);
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  if (merging) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-ios-label-secondary">
          «{cat.name}» ({cat.count} ta yozuv) qaysi toifaga qo'shilsin? Yozuvlar ko'chadi, «{cat.name}» nomi sinonim sifatida saqlanadi (botda shu so'z bilan ham topiladi).
        </p>
        <CategoryPickList
          cats={cats}
          exclude={cat.id}
          onPick={async (into) => {
            try {
              const r = await call(`/api/admin/db/categories/${cat.id}/merge`, 'POST', { intoId: into.id });
              onDone(`Birlashtirildi: ${r.moved} ta yozuv «${into.name}»ga o'tdi`);
            } catch (e: any) {
              onError(e.message);
            }
          }}
        />
        <button onClick={() => setMerging(false)} className="text-[14px] font-semibold text-ios-blue py-2">Orqaga</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="w-14 h-14 rounded-[14px] bg-ios-fill/[0.14] flex items-center justify-center text-[30px]">{catEmoji(name, emoji)}</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-ios-card rounded-ios px-3.5 py-3 text-[16px] text-ios-label outline-none focus:ring-1 focus:ring-ios-blue"
        />
      </div>
      <div>
        <div className="text-[12px] font-semibold text-ios-label-secondary uppercase tracking-wide mb-1.5">Ikonka</div>
        <div className="grid grid-cols-8 gap-1.5">
          {EMOJI_CHOICES.map((e) => (
            <button key={e} onClick={() => setEmoji(e)} className={`h-10 rounded-[10px] text-[20px] ${emoji === e ? 'bg-ios-blue/20 ring-1 ring-ios-blue' : 'bg-ios-card'}`}>
              {e}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[12px] font-semibold text-ios-label-secondary uppercase tracking-wide mb-1.5">Qaysi bo'limda turadi</div>
        <div className="grid grid-cols-3 gap-1.5">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setType(s.id)}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-[10px] text-[13px] font-semibold ${type === s.id ? 'bg-ios-blue text-white' : 'bg-ios-card text-ios-label'}`}
            >
              <span className="material-symbols-outlined text-[17px]">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <button disabled={busy || name.trim().length < 2} onClick={save} className="bg-ios-blue text-white rounded-ios py-3 text-[16px] font-semibold active:opacity-80 disabled:opacity-40">
        {busy ? 'Saqlanmoqda…' : 'Saqlash'}
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setMerging(true)} className="bg-ios-card rounded-ios py-2.5 text-[14px] font-semibold text-ios-purple flex items-center justify-center gap-1">
          <span className="material-symbols-outlined text-[18px]">merge</span>Birlashtirish
        </button>
        <button
          disabled={cat.count > 0}
          onClick={async () => {
            if (!armDelete) return setArmDelete(true);
            try {
              await call(`/api/admin/db/categories/${cat.id}`, 'DELETE');
              onDone("Toifa o'chirildi");
            } catch (e: any) {
              onError(e.message);
            }
          }}
          className={`rounded-ios py-2.5 text-[14px] font-semibold flex items-center justify-center gap-1 disabled:opacity-40 ${armDelete ? 'bg-ios-red text-white' : 'bg-ios-card text-ios-red'}`}
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
          {armDelete ? 'Tasdiqlang' : cat.count > 0 ? `${cat.count} ta yozuv bor` : "O'chirish"}
        </button>
      </div>
    </div>
  );
};
