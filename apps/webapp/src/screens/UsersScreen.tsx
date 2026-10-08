import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../config';
import { IosHeader } from '../components/ios/IosHeader';
import { IosSearchBar } from '../components/ios/IosSearchBar';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { BottomSheet } from './rentals/shared';
import { Avatar, Person, VIA, relTime, displayName, TrustBadge, Sparkline, openTelegram } from '../components/people/PeopleKit';

/**
 * Userlar (2026-10-08 qayta qurilgan). Bot, @uz11_bot, ilova va guruhlardagi
 * barcha odamlar — raqamsiz, faqat Telegram ID. Statistika, aqlli guruhlar,
 * qaysi guruhdan kelganlar hisoboti va guruhga xabar yuborish.
 */

type Segment = 'all' | 'bot' | 'active' | 'new' | 'seekers' | 'owners' | 'business' | 'unanswered' | 'blocked' | 'complaints' | 'group_only' | 'suspended';
type Sort = 'recent' | 'new' | 'queries' | 'groups';

const SEGMENTS: { id: Segment; label: string; icon: string }[] = [
  { id: 'bot', label: 'Botdagilar', icon: 'smart_toy' },
  { id: 'active', label: 'Botda faol (7 kun)', icon: 'bolt' },
  { id: 'new', label: 'Botga yangi (7 kun)', icon: 'fiber_new' },
  { id: 'seekers', label: 'Uy qidiruvchi', icon: 'search' },
  { id: 'owners', label: 'Uy egasi', icon: 'key' },
  { id: 'business', label: 'Biznes egasi', icon: 'storefront' },
  { id: 'unanswered', label: 'Javobsiz qolgan', icon: 'help' },
  { id: 'group_only', label: 'Faqat guruhda', icon: 'groups' },
  { id: 'all', label: 'Hammasi', icon: 'group' },
  { id: 'blocked', label: 'Bloklagan', icon: 'block' },
  { id: 'complaints', label: 'Shikoyat/xavf', icon: 'report' },
  { id: 'suspended', label: "To'xtatilgan", icon: 'pause_circle' },
];

interface Stats {
  total: number;
  botUsers: number;
  groupOnly: number;
  newToday: number;
  new7: number;
  active7: number;
  blocked: number;
  appUsers: number;
  newPerDay: { date: string; value: number }[];
}

interface SourceRow {
  key: string;
  title: string;
  total: number;
  startedBot: number;
  viaAdLink: number;
  new30: number;
  posted: number;
  active7: number;
  conversion: number;
}

export interface UsersScreenProps {
  onSelectUser: (telegramId: string, fullName: string, username?: string) => void;
}

