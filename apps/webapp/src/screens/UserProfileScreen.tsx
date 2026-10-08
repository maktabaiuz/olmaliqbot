import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../config';
import { IosHeader } from '../components/ios/IosHeader';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { Avatar, Person, VIA, LANG, relTime, displayName, TrustBadge, openTelegram } from '../components/people/PeopleKit';

/**
 * Bitta odamning profili (2026-10-08): Telegram ma'lumotlari, qayerdan
 * kelgani, faolligi, e'lonlari, guruhlari va to'liq vaqt chizig'i.
 */

interface ProfileData {
  person: Person;
  groups: { chatId: string; title: string; messages: number; last: string }[];
  listings: { id: string; name: string; type: string; status: string; moderationStatus: string | null; rejectionNote: string | null; createdAt: string; category: string }[];
  timeline: { at: string; kind: string; title: string; detail?: string; tone?: 'good' | 'bad' | 'neutral' }[];
}

const KIND_ICON: Record<string, string> = { query: 'help', dm: 'chat', complaint: 'report', listing: 'sell', moderation: 'gavel', join: 'waving_hand' };

export interface UserProfileScreenProps {
  telegramId: string;
  onBack: () => void;
  onOpenChat: (telegramId: string, fullName: string, username?: string) => void;
  onOpenListing?: (listingId: string) => void;
}

