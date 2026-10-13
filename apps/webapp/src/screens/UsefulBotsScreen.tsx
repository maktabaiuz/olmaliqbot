import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../config';
import { IosHeader } from '../components/ios/IosHeader';
import { useFeedback } from '../context/FeedbackContext';
import { BottomSheet } from './rentals/shared';

/**
 * Foydali botlar (2026-10-13 qayta qurilgan). Ro'yxat → bot sahifasi →
 * har bir guruh kartochkasi: yoqish (darhol saqlanadi), botning guruhdagi
 * huquqlari, 7 kunlik ish va sozlamalar ("Saqlash" tugmasi bilan).
 * "Majburiy taklif" — kutayotganlar, kim kimni qo'shgani, qo'lda ruxsat.
 */

interface BotSummary {
  key: string;
  name: string;
  description: string;
  icon: string;
  enabledGroupCount: number;
  actions7d: number;
  waiting?: number;
}

interface GroupItem {
  id: string;
  chatId: string;
  title: string;
  isEnabled: boolean;
  requiredCount: number | null;
  linkLabel: string | null;
  linkButtonStyle: string | null;
  linkUrl: string | null;
  memberCount: number | null;
  problems: string[];
  actions7d: number;
  invite: { waiting: number; verified: number; credits7d: number } | null;
  domains?: { id: string; domain: string }[];
}

const HOW: Record<string, string[]> = {
  PROFANITY: ["So'kinish va haqoratli so'zli xabar darhol o'chiriladi", 'Yozgan odam 1 soatga jim qilinadi', "Guruh toza va hurmatli bo'ladi"],
  SPAM_LINK: ["Ruxsat ro'yxatida yo'q havolali xabar o'chiriladi", "Odam jim qilinmaydi — faqat xabar o'chadi", "Ishonchli saytlarni pastda ro'yxatga qo'shasiz"],
  GAMBLING: ['1xBet, stavka, kazino kabi reklamalar o\'chiriladi', 'Taniqli brendlar kodda bor, yangilarini o\'zingiz qo\'shasiz', "Ro'yxat barcha guruhlarga birdaniga ishlaydi"],
  SCAM: ['"Pul yutdingiz", "bepul kredit" kabi firibgarlik iboralari ushlanadi', "Xabar o'chiriladi, a'zolar aldovdan saqlanadi"],
  FLOOD: ["Bir zumda ko'p xabar yozish (spam-bombardimon) to'xtatiladi", "Oddiy savol-javob va so'rovlarga tegmaydi"],
  MANDATORY_INVITE: [
    "Yangi a'zo belgilangan sondagi odamni qo'shmaguncha yoza olmaydi",
    "Ikkala usul sanaladi: shaxsiy havola va «A'zo qo'shish» tugmasi",
    "Aldov sanalmaydi: o'zini qo'shish, qayta qo'shish, 24 soatda chiqib ketish",
    'Kutayotganlarga qo\'lda ruxsat berish yoki hammasini ochish mumkin',
  ],
};

const TINT: Record<string, string> = {
  PROFANITY: 'from-rose-400 to-red-500',
  SPAM_LINK: 'from-sky-400 to-blue-600',
  GAMBLING: 'from-amber-400 to-orange-500',
  SCAM: 'from-emerald-400 to-teal-600',
  FLOOD: 'from-cyan-400 to-sky-600',
  MANDATORY_INVITE: 'from-violet-400 to-purple-600',
};

const BUTTON_STYLES: { value: string | null; label: string; cls: string }[] = [
  { value: null, label: 'Standart', cls: 'bg-ios-label-secondary/40' },
  { value: 'primary', label: "Ko'k", cls: 'bg-ios-blue' },
  { value: 'success', label: 'Yashil', cls: 'bg-ios-green' },
  { value: 'danger', label: 'Qizil', cls: 'bg-ios-red' },
];

async function call(url: string, method = 'GET', body?: object) {
  const res = await apiFetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) throw new Error(data?.message || 'Xatolik yuz berdi');
  return data;
}

const Toggle: React.FC<{ on: boolean; onChange: () => void; disabled?: boolean }> = ({ on, onChange, disabled }) => (
  <button
    role="switch"
    aria-checked={on}
    disabled={disabled}
    onClick={onChange}
    className={`relative w-[51px] h-[31px] rounded-full shrink-0 transition-colors disabled:opacity-50 ${on ? 'bg-ios-green' : 'bg-ios-fill/30'}`}
  >
    <span className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
  </button>
);