export const UsersScreen: React.FC<UsersScreenProps> = ({ onSelectUser }) => {
  const { user } = useAuth();
  const isSuper = user?.role === 'SUPER_ADMIN';
  const { showToast } = useFeedback();

  const [view, setView] = useState<'people' | 'sources'>('people');
  const [segment, setSegment] = useState<Segment>('bot');
  const [sort, setSort] = useState<Sort>('recent');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [items, setItems] = useState<Person[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<SourceRow[] | null>(null);
  const [bcOpen, setBcOpen] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(
    async (p = 0, append = false) => {
      const my = ++reqId.current;
      if (!append) setLoading(true);
      try {
        const r = await apiFetch(`/api/admin/people?segment=${segment}&sort=${sort}&page=${p}&search=${encodeURIComponent(debounced)}`);
        const d = await r.json();
        if (my !== reqId.current || !d.success) return;
        setItems((prev) => (append ? [...prev, ...d.items] : d.items));
        setCounts(d.counts);
        setStats(d.stats);
        setTotal(d.total);
        setPage(p);
      } catch {
        if (my === reqId.current) showToast('Userlar yuklanmadi', 'error');
      } finally {
        if (my === reqId.current) setLoading(false);
      }
    },
    [segment, sort, debounced, showToast]
  );

  useEffect(() => {
    if (view === 'people') load(0);
  }, [load, view]);

  // Jonli: 30 soniyada birinchi sahifani yangilaydi
  useEffect(() => {
    if (view !== 'people') return;
    const t = setInterval(() => document.visibilityState === 'visible' && page === 0 && load(0), 30000);
    return () => clearInterval(t);
  }, [load, view, page]);

  useEffect(() => {
    if (view !== 'sources' || sources) return;
    apiFetch('/api/admin/people/sources')
      .then((r) => r.json())
      .then((d) => setSources(d.rows || []))
      .catch(() => showToast('Manbalar yuklanmadi', 'error'));
  }, [view, sources, showToast]);

  return (
    <div className="flex flex-col gap-3.5 animate-fade-in pb-24">
      <IosHeader
        title="Userlar"
        subtitle={stats ? `Botda ${stats.botUsers} kishi · guruhlarda yana ${stats.groupOnly} kishi kuzatilmoqda` : 'Yuklanmoqda…'}
        trailing={
          isSuper ? (
            <button onClick={() => setBcOpen(true)} className="bg-ios-blue text-white px-3 py-1.5 rounded-full text-[13px] font-bold active:opacity-70 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">campaign</span>Xabar
            </button>
          ) : undefined
        }
      />

      {/* Statistika */}
      {stats && (
        <div className="bg-ios-card rounded-ios-lg shadow-sm p-3.5">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { n: stats.botUsers, l: 'Botdan foydalangan', c: 'text-ios-label' },
              { n: stats.newToday, l: 'Bugun botga yangi', c: 'text-ios-green' },
              { n: stats.active7, l: 'Botda faol 7 kun', c: 'text-ios-blue' },
              { n: stats.groupOnly, l: 'Faqat guruhda', c: 'text-ios-label-secondary' },
            ].map((x) => (
              <div key={x.l}>
                <div className={`text-[21px] font-bold leading-tight ${x.c}`}>{x.n}</div>
                <div className="text-[10.5px] text-ios-label-secondary">{x.l}</div>
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex items-end gap-2">
            <div className="flex-1">
              <Sparkline values={stats.newPerDay.map((d) => d.value)} />
            </div>
            <span className="text-[10.5px] text-ios-label-secondary shrink-0 pb-0.5">Botga kunlik yangi · 7 kunda {stats.new7}</span>
          </div>
          <div className="mt-2 text-[11px] text-ios-label-secondary leading-snug">
            <b className="text-ios-label">Botdan foydalangan</b> — botni ishga tushirib, unga yozgan odamlar. <b className="text-ios-label">Faqat guruhda</b> — guruhlarda yozgan, lekin botga hali kelmagan (bot ularga yoza olmaydi).
            {stats.blocked > 0 && <> Botni bloklagan: <b className="text-ios-red">{stats.blocked}</b>.</>}
          </div>
        </div>
      )}

      {/* Ko'rinish */}
      <div className="grid grid-cols-2 gap-1 bg-ios-fill/[0.12] rounded-ios p-1">
        {[
          { id: 'people', label: 'Odamlar', icon: 'group' },
          { id: 'sources', label: 'Qayerdan kelishdi', icon: 'insights' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setView(t.id as any)}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-[9px] text-[13px] font-semibold ${view === t.id ? 'bg-ios-card text-ios-label shadow-sm' : 'text-ios-label-secondary'}`}
          >
            <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {view === 'people' && (
        <>
          <IosSearchBar value={query} onChange={setQuery} placeholder="Ism, @username yoki Telegram ID…" />

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4">
            {SEGMENTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSegment(s.id)}
                className={`shrink-0 flex items-center gap-1 pl-2 pr-2.5 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                  segment === s.id ? 'bg-ios-blue text-white' : 'bg-ios-card text-ios-label-secondary'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{s.icon}</span>
                {s.label}
                <span className={`ml-0.5 text-[11px] ${segment === s.id ? 'text-white/80' : 'text-ios-label-secondary/60'}`}>{counts[s.id] ?? ''}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 -mt-1">
            <span className="text-[11px] text-ios-label-secondary/80 mr-1">Saralash:</span>
            {([
              ['recent', 'Oxirgi faollik'],
              ['new', 'Yangi'],
              ['queries', "Ko'p so'ragan"],
              ['groups', 'Guruhda faol'],
            ] as [Sort, string][]).map(([id, l]) => (
              <button key={id} onClick={() => setSort(id)} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${sort === id ? 'bg-ios-label text-ios-card' : 'text-ios-label-secondary/80'}`}>
                {l}
              </button>
            ))}
          </div>

          <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden">
            {loading && items.length === 0 && <div className="p-8 text-center text-[13px] text-ios-label-secondary">Yuklanmoqda…</div>}
            {!loading && items.length === 0 && (
              <div className="p-10 flex flex-col items-center gap-1.5 text-center">
                <span className="material-symbols-outlined text-[38px] text-ios-label-secondary/40">person_search</span>
                <div className="text-[15px] font-semibold text-ios-label">Hech kim topilmadi</div>
                <div className="text-[12.5px] text-ios-label-secondary">Boshqa guruh yoki qidiruvni sinab ko'ring</div>
              </div>
            )}
            {items.map((p, idx) => {
              const via = VIA[p.via] || VIA.group;
              return (
                <button
                  key={p.telegramId}
                  onClick={() => onSelectUser(p.telegramId, displayName(p), p.username || undefined)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left active:bg-ios-fill/10"
                  style={idx ? { borderTop: '0.5px solid rgb(var(--ios-separator) / 0.29)' } : undefined}
                >
                  <span className="relative">
                    <Avatar tgId={p.telegramId} name={displayName(p)} size={46} />
                    {p.activeRecently && !p.blocked && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-ios-green" style={{ boxShadow: '0 0 0 2px rgb(var(--ios-card))' }} />}
                    {p.blocked && <span className="absolute -bottom-0.5 -right-0.5 text-[13px]">🚫</span>}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className={`text-[15px] font-semibold truncate ${p.suspended ? 'text-ios-label-secondary line-through' : 'text-ios-label'}`}>{displayName(p)}</span>
                      {p.isPremium && <span className="text-[12px]" title="Telegram Premium">⭐</span>}
                      <TrustBadge trust={p.trust} />
                    </span>
                    <span className="block text-[12px] text-ios-label-secondary truncate mt-0.5">
                      {p.username && p.name ? `@${p.username} · ` : ''}
                      {p.sourceGroupTitle ? `👥 ${p.sourceGroupTitle}` : via.label}
                    </span>
                    <span className="flex items-center gap-2.5 mt-1 text-[11px] text-ios-label-secondary/90">
                      <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-[1px] font-semibold ${via.cls}`}>
                        <span className="material-symbols-outlined text-[12px]">{via.icon}</span>
                        {via.label}
                      </span>
                      {p.queries > 0 && (
                        <span className="flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[13px]">help</span>
                          {p.queries}
                          {p.unanswered > 0 && <span className="text-ios-orange">/{p.unanswered}</span>}
                        </span>
                      )}
                      {p.rentals + p.business > 0 && (
                        <span className="flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[13px]">sell</span>
                          {p.rentals + p.business}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[11px] text-ios-label-secondary/80">{relTime(p.lastActive)}</span>
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openTelegram(p);
                      }}
                      className="material-symbols-outlined text-[19px] text-ios-blue active:opacity-50"
                      title="Telegramda ochish"
                    >
                      send
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {items.length < total && (
            <button onClick={() => load(page + 1, true)} className="self-center text-[13px] font-semibold text-ios-blue py-2 active:opacity-60">
              Yana {Math.min(40, total - items.length)} tasini ko'rsatish ({items.length}/{total})
            </button>
          )}
        </>
      )}

      {view === 'sources' && <SourcesView rows={sources} />}

      {isSuper && <SegmentBroadcastSheet open={bcOpen} onClose={() => setBcOpen(false)} segment={segment} />}
    </div>
  );
};

// ---------------------------------------------------------------- manbalar

const SourcesView: React.FC<{ rows: SourceRow[] | null }> = ({ rows }) => {
  if (!rows) return <div className="bg-ios-card rounded-ios p-8 text-center text-[13px] text-ios-label-secondary">Yuklanmoqda…</div>;
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="flex flex-col gap-2.5">
      <div className="bg-ios-blue/10 rounded-ios px-3.5 py-2.5 text-[12.5px] text-ios-label leading-snug">
        📊 Har bir odam birinchi marta qaysi guruhda ko'ringan yoki qaysi guruhdagi reklama havolasini bosib kelganiga qarab hisoblanadi.
        <b> «Botga o'tdi»</b> — keyin botni ishga tushirganlar. Shu foiz qaysi guruh yaxshi ishlayotganini ko'rsatadi.
      </div>
      {rows.map((r, i) => (
        <div key={r.key} className="bg-ios-card rounded-ios shadow-sm p-3.5">
          <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ${i === 0 ? 'bg-ios-orange text-white' : 'bg-ios-fill/[0.14] text-ios-label-secondary'}`}>{i + 1}</span>
            <span className="flex-1 min-w-0 text-[15px] font-semibold text-ios-label truncate">{r.title}</span>
            <span className={`text-[13px] font-bold ${r.conversion >= 20 ? 'text-ios-green' : r.conversion >= 5 ? 'text-ios-orange' : 'text-ios-label-secondary'}`}>{r.conversion}%</span>
          </div>
          <div className="mt-2.5 h-2 rounded-full bg-ios-fill/[0.14] overflow-hidden flex">
            <div className="h-full bg-ios-blue/35" style={{ width: `${((r.total - r.startedBot) / max) * 100}%` }} />
            <div className="h-full bg-ios-green" style={{ width: `${(r.startedBot / max) * 100}%` }} />
          </div>
          <div className="mt-2.5 grid grid-cols-5 gap-1 text-center">
            {[
              [r.total, 'Jami'],
              [r.startedBot, "Botga o'tdi"],
              [r.viaAdLink, 'Reklamadan'],
              [r.posted, "E'lon berdi"],
              [r.active7, 'Faol'],
            ].map(([n, l]) => (
              <div key={l as string}>
                <div className="text-[15px] font-bold text-ios-label">{n as number}</div>
                <div className="text-[9.5px] text-ios-label-secondary leading-tight">{l as string}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- guruhga xabar

const SegmentBroadcastSheet: React.FC<{ open: boolean; onClose: () => void; segment: Segment }> = ({ open, onClose, segment }) => {
  const { showToast } = useFeedback();
  const [seg, setSeg] = useState<Segment>(segment);
  const [text, setText] = useState('');
  const [recipients, setRecipients] = useState<number | null>(null);
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setSeg(segment);
  }, [open, segment]);

  useEffect(() => {
    if (!open) return;
    setRecipients(null);
    setArmed(false);
    apiFetch('/api/admin/people/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ segment: seg, dryRun: true }) })
      .then((r) => r.json())
      .then((d) => setRecipients(d.recipients ?? 0))
      .catch(() => setRecipients(0));
  }, [open, seg]);

  const send = async () => {
    if (!armed) return setArmed(true);
    setBusy(true);
    try {
      const r = await apiFetch('/api/admin/people/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ segment: seg, text, dryRun: false }) });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.message || 'Xatolik');
      showToast(`Yuborildi: ${d.sent} ta${d.failed ? ` · yetmadi: ${d.failed}` : ''}`, 'success');
      setText('');
      onClose();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
      setArmed(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Guruhga xabar">
      <p className="text-[12.5px] text-ios-label-secondary mb-3">Faqat botni ishga tushirgan va bloklamagan odamlarga boradi. Spamga aylantirmang — oyiga 1–2 marta, foydali xabar.</p>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-3">
        {SEGMENTS.filter((s) => !['blocked', 'suspended', 'group_only'].includes(s.id)).map((s) => (
          <button key={s.id} onClick={() => setSeg(s.id)} className={`shrink-0 px-2.5 py-1 rounded-full text-[12px] font-semibold ${seg === s.id ? 'bg-ios-blue text-white' : 'bg-ios-card text-ios-label-secondary'}`}>
            {s.label}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setArmed(false);
        }}
        rows={5}
        placeholder="Masalan: Assalomu alaykum! Botimizda endi ijara uylar ham bor — «uy kerak» deb yozing 🙂"
        className="w-full bg-ios-card rounded-ios px-3.5 py-3 text-[15px] text-ios-label outline-none focus:ring-1 focus:ring-ios-blue resize-none"
      />
      <button
        disabled={busy || text.trim().length < 3 || !recipients}
        onClick={send}
        className={`mt-3 w-full rounded-ios py-3 text-[16px] font-semibold active:opacity-80 disabled:opacity-40 ${armed ? 'bg-ios-red text-white' : 'bg-ios-blue text-white'}`}
      >
        {busy ? 'Yuborilmoqda…' : armed ? `Tasdiqlang — ${recipients} kishiga yuborish` : recipients == null ? 'Hisoblanmoqda…' : `${recipients} kishiga yuborish`}
      </button>
    </BottomSheet>
  );
};