export const UserProfileScreen: React.FC<UserProfileScreenProps> = ({ telegramId, onBack, onOpenChat, onOpenListing }) => {
  const { user } = useAuth();
  const isSuper = user?.role === 'SUPER_ADMIN';
  const { showToast } = useFeedback();
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [armSuspend, setArmSuspend] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await apiFetch(`/api/admin/people/${telegramId}`);
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.message || 'Topilmadi');
      setData(d);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [telegramId]);

  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 20000);
    return () => clearInterval(t);
  }, [load]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} nusxalandi`, 'success');
    } catch {
      showToast(text, 'success');
    }
  };

  const toggleSuspend = async () => {
    if (!data) return;
    if (!armSuspend) return setArmSuspend(true);
    setArmSuspend(false);
    const suspend = !data.person.suspended;
    const r = await apiFetch(`/api/admin/people/${telegramId}/suspend`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suspend }) });
    if (r.ok) {
      showToast(suspend ? "To'xtatildi — botdan foydalana olmaydi" : 'Qayta yoqildi', 'success');
      load();
    } else showToast('Xatolik', 'error');
  };

  if (error) {
    return (
      <div className="flex flex-col gap-4 pb-16">
        <IosHeader title="Profil" onBack={onBack} />
        <div className="bg-ios-card rounded-ios p-8 text-center text-[14px] text-ios-label-secondary">{error}</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex flex-col gap-4 pb-16">
        <IosHeader title="Profil" onBack={onBack} />
        <div className="bg-ios-card rounded-ios p-8 text-center text-[14px] text-ios-label-secondary">Yuklanmoqda…</div>
      </div>
    );
  }

  const p = data.person;
  const name = displayName(p);
  const via = VIA[p.via] || VIA.group;

  return (
    <div className="flex flex-col gap-3.5 animate-fade-in pb-24">
      <IosHeader title="Profil" onBack={onBack} />

      {/* Qahramon kartasi */}
      <div className="bg-ios-card rounded-ios-lg shadow-sm p-4 flex flex-col items-center text-center">
        <span className="relative">
          <Avatar tgId={p.telegramId} name={name} size={86} ring="ring-4 ring-ios-bg" />
          {p.activeRecently && !p.blocked && <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-ios-green" style={{ boxShadow: '0 0 0 3px rgb(var(--ios-card))' }} />}
        </span>
        <div className="mt-2.5 flex items-center gap-1.5 justify-center flex-wrap">
          <span className={`text-[21px] font-bold ${p.suspended ? 'line-through text-ios-label-secondary' : 'text-ios-label'}`}>{name}</span>
          {p.isPremium && <span title="Telegram Premium">⭐</span>}
        </div>
        {p.username && <div className="text-[14px] text-ios-blue">@{p.username}</div>}
        <div className="mt-2 flex items-center gap-1.5 flex-wrap justify-center">
          <span className={`flex items-center gap-0.5 text-[11.5px] font-semibold rounded-full px-2 py-[2px] ${via.cls}`}>
            <span className="material-symbols-outlined text-[13px]">{via.icon}</span>
            {via.label}
          </span>
          {p.languageCode && <span className="text-[11.5px] font-semibold rounded-full px-2 py-[2px] bg-ios-fill/[0.14] text-ios-label-secondary">{LANG[p.languageCode] || p.languageCode}</span>}
          <TrustBadge trust={p.trust} />
          {p.blocked && <span className="text-[11.5px] font-semibold rounded-full px-2 py-[2px] bg-ios-red/15 text-ios-red">🚫 Botni bloklagan</span>}
          {p.suspended && <span className="text-[11.5px] font-semibold rounded-full px-2 py-[2px] bg-ios-label-secondary/20 text-ios-label-secondary">⏸ To'xtatilgan</span>}
        </div>
        <button onClick={() => copy(p.telegramId, 'Telegram ID')} className="mt-2 text-[12px] text-ios-label-secondary flex items-center gap-1 active:opacity-60">
          ID {p.telegramId}
          <span className="material-symbols-outlined text-[14px]">content_copy</span>
        </button>

        <div className="mt-3.5 w-full grid grid-cols-3 gap-2">
          <button
            disabled={!p.startedBot || p.blocked}
            onClick={() => onOpenChat(p.telegramId, name, p.username || undefined)}
            className="flex flex-col items-center gap-0.5 py-2.5 rounded-ios bg-ios-blue text-white text-[12px] font-semibold active:opacity-80 disabled:opacity-35"
          >
            <span className="material-symbols-outlined text-[21px]">chat</span>Bot orqali yozish
          </button>
          <button onClick={() => openTelegram(p)} className="flex flex-col items-center gap-0.5 py-2.5 rounded-ios bg-ios-fill/[0.14] text-ios-blue text-[12px] font-semibold active:opacity-70">
            <span className="material-symbols-outlined text-[21px]">send</span>Telegramda
          </button>
          <button
            disabled={!isSuper}
            onClick={toggleSuspend}
            className={`flex flex-col items-center gap-0.5 py-2.5 rounded-ios text-[12px] font-semibold active:opacity-70 disabled:opacity-35 ${
              armSuspend ? 'bg-ios-red text-white' : 'bg-ios-fill/[0.14] ' + (p.suspended ? 'text-ios-green' : 'text-ios-red')
            }`}
          >
            <span className="material-symbols-outlined text-[21px]">{p.suspended ? 'play_circle' : 'pause_circle'}</span>
            {armSuspend ? 'Tasdiqlang' : p.suspended ? 'Qayta yoqish' : "To'xtatish"}
          </button>
        </div>
        {!p.startedBot && <p className="mt-2 text-[11.5px] text-ios-label-secondary">Bu odam faqat guruhda yozgan — botni ishga tushirmagan, shuning uchun bot unga yoza olmaydi.</p>}
      </div>

      {/* Ko'rsatkichlar */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { n: p.queries, l: 'Savol', c: 'text-ios-label' },
          { n: p.unanswered, l: 'Javobsiz', c: p.unanswered ? 'text-ios-orange' : 'text-ios-label' },
          { n: p.groupMessages, l: 'Guruhda', c: 'text-ios-label' },
          { n: p.rentals + p.business, l: "E'lon", c: 'text-ios-label' },
        ].map((x) => (
          <div key={x.l} className="bg-ios-card rounded-ios py-2.5 text-center shadow-sm">
            <div className={`text-[19px] font-bold ${x.c}`}>{x.n}</div>
            <div className="text-[10.5px] text-ios-label-secondary">{x.l}</div>
          </div>
        ))}
      </div>

      {/* Ma'lumot */}
      <Section title="Ma'lumot">
        <Row icon="schedule" label="Oxirgi faollik" value={relTime(p.lastActive)} />
        <Row icon="event" label="Birinchi ko'ringan" value={new Date(p.createdAt).toLocaleDateString('uz-UZ')} />
        <Row icon="flag" label="Qayerdan kelgan" value={p.sourceGroupTitle ? `👥 ${p.sourceGroupTitle}` : via.label} />
        {p.startParam && <Row icon="link" label="Kirish belgisi" value={p.startParam.startsWith('g') ? 'Guruh reklamasi havolasi' : p.startParam} />}
        <Row icon="smart_toy" label="Botni ishga tushirgan" value={p.startedBot ? 'Ha' : "Yo'q"} />
        {(p.rejected > 0 || p.moderated > 0 || p.complaints > 0) && (
          <Row icon="report" label="Ogohlantirishlar" value={`${p.rejected} rad etilgan · ${p.moderated} moderatsiya · ${p.complaints} shikoyat`} tone="bad" />
        )}
      </Section>

      {data.groups.length > 0 && (
        <Section title={`Guruhlari · ${data.groups.length}`}>
          {data.groups.map((g) => (
            <Row key={g.chatId} icon="groups" label={g.title} value={`${g.messages} xabar · ${relTime(g.last)}`} />
          ))}
        </Section>
      )}

      {data.listings.length > 0 && (
        <Section title={`E'lonlari · ${data.listings.length}`}>
          {data.listings.map((l) => (
            <button key={l.id} onClick={() => onOpenListing?.(l.id)} className="w-full text-left">
              <Row
                icon={l.type === 'ARENDA' ? 'home' : 'storefront'}
                label={l.name}
                value={l.moderationStatus === 'rejected' ? 'Rad etilgan' : l.moderationStatus === 'pending' ? 'Tekshiruvda' : l.status === 'ACTIVE' ? 'Faol' : l.status === 'ARCHIVED' ? 'Arxivda' : 'Pauzada'}
                tone={l.moderationStatus === 'rejected' ? 'bad' : l.status === 'ACTIVE' ? 'good' : undefined}
                chevron
              />
            </button>
          ))}
        </Section>
      )}

      <Section title="Faollik tarixi">
        {data.timeline.length === 0 && <div className="px-3.5 py-4 text-[13px] text-ios-label-secondary">Hozircha hech narsa yo'q</div>}
        {data.timeline.map((e, i) => (
          <div key={i} className="flex gap-3 px-3.5 py-2.5">
            <span
              className={`material-symbols-outlined text-[18px] w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                e.tone === 'good' ? 'bg-ios-green/15 text-ios-green' : e.tone === 'bad' ? 'bg-ios-orange/15 text-ios-orange' : 'bg-ios-fill/[0.14] text-ios-label-secondary'
              }`}
            >
              {KIND_ICON[e.kind] || 'circle'}
            </span>
            <span className="flex-1 min-w-0">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-[13.5px] font-semibold text-ios-label">{e.title}</span>
                <span className="text-[11px] text-ios-label-secondary shrink-0">{relTime(e.at)}</span>
              </span>
              {e.detail && <span className="block text-[12.5px] text-ios-label-secondary mt-0.5 break-words">{e.detail}</span>}
            </span>
          </div>
        ))}
      </Section>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <div className="text-[12.5px] font-normal text-ios-label-secondary/80 uppercase tracking-wide px-3.5 mb-1.5">{title}</div>
    <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden divide-y-[0.5px] divide-ios-separator/[0.29]">{children}</div>
  </div>
);

const Row: React.FC<{ icon: string; label: string; value: string; tone?: 'good' | 'bad'; chevron?: boolean }> = ({ icon, label, value, tone, chevron }) => (
  <div className="flex items-center gap-3 px-3.5 py-2.5">
    <span className="material-symbols-outlined text-[19px] text-ios-label-secondary/80 shrink-0">{icon}</span>
    <span className="flex-1 min-w-0 text-[14.5px] text-ios-label truncate">{label}</span>
    <span className={`text-[13px] shrink-0 max-w-[55%] truncate text-right ${tone === 'good' ? 'text-ios-green' : tone === 'bad' ? 'text-ios-red' : 'text-ios-label-secondary'}`}>{value}</span>
    {chevron && <span className="material-symbols-outlined text-[18px] text-ios-label-secondary/50">chevron_right</span>}
  </div>
);