export interface UsefulBotsScreenProps {
  onBack: () => void;
  onOpenLogs?: () => void;
}

export const UsefulBotsScreen: React.FC<UsefulBotsScreenProps> = ({ onBack, onOpenLogs }) => {
  const { showToast } = useFeedback();
  const [bots, setBots] = useState<BotSummary[] | null>(null);
  const [groupsTotal, setGroupsTotal] = useState(0);
  const [selected, setSelected] = useState<BotSummary | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      const d = await call('/api/admin/useful-bots/overview');
      setBots(d.bots);
      setGroupsTotal(d.groupsTotal);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [showToast]);

  useEffect(() => {
    if (!selected) loadOverview();
  }, [selected, loadOverview]);

  if (selected) return <BotDetail bot={selected} onBack={() => setSelected(null)} onOpenLogs={onOpenLogs} />;

  return (
    <div className="flex flex-col gap-3.5 animate-fade-in pb-24">
      <IosHeader title="Foydali botlar" subtitle="Guruhlarni himoya qiladi va o'stiradi" onBack={onBack} />

      <div className="bg-gradient-to-br from-ios-blue to-indigo-600 rounded-ios-lg p-4 text-white shadow-sm">
        <div className="text-[13px] font-semibold opacity-85">Bot ulangan guruhlar</div>
        <div className="text-[30px] font-bold leading-tight">{groupsTotal}</div>
        <div className="text-[12.5px] opacity-85 mt-0.5">Har bir botni har bir guruhda alohida yoqasiz va sozlaysiz.</div>
      </div>

      {!bots && <div className="bg-ios-card rounded-ios p-8 text-center text-[13px] text-ios-label-secondary">Yuklanmoqda…</div>}
      <div className="flex flex-col gap-2.5">
        {bots?.map((b) => (
          <button key={b.key} onClick={() => setSelected(b)} className="bg-ios-card rounded-ios-lg shadow-sm p-3.5 flex items-start gap-3 text-left active:scale-[.99] transition-transform">
            <span className={`w-12 h-12 rounded-[14px] bg-gradient-to-br ${TINT[b.key] || 'from-slate-400 to-slate-600'} flex items-center justify-center text-[24px] shrink-0 shadow-sm`}>{b.icon}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-[16px] font-semibold text-ios-label">{b.name}</span>
              <span className="block text-[12.5px] text-ios-label-secondary leading-snug mt-0.5">{b.description}</span>
              <span className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className={`text-[11px] font-semibold rounded-full px-2 py-[2px] ${b.enabledGroupCount ? 'bg-ios-green/15 text-ios-green' : 'bg-ios-fill/[0.14] text-ios-label-secondary'}`}>
                  {b.enabledGroupCount ? `● ${b.enabledGroupCount}/${groupsTotal} guruhda yoqiq` : "○ O'chiq"}
                </span>
                <span className="text-[11px] font-semibold rounded-full px-2 py-[2px] bg-ios-fill/[0.14] text-ios-label-secondary">
                  7 kunda: {b.actions7d} {b.key === 'MANDATORY_INVITE' ? 'qo\'shildi' : 'ushlandi'}
                </span>
                {!!b.waiting && <span className="text-[11px] font-semibold rounded-full px-2 py-[2px] bg-ios-orange/15 text-ios-orange">{b.waiting} kutyapti</span>}
              </span>
            </span>
            <span className="material-symbols-outlined text-[20px] text-ios-label-secondary/50 self-center">chevron_right</span>
          </button>
        ))}
      </div>

      {onOpenLogs && (
        <button onClick={onOpenLogs} className="bg-ios-card rounded-ios shadow-sm px-3.5 py-3 flex items-center gap-3 active:bg-ios-fill/10">
          <span className="material-symbols-outlined text-[22px] text-ios-red">gpp_bad</span>
          <span className="flex-1 text-left text-[15px] text-ios-label">Bloklangan xabarlar jurnali</span>
          <span className="material-symbols-outlined text-[20px] text-ios-label-secondary/50">chevron_right</span>
        </button>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- bot sahifasi

const BotDetail: React.FC<{ bot: BotSummary; onBack: () => void; onOpenLogs?: () => void }> = ({ bot, onBack, onOpenLogs }) => {
  const { showToast } = useFeedback();
  const [groups, setGroups] = useState<GroupItem[] | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const editing = useRef(0); // ochiq, saqlanmagan tahrir bo'lsa jonli yangilash to'xtaydi

  const load = useCallback(async () => {
    try {
      const d = await call(`/api/admin/useful-bots/${bot.key}/detail`);
      setGroups(d.groups);
      setLastSync(new Date());
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [bot.key, showToast]);

  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === 'visible' && editing.current === 0 && load(), 20000);
    return () => clearInterval(t);
  }, [load]);

  const enabled = groups?.filter((g) => g.isEnabled).length || 0;
  const actions = groups?.reduce((s, g) => s + (bot.key === 'MANDATORY_INVITE' ? g.invite?.credits7d || 0 : g.actions7d), 0) || 0;
  const waiting = groups?.reduce((s, g) => s + (g.invite?.waiting || 0), 0) || 0;

  return (
    <div className="flex flex-col gap-3.5 animate-fade-in pb-24">
      <IosHeader title={bot.name} subtitle={lastSync ? `Jonli · ${lastSync.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Yuklanmoqda…'} onBack={onBack} />

      <div className="bg-ios-card rounded-ios-lg shadow-sm p-4">
        <div className="flex items-center gap-3">
          <span className={`w-14 h-14 rounded-[16px] bg-gradient-to-br ${TINT[bot.key]} flex items-center justify-center text-[28px] shadow-sm`}>{bot.icon}</span>
          <p className="flex-1 text-[13.5px] text-ios-label-secondary leading-snug">{bot.description}</p>
        </div>
        <div className="mt-3 text-[12px] font-semibold text-ios-label-secondary uppercase tracking-wide">Qanday ishlaydi</div>
        <ul className="mt-1.5 flex flex-col gap-1.5">
          {(HOW[bot.key] || []).map((h) => (
            <li key={h} className="flex gap-2 text-[13.5px] text-ios-label leading-snug">
              <span className="text-ios-green">✓</span>
              {h}
            </li>
          ))}
        </ul>
      </div>

      <div className={`grid gap-2 ${bot.key === 'MANDATORY_INVITE' ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <Stat n={`${enabled}/${groups?.length ?? 0}`} l="Guruhda yoqiq" />
        <Stat n={actions} l={bot.key === 'MANDATORY_INVITE' ? "7 kunda qo'shildi" : '7 kunda ushlandi'} />
        {bot.key === 'MANDATORY_INVITE' && <Stat n={waiting} l="Kutyapti" tone={waiting ? 'text-ios-orange' : undefined} />}
      </div>

      {bot.key === 'GAMBLING' && <GamblingKeywords />}

      <div className="text-[12.5px] text-ios-label-secondary/80 uppercase tracking-wide px-1 -mb-1.5">Guruhlar</div>
      {!groups && <div className="bg-ios-card rounded-ios p-8 text-center text-[13px] text-ios-label-secondary">Yuklanmoqda…</div>}
      {groups?.length === 0 && <div className="bg-ios-card rounded-ios p-8 text-center text-[13px] text-ios-label-secondary">Bot hali hech qaysi guruhga qo'shilmagan</div>}
      {groups?.map((g) => (
        <GroupCard
          key={g.id}
          bot={bot}
          group={g}
          onChanged={(patch) => setGroups((prev) => prev && prev.map((x) => (x.id === g.id ? { ...x, ...patch } : x)))}
          onReload={load}
          onEditing={(d) => (editing.current = Math.max(0, editing.current + (d ? 1 : -1)))}
        />
      ))}

      {onOpenLogs && bot.key !== 'MANDATORY_INVITE' && (
        <button onClick={onOpenLogs} className="self-center flex items-center gap-1 text-[13px] font-semibold text-ios-blue active:opacity-60 py-1">
          <span className="material-symbols-outlined text-[17px]">list_alt</span>Ushlangan xabarlarni ko'rish
        </button>
      )}
    </div>
  );
};

const Stat: React.FC<{ n: number | string; l: string; tone?: string }> = ({ n, l, tone }) => (
  <div className="bg-ios-card rounded-ios shadow-sm py-2.5 text-center">
    <div className={`text-[20px] font-bold ${tone || 'text-ios-label'}`}>{n}</div>
    <div className="text-[10.5px] text-ios-label-secondary">{l}</div>
  </div>
);

// ---------------------------------------------------------------- guruh kartochkasi

const GroupCard: React.FC<{
  bot: BotSummary;
  group: GroupItem;
  onChanged: (p: Partial<GroupItem>) => void;
  onReload: () => void;
  onEditing: (dirty: boolean) => void;
}> = ({ bot, group: g, onChanged, onReload, onEditing }) => {
  const { showToast } = useFeedback();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const hasSettings = bot.key === 'MANDATORY_INVITE' || bot.key === 'SPAM_LINK';

  const toggle = async () => {
    const next = !g.isEnabled;
    if (next && bot.key === 'MANDATORY_INVITE' && !g.requiredCount) {
      setOpen(true);
      showToast("Avval nechta odam qo'shishi kerakligini belgilab, «Saqlash»ni bosing", 'error');
      return;
    }
    onChanged({ isEnabled: next });
    setBusy(true);
    try {
      await call(`/api/admin/useful-bots/${bot.key}/groups/${g.id}`, 'PUT', { isEnabled: next });
      showToast(next ? `Yoqildi — «${g.title}»` : `O'chirildi — «${g.title}»`, 'success');
    } catch (e: any) {
      onChanged({ isEnabled: !next });
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const ready = g.problems.length === 0;
  return (
    <div className="bg-ios-card rounded-ios-lg shadow-sm overflow-hidden">
      <div className="p-3.5 flex items-center gap-3">
        <span className="w-10 h-10 rounded-full bg-ios-fill/[0.14] flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[21px] text-ios-label-secondary">groups</span>
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-semibold text-ios-label truncate">{g.title}</span>
          <span className="block text-[12px] text-ios-label-secondary mt-0.5">
            {g.memberCount != null ? `${g.memberCount.toLocaleString('ru-RU')} a'zo` : "a'zolar soni noma'lum"}
            {bot.key === 'MANDATORY_INVITE' && g.requiredCount ? ` · ${g.requiredCount} kishi qo'shish kerak` : ''}
          </span>
        </span>
        <Toggle on={g.isEnabled} onChange={toggle} disabled={busy} />
      </div>

      <div className="px-3.5 pb-3 flex items-center gap-1.5 flex-wrap -mt-1">
        {ready ? (
          <span className="text-[11px] font-semibold rounded-full px-2 py-[2px] bg-ios-green/15 text-ios-green">✓ Bot tayyor</span>
        ) : (
          g.problems.map((p) => (
            <span key={p} className="text-[11px] font-semibold rounded-full px-2 py-[2px] bg-ios-red/10 text-ios-red">
              ⚠ {p}
            </span>
          ))
        )}
        {g.isEnabled && bot.key !== 'MANDATORY_INVITE' && (
          <span className="text-[11px] font-semibold rounded-full px-2 py-[2px] bg-ios-fill/[0.14] text-ios-label-secondary">7 kunda: {g.actions7d} ushlandi</span>
        )}
        {bot.key === 'MANDATORY_INVITE' && g.invite && (
          <>
            {g.invite.waiting > 0 && <span className="text-[11px] font-semibold rounded-full px-2 py-[2px] bg-ios-orange/15 text-ios-orange">{g.invite.waiting} kutyapti</span>}
            <span className="text-[11px] font-semibold rounded-full px-2 py-[2px] bg-ios-fill/[0.14] text-ios-label-secondary">{g.invite.verified} ochilgan</span>
            <span className="text-[11px] font-semibold rounded-full px-2 py-[2px] bg-ios-fill/[0.14] text-ios-label-secondary">7 kunda +{g.invite.credits7d}</span>
          </>
        )}
      </div>
      {!ready && g.isEnabled && (
        <div className="mx-3.5 mb-3 -mt-1 text-[11.5px] text-ios-red leading-snug">
          Bot bu guruhda ishlay olmaydi. Guruh sozlamalarida botni admin qilib, kerakli huquqlarni bering.
        </div>
      )}

      {hasSettings && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 text-[13.5px] font-semibold text-ios-blue active:bg-ios-fill/10"
          style={{ borderTop: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}
        >
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">tune</span>
            {bot.key === 'SPAM_LINK' ? `Ruxsat etilgan saytlar · ${g.domains?.length || 0}` : 'Sozlamalar va boshqaruv'}
          </span>
          <span className={`material-symbols-outlined text-[20px] transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</span>
        </button>
      )}
      {open && bot.key === 'MANDATORY_INVITE' && <InviteSettings group={g} onSaved={(p) => { onChanged(p); onReload(); }} onEditing={onEditing} />}
      {open && bot.key === 'SPAM_LINK' && <DomainsEditor group={g} onChanged={(domains) => onChanged({ domains })} />}
    </div>
  );
};

// ---------------------------------------------------------------- majburiy taklif

const InviteSettings: React.FC<{ group: GroupItem; onSaved: (p: Partial<GroupItem>) => void; onEditing: (d: boolean) => void }> = ({ group: g, onSaved, onEditing }) => {
  const { showToast } = useFeedback();
  const initial = { count: g.requiredCount ?? 3, label: g.linkLabel ?? '', url: g.linkUrl ?? '', style: g.linkButtonStyle };
  const [count, setCount] = useState(initial.count);
  const [label, setLabel] = useState(initial.label);
  const [url, setUrl] = useState(initial.url);
  const [style, setStyle] = useState<string | null>(initial.style);
  const [saving, setSaving] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [armAll, setArmAll] = useState(false);

  const dirty = count !== (g.requiredCount ?? 3) || label !== (g.linkLabel ?? '') || url !== (g.linkUrl ?? '') || style !== g.linkButtonStyle || !g.requiredCount;
  // Saqlanmagan tahrir bor paytda jonli yangilash ma'lumotni ustidan yozmasin
  const wasDirty = useRef(false);
  const onEditingRef = useRef(onEditing);
  onEditingRef.current = onEditing;
  useEffect(() => {
    if (dirty !== wasDirty.current) {
      onEditingRef.current(dirty);
      wasDirty.current = dirty;
    }
  }, [dirty]);
  useEffect(() => () => {
    if (wasDirty.current) onEditingRef.current(false);
  }, []);

  const save = async () => {
    if (!Number.isInteger(count) || count < 1 || count > 100) return showToast("Son 1 dan 100 gacha bo'lsin", 'error');
    setSaving(true);
    try {
      const d = await call(`/api/admin/useful-bots/MANDATORY_INVITE/groups/${g.id}`, 'PUT', {
        isEnabled: g.isEnabled,
        requiredCount: count,
        linkLabel: label.trim() || null,
        linkButtonStyle: style,
        linkUrl: url.trim() || null,
      });
      onSaved({ requiredCount: count, linkLabel: label.trim() || null, linkButtonStyle: style, linkUrl: d.linkUrl ?? null });
      showToast('Saqlandi — bot 1 daqiqa ichida yangi sozlama bilan ishlaydi', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const approveAll = async () => {
    if (!armAll) return setArmAll(true);
    setArmAll(false);
    try {
      const d = await call(`/api/admin/useful-bots/invite/${g.id}/approve-all`, 'POST', {});
      showToast(`${d.count} kishiga yozish ruxsati berildi`, 'success');
      onSaved({});
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const btnPreview = BUTTON_STYLES.find((b) => b.value === style) || BUTTON_STYLES[0];
  return (
    <div className="px-3.5 pb-3.5 flex flex-col gap-3.5" style={{ borderTop: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}>
      <div className="pt-3">
        <div className="text-[12px] font-semibold text-ios-label-secondary uppercase tracking-wide mb-1.5">Nechta odam qo'shishi kerak</div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCount((c) => Math.max(1, c - 1))} className="w-11 h-11 rounded-ios bg-ios-fill/[0.14] text-[22px] font-semibold text-ios-blue active:opacity-60">−</button>
          <input
            inputMode="numeric"
            value={count}
            onChange={(e) => setCount(Math.max(0, Math.min(100, Number(e.target.value.replace(/\D/g, '')) || 0)))}
            className="w-20 h-11 rounded-ios bg-ios-fill/[0.14] text-center text-[20px] font-bold text-ios-label outline-none focus:ring-1 focus:ring-ios-blue"
          />
          <button onClick={() => setCount((c) => Math.min(100, c + 1))} className="w-11 h-11 rounded-ios bg-ios-fill/[0.14] text-[22px] font-semibold text-ios-blue active:opacity-60">+</button>
          <span className="text-[12px] text-ios-label-secondary leading-tight ml-1">Tavsiya: 3–5.<br />Ko'p bo'lsa, odamlar yoza olmay qoladi.</span>
        </div>
      </div>

      <div>
        <div className="text-[12px] font-semibold text-ios-label-secondary uppercase tracking-wide mb-1.5">Qo'shimcha tugma (ixtiyoriy)</div>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Tugma matni, masalan: Botimizga o'ting" className="w-full bg-ios-fill/[0.12] rounded-ios px-3.5 py-2.5 text-[15px] text-ios-label outline-none focus:ring-1 focus:ring-ios-blue mb-2" />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Havola: @olmaliq_bot yoki https://t.me/kanal" className="w-full bg-ios-fill/[0.12] rounded-ios px-3.5 py-2.5 text-[15px] text-ios-label outline-none focus:ring-1 focus:ring-ios-blue mb-2" />
        <div className="flex gap-1.5">
          {BUTTON_STYLES.map((b) => (
            <button key={b.label} onClick={() => setStyle(b.value)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-ios text-[12.5px] font-semibold border ${style === b.value ? 'border-ios-blue bg-ios-blue/10 text-ios-blue' : 'border-transparent bg-ios-fill/[0.12] text-ios-label-secondary'}`}>
              <span className={`w-3 h-3 rounded-full ${b.cls}`} />
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Guruhda chiqadigan eslatma — oldindan ko'rinish */}
      <div>
        <div className="text-[12px] font-semibold text-ios-label-secondary uppercase tracking-wide mb-1.5">Guruhda shunday ko'rinadi</div>
        <div className="rounded-ios-lg bg-ios-fill/[0.10] p-3">
          <div className="bg-ios-card rounded-[14px] px-3 py-2.5 text-[13px] text-ios-label leading-snug shadow-sm">
            👋 <b className="text-ios-blue">Ism</b>, bu guruhda yozish uchun odam taklif qiling!
            <div className="mt-1.5">
              Kerak: <b>{count || '—'}</b> kishi · Qo'shdingiz: <b>0</b> · Qoldi: <b>{count || '—'}</b>
            </div>
            <div className="mt-1.5 text-ios-label-secondary">«A'zo qo'shish» yoki havola — ikkalasi ham sanaladi ✅</div>
          </div>
          <div className="mt-1.5 rounded-[12px] bg-ios-green text-white text-center text-[13px] font-semibold py-2">👥 Do'stlarni taklif qilish</div>
          {label.trim() && <div className={`mt-1.5 rounded-[12px] ${btnPreview.cls} text-white text-center text-[13px] font-semibold py-2`}>{label.trim()}</div>}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          disabled={!dirty || saving}
          onClick={save}
          className="flex-1 rounded-ios py-3 text-[16px] font-semibold bg-ios-blue text-white active:opacity-80 disabled:opacity-40 flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[19px]">{saving ? 'progress_activity' : 'save'}</span>
          {saving ? 'Saqlanmoqda…' : dirty ? 'Saqlash' : 'Saqlangan ✓'}
        </button>
        {dirty && g.requiredCount && (
          <button
            onClick={() => {
              setCount(initial.count);
              setLabel(initial.label);
              setUrl(initial.url);
              setStyle(initial.style);
            }}
            className="px-4 rounded-ios bg-ios-fill/[0.14] text-[14px] font-semibold text-ios-label-secondary active:opacity-70"
          >
            Bekor
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setSheet(true)} className="flex flex-col items-center gap-0.5 py-2.5 rounded-ios bg-ios-fill/[0.12] text-[12.5px] font-semibold text-ios-label active:opacity-70">
          <span className="material-symbols-outlined text-[21px] text-ios-blue">hourglass_top</span>
          Kutayotganlar · {g.invite?.waiting ?? 0}
        </button>
        <button
          disabled={!g.invite?.waiting}
          onClick={approveAll}
          className={`flex flex-col items-center gap-0.5 py-2.5 rounded-ios text-[12.5px] font-semibold active:opacity-70 disabled:opacity-40 ${armAll ? 'bg-ios-green text-white' : 'bg-ios-fill/[0.12] text-ios-label'}`}
        >
          <span className={`material-symbols-outlined text-[21px] ${armAll ? '' : 'text-ios-green'}`}>lock_open</span>
          {armAll ? `Tasdiqlang — ${g.invite?.waiting} kishi` : 'Hammasini ochish'}
        </button>
      </div>

      <InviteSheet open={sheet} onClose={() => setSheet(false)} group={g} onChanged={() => onSaved({})} />
    </div>
  );
};

interface InviteDetail {
  requiredCount: number | null;
  verifiedCount: number;
  waiting: { telegramId: string; name: string; invitedCount: number; since: string }[];
  credits: { at: string; method: string; revoked: boolean; inviter: { name: string }; invited: { name: string } }[];
}

function ago(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${Math.max(1, m)} daq oldin`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat oldin`;
  return `${Math.floor(h / 24)} kun oldin`;
}

const InviteSheet: React.FC<{ open: boolean; onClose: () => void; group: GroupItem; onChanged: () => void }> = ({ open, onClose, group, onChanged }) => {
  const { showToast } = useFeedback();
  const [tab, setTab] = useState<'waiting' | 'log'>('waiting');
  const [d, setD] = useState<InviteDetail | null>(null);
  const [q, setQ] = useState('');

  const load = useCallback(() => {
    call(`/api/admin/useful-bots/invite/${group.id}`)
      .then(setD)
      .catch((e) => showToast(e.message, 'error'));
  }, [group.id, showToast]);
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const approve = async (tg: string, name: string) => {
    try {
      await call(`/api/admin/useful-bots/invite/${group.id}/approve`, 'POST', { telegramId: tg });
      setD((prev) => prev && { ...prev, waiting: prev.waiting.filter((w) => w.telegramId !== tg), verifiedCount: prev.verifiedCount + 1 });
      showToast(`${name} endi yoza oladi`, 'success');
      onChanged();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const req = d?.requiredCount || 1;
  const list = (d?.waiting || []).filter((w) => !q || w.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <BottomSheet open={open} onClose={onClose} title={group.title}>
      <div className="grid grid-cols-2 gap-1 bg-ios-fill/[0.12] rounded-ios p-1 mb-3">
        {[
          ['waiting', `Kutayotganlar · ${d?.waiting.length ?? '…'}`],
          ['log', "Kim kimni qo'shdi"],
        ].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id as any)} className={`py-1.5 rounded-[9px] text-[13px] font-semibold ${tab === id ? 'bg-ios-card text-ios-label shadow-sm' : 'text-ios-label-secondary'}`}>
            {l}
          </button>
        ))}
      </div>
      {!d && <div className="py-8 text-center text-[13px] text-ios-label-secondary">Yuklanmoqda…</div>}
      {d && tab === 'waiting' && (
        <>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism bo'yicha qidirish…" className="w-full bg-ios-card rounded-ios px-3.5 py-2.5 text-[15px] text-ios-label outline-none mb-2" />
          <div className="bg-ios-card rounded-ios overflow-hidden divide-y-[0.5px] divide-ios-separator/[0.29]">
            {list.length === 0 && <div className="p-6 text-center text-[13px] text-ios-label-secondary">Hech kim kutmayapti 🎉</div>}
            {list.map((w) => (
              <div key={w.telegramId} className="flex items-center gap-3 px-3.5 py-2.5">
                <span className="flex-1 min-w-0">
                  <span className="block text-[14.5px] text-ios-label truncate">{w.name}</span>
                  <span className="flex items-center gap-2 mt-1">
                    <span className="flex-1 h-1.5 rounded-full bg-ios-fill/[0.16] overflow-hidden">
                      <span className="block h-full bg-ios-blue rounded-full" style={{ width: `${Math.min(100, (w.invitedCount / req) * 100)}%` }} />
                    </span>
                    <span className="text-[11px] text-ios-label-secondary shrink-0">
                      {w.invitedCount}/{req} · {ago(w.since)}
                    </span>
                  </span>
                </span>
                <button onClick={() => approve(w.telegramId, w.name)} className="shrink-0 px-3 py-1.5 rounded-full bg-ios-green/15 text-ios-green text-[12.5px] font-semibold active:opacity-60">
                  Ruxsat
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {d && tab === 'log' && (
        <div className="bg-ios-card rounded-ios overflow-hidden divide-y-[0.5px] divide-ios-separator/[0.29]">
          {d.credits.length === 0 && <div className="p-6 text-center text-[13px] text-ios-label-secondary">Hali hech kim qo'shilmagan</div>}
          {d.credits.map((c, i) => (
            <div key={i} className={`flex items-center gap-2.5 px-3.5 py-2.5 ${c.revoked ? 'opacity-50' : ''}`}>
              <span className="material-symbols-outlined text-[20px] text-ios-blue">{c.method === 'link' ? 'link' : 'person_add'}</span>
              <span className="flex-1 min-w-0 text-[13.5px] text-ios-label">
                <b className="font-semibold">{c.inviter.name}</b> → {c.invited.name}
                <span className="block text-[11px] text-ios-label-secondary">
                  {c.method === 'link' ? 'Havola orqali' : "«A'zo qo'shish» bilan"} · {ago(c.at)}
                  {c.revoked && " · chiqib ketdi, hisob qaytarildi"}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </BottomSheet>
  );
};

// ---------------------------------------------------------------- spam-link: domenlar

const DomainsEditor: React.FC<{ group: GroupItem; onChanged: (d: { id: string; domain: string }[]) => void }> = ({ group: g, onChanged }) => {
  const { showToast } = useFeedback();
  const [input, setInput] = useState('');
  const domains = g.domains || [];
  const add = async () => {
    const v = input.trim();
    if (!v) return;
    try {
      const d = await call(`/api/admin/useful-bots/groups/${g.id}/allowed-domains`, 'POST', { domain: v });
      onChanged([d.domain, ...domains.filter((x) => x.domain !== d.domain.domain)]);
      setInput('');
      showToast(`Saqlandi: ${d.domain.domain}`, 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };
  const remove = async (id: string) => {
    const prev = domains;
    onChanged(domains.filter((d) => d.id !== id));
    try {
      await call(`/api/admin/useful-bots/allowed-domains/${id}`, 'DELETE');
    } catch (e: any) {
      onChanged(prev);
      showToast(e.message, 'error');
    }
  };
  return (
    <div className="px-3.5 pb-3.5 pt-3" style={{ borderTop: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}>
      <p className="text-[12px] text-ios-label-secondary mb-2">Bu saytlarga havola yozilsa o'chirilmaydi. Bizning bot va sayt havolalari doim ruxsat etilgan.</p>
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {domains.length === 0 && <span className="text-[12px] text-ios-label-secondary/70">Hali qo'shilmagan</span>}
        {domains.map((d) => (
          <span key={d.id} className="flex items-center gap-1 bg-ios-blue/10 text-ios-blue rounded-full pl-2.5 pr-1 py-1 text-[12.5px] font-semibold">
            {d.domain}
            <button onClick={() => remove(d.id)} className="w-5 h-5 rounded-full flex items-center justify-center active:bg-ios-blue/20" aria-label="O'chirish">
              <span className="material-symbols-outlined text-[15px]">close</span>
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="masalan: olx.uz" className="flex-1 bg-ios-fill/[0.12] rounded-ios px-3.5 py-2.5 text-[15px] text-ios-label outline-none focus:ring-1 focus:ring-ios-blue" />
        <button onClick={add} disabled={!input.trim()} className="px-4 rounded-ios bg-ios-blue text-white text-[14px] font-semibold active:opacity-80 disabled:opacity-40">
          Qo'shish
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- qimor: global so'zlar

const GamblingKeywords: React.FC = () => {
  const { showToast } = useFeedback();
  const [items, setItems] = useState<{ id: string; keyword: string }[] | null>(null);
  const [input, setInput] = useState('');
  useEffect(() => {
    apiFetch('/api/admin/useful-bots/gambling-keywords')
      .then((r) => r.json())
      .then(setItems)
      .catch(() => setItems([]));
  }, []);
  const add = async () => {
    const v = input.trim();
    if (!v) return;
    try {
      const d = await call('/api/admin/useful-bots/gambling-keywords', 'POST', { keyword: v });
      setItems((p) => [d.keyword, ...(p || []).filter((k) => k.keyword !== d.keyword.keyword)]);
      setInput('');
      showToast(`Saqlandi: ${d.keyword.keyword}`, 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };
  const remove = async (id: string) => {
    const prev = items;
    setItems((p) => (p || []).filter((k) => k.id !== id));
    try {
      await call(`/api/admin/useful-bots/gambling-keywords/${id}`, 'DELETE');
    } catch (e: any) {
      setItems(prev);
      showToast(e.message, 'error');
    }
  };
  return (
    <div className="bg-ios-card rounded-ios-lg shadow-sm p-3.5">
      <div className="text-[15px] font-semibold text-ios-label">Taqiqlangan sayt va brendlar</div>
      <p className="text-[12px] text-ios-label-secondary mt-0.5 mb-2.5">Barcha guruhlar uchun bitta ro'yxat. Taniqli brendlar (1xBet, Melbet…) kodda allaqachon bor.</p>
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {items?.length === 0 && <span className="text-[12px] text-ios-label-secondary/70">Qo'shimcha so'z yo'q</span>}
        {items?.map((k) => (
          <span key={k.id} className="flex items-center gap-1 bg-ios-orange/10 text-ios-orange rounded-full pl-2.5 pr-1 py-1 text-[12.5px] font-semibold">
            {k.keyword}
            <button onClick={() => remove(k.id)} className="w-5 h-5 rounded-full flex items-center justify-center" aria-label="O'chirish">
              <span className="material-symbols-outlined text-[15px]">close</span>
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="masalan: mostbet" className="flex-1 bg-ios-fill/[0.12] rounded-ios px-3.5 py-2.5 text-[15px] text-ios-label outline-none focus:ring-1 focus:ring-ios-blue" />
        <button onClick={add} disabled={!input.trim()} className="px-4 rounded-ios bg-ios-blue text-white text-[14px] font-semibold active:opacity-80 disabled:opacity-40">
          Qo'shish
        </button>
      </div>
    </div>
  );
};
