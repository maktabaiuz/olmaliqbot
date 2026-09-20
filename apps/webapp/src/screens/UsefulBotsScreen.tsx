import React, { useState, useEffect } from 'react';
import { apiFetch } from '../config';
import { IosHeader } from '../components/ios/IosHeader';
import { IosCard, IosRow } from '../components/ios/IosCard';
import { useLanguage } from '../context/LanguageContext';

export interface UsefulBotsScreenProps {
  onBack: () => void;
}

interface BotSummary {
  key: string;
  name: string;
  description: string;
  icon: string;
  enabledGroupCount: number;
}

interface GroupToggle {
  id: string;
  chatId: string;
  title: string;
  isEnabled: boolean;
}

interface AllowedDomainItem {
  id: string;
  domain: string;
}

interface GamblingKeywordItem {
  id: string;
  keyword: string;
}

/** iOS-uslubidagi yoqish/o'chirish tugmasi (pill toggle). */
const IosToggle: React.FC<{ enabled: boolean; onToggle: () => void }> = ({ enabled, onToggle }) => (
  <button
    onClick={onToggle}
    className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${enabled ? 'bg-ios-green' : 'bg-ios-fill/30'}`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
        enabled ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

/**
 * "Foydali botlar" — xavfsizlik/moderatsiya filtrlarini (so'kinish,
 * spam-link, qimor, firibgarlik, flud) HAR BIR GURUHDA alohida yoqish/
 * o'chirish uchun ekran. Ro'yxat -> bitta botni tanlash -> shu bot uchun
 * barcha guruhlar ro'yxati, har birida iOS-uslubidagi yoqish/o'chirish
 * tugmasi (o'zgarish darhol serverga saqlanadi).
 */
export const UsefulBotsScreen: React.FC<UsefulBotsScreenProps> = ({ onBack }) => {
  const { t } = useLanguage();
  const [bots, setBots] = useState<BotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBot, setSelectedBot] = useState<BotSummary | null>(null);
  const [groups, setGroups] = useState<GroupToggle[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  // "Spam-link filtri" uchun: qaysi guruhning ruxsat etilgan domenlar
  // ro'yxati hozir ochilgan (kengaytirilgan), va shu guruh uchun domenlar.
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [domainsByGroup, setDomainsByGroup] = useState<Record<string, AllowedDomainItem[]>>({});
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [newDomainInput, setNewDomainInput] = useState('');

  // "Qimor filtri" uchun: GLOBAL qo'shimcha taqiqlangan sayt nomlari
  // (guruhga bog'liq emas, barcha guruhlar uchun bitta ro'yxat).
  const [gamblingKeywords, setGamblingKeywords] = useState<GamblingKeywordItem[]>([]);
  const [gamblingKeywordsLoading, setGamblingKeywordsLoading] = useState(false);
  const [newKeywordInput, setNewKeywordInput] = useState('');

  const loadGamblingKeywords = async () => {
    setGamblingKeywordsLoading(true);
    try {
      const res = await apiFetch('/api/admin/useful-bots/gambling-keywords');
      if (res.ok) setGamblingKeywords(await res.json());
    } catch (err) {
      console.error('Failed to load gambling keywords:', err);
    } finally {
      setGamblingKeywordsLoading(false);
    }
  };

  const addGamblingKeyword = async () => {
    const keyword = newKeywordInput.trim();
    if (!keyword) return;
    try {
      const res = await apiFetch('/api/admin/useful-bots/gambling-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
      });
      if (res.ok) {
        const data = await res.json();
        setGamblingKeywords((prev) => [data.keyword, ...prev.filter((k) => k.keyword !== data.keyword.keyword)]);
        setNewKeywordInput('');
      }
    } catch (err) {
      console.error('Failed to add gambling keyword:', err);
    }
  };

  const removeGamblingKeyword = async (id: string) => {
    setGamblingKeywords((prev) => prev.filter((k) => k.id !== id));
    try {
      await apiFetch(`/api/admin/useful-bots/gambling-keywords/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to remove gambling keyword:', err);
    }
  };

  const loadBots = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/useful-bots');
      if (res.ok) setBots(await res.json());
    } catch (err) {
      console.error('Failed to load useful bots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBots();
  }, []);

  const openBot = async (bot: BotSummary) => {
    setSelectedBot(bot);
    setGroupsLoading(true);
    if (bot.key === 'GAMBLING') loadGamblingKeywords();
    try {
      const res = await apiFetch(`/api/admin/useful-bots/${bot.key}/groups`);
      if (res.ok) setGroups(await res.json());
    } catch (err) {
      console.error('Failed to load bot groups:', err);
    } finally {
      setGroupsLoading(false);
    }
  };

  const toggleGroup = async (group: GroupToggle) => {
    if (!selectedBot) return;
    const nextEnabled = !group.isEnabled;
    // Optimistic: darhol ekranda yangilanadi, xato bo'lsa qaytariladi.
    setGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, isEnabled: nextEnabled } : g)));
    try {
      const res = await apiFetch(`/api/admin/useful-bots/${selectedBot.key}/groups/${group.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: nextEnabled }),
      });
      if (!res.ok) throw new Error('Saqlashda xato');
    } catch (err) {
      console.error('Failed to toggle bot for group:', err);
      setGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, isEnabled: !nextEnabled } : g)));
    }
  };

  const toggleDomainEditor = async (groupId: string) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      return;
    }
    setExpandedGroupId(groupId);
    setNewDomainInput('');
    if (!domainsByGroup[groupId]) {
      setDomainsLoading(true);
      try {
        const res = await apiFetch(`/api/admin/useful-bots/groups/${groupId}/allowed-domains`);
        if (res.ok) {
          const data = await res.json();
          setDomainsByGroup((prev) => ({ ...prev, [groupId]: data }));
        }
      } catch (err) {
        console.error('Failed to load allowed domains:', err);
      } finally {
        setDomainsLoading(false);
      }
    }
  };

  const addDomain = async (groupId: string) => {
    const domain = newDomainInput.trim();
    if (!domain) return;
    try {
      const res = await apiFetch(`/api/admin/useful-bots/groups/${groupId}/allowed-domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      if (res.ok) {
        const data = await res.json();
        setDomainsByGroup((prev) => ({
          ...prev,
          [groupId]: [data.domain, ...(prev[groupId] || []).filter((d) => d.domain !== data.domain.domain)],
        }));
        setNewDomainInput('');
      }
    } catch (err) {
      console.error('Failed to add domain:', err);
    }
  };

  const removeDomain = async (groupId: string, domainId: string) => {
    setDomainsByGroup((prev) => ({ ...prev, [groupId]: (prev[groupId] || []).filter((d) => d.id !== domainId) }));
    try {
      await apiFetch(`/api/admin/useful-bots/allowed-domains/${domainId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to remove domain:', err);
    }
  };

  // ─── VIEW 2: bitta bot uchun guruhlar ro'yxati ───────────────────────────
  if (selectedBot) {
    return (
      <div className="flex flex-col gap-4 -mx-4 px-4 pt-1 pb-16">
        <IosHeader
          title={`${selectedBot.icon} ${selectedBot.name}`}
          subtitle={selectedBot.description}
          onBack={() => { setSelectedBot(null); loadBots(); }}
          backLabel={t('action_back')}
        />

        {/* GLOBAL taqiqlangan sayt nomlari — faqat Qimor filtri uchun, barcha
            guruhlarga bitta ro'yxat sifatida ta'sir qiladi. */}
        {selectedBot.key === 'GAMBLING' && (
          <div className="bg-ios-card rounded-ios-lg shadow-sm p-3.5">
            <h3 className="text-[13px] font-semibold text-ios-label mb-1">
              🚫 Taqiqlangan saytlar (barcha guruhlarda)
            </h3>
            <p className="text-[11px] text-ios-label-secondary/70 mb-2">
              Yangi qimor sayti chiqsa, shu yerga qo'shing — darhol BARCHA guruhlarda taqiqlanadi.
            </p>
            {gamblingKeywordsLoading ? (
              <p className="text-[11px] text-ios-label-secondary/70">Yuklanmoqda...</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {gamblingKeywords.map((k) => (
                  <span
                    key={k.id}
                    className="bg-ios-red/10 text-ios-red text-[12px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5"
                  >
                    {k.keyword}
                    <button onClick={() => removeGamblingKeyword(k.id)} className="text-ios-red/70 active:text-ios-red font-bold">×</button>
                  </span>
                ))}
                {gamblingKeywords.length === 0 && (
                  <span className="text-[11px] text-ios-label-secondary/70">Hali qo'shilmagan (hozircha faqat kod ichidagi taniqli brendlar ishlaydi)</span>
                )}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newKeywordInput}
                onChange={(e) => setNewKeywordInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addGamblingKeyword(); }}
                placeholder="masalan: yangi-qimor-sayti"
                className="flex-1 bg-ios-fill/[0.08] rounded-full px-3 py-1.5 text-[12px] text-ios-label outline-none"
              />
              <button
                onClick={addGamblingKeyword}
                className="bg-ios-red text-white text-[12px] font-bold px-3 py-1.5 rounded-full shrink-0"
              >
                Qo'shish
              </button>
            </div>
          </div>
        )}

        {groupsLoading ? (
          <div className="text-center text-[13px] text-ios-label-secondary/70 py-8">Yuklanmoqda...</div>
        ) : groups.length === 0 ? (
          <IosCard>
            <div className="p-8 text-center text-[13px] text-ios-label-secondary/70">
              Hali hech qanday guruh yo'q — bot birorta guruhga qo'shilishi kerak.
            </div>
          </IosCard>
        ) : (
          <IosCard>
            {groups.map((g, idx) => (
              <div key={g.id} style={idx === groups.length - 1 ? undefined : { borderBottom: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-[13px] font-medium text-ios-label truncate">{g.title}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedBot.key === 'SPAM_LINK' && (
                      <button
                        onClick={() => toggleDomainEditor(g.id)}
                        className="text-[11px] font-semibold text-ios-blue px-2 py-1 rounded-ios active:bg-ios-blue/10"
                      >
                        {expandedGroupId === g.id ? 'Yopish' : 'Domenlar'}
                      </button>
                    )}
                    <IosToggle enabled={g.isEnabled} onToggle={() => toggleGroup(g)} />
                  </div>
                </div>

                {/* Ruxsat etilgan domenlar tahriri — faqat Spam-link filtri uchun */}
                {selectedBot.key === 'SPAM_LINK' && expandedGroupId === g.id && (
                  <div className="px-4 pb-3.5 pt-1 bg-ios-fill/[0.04]">
                    <p className="text-[11px] text-ios-label-secondary/70 mb-2">
                      Bu domenlarga havola yuborishga ruxsat beriladi (masalan o'zining rasmiy sayti).
                      "t.me/olmaliq_bot" va "olmaliq.online" har doim, alohida qo'shmasdan ruxsat etilgan.
                    </p>
                    {domainsLoading ? (
                      <p className="text-[11px] text-ios-label-secondary/70">Yuklanmoqda...</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {(domainsByGroup[g.id] || []).map((d) => (
                          <span
                            key={d.id}
                            className="bg-ios-blue/10 text-ios-blue text-[12px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5"
                          >
                            {d.domain}
                            <button onClick={() => removeDomain(g.id, d.id)} className="text-ios-blue/70 active:text-ios-red font-bold">×</button>
                          </span>
                        ))}
                        {(domainsByGroup[g.id] || []).length === 0 && (
                          <span className="text-[11px] text-ios-label-secondary/70">Hali qo'shilmagan</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newDomainInput}
                        onChange={(e) => setNewDomainInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addDomain(g.id); }}
                        placeholder="masalan: instagram.com/mystore"
                        className="flex-1 bg-ios-fill/[0.08] rounded-full px-3 py-1.5 text-[12px] text-ios-label outline-none"
                      />
                      <button
                        onClick={() => addDomain(g.id)}
                        className="bg-ios-blue text-white text-[12px] font-bold px-3 py-1.5 rounded-full shrink-0"
                      >
                        Qo'shish
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </IosCard>
        )}
      </div>
    );
  }

  // ─── VIEW 1: botlar ro'yxati ──────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 -mx-4 px-4 pt-1 pb-16">
      <IosHeader
        title="Foydali botlar"
        subtitle="Har bir botni istalgan guruhda alohida yoqish/o'chirish mumkin. Yangi guruhda hammasi o'chiq boshlanadi."
        onBack={onBack}
        backLabel={t('action_back')}
      />

      {loading ? (
        <div className="text-center text-[13px] text-ios-label-secondary/70 py-8">Yuklanmoqda...</div>
      ) : (
        <IosCard>
          {bots.map((bot, idx) => (
            <IosRow key={bot.key} onClick={() => openBot(bot)} last={idx === bots.length - 1}>
              <span className="flex items-center gap-3 min-w-0">
                <span className="text-[20px] shrink-0">{bot.icon}</span>
                <span className="min-w-0">
                  <span className="block font-medium text-[15px] text-ios-label">{bot.name}</span>
                  <span className="block text-[12px] text-ios-label-secondary/70 truncate">{bot.description}</span>
                </span>
              </span>
              <span className="flex items-center gap-1 shrink-0">
                <span className="text-[11px] font-semibold text-ios-green">
                  {bot.enabledGroupCount > 0 ? `${bot.enabledGroupCount} ta guruhda` : "O'chiq"}
                </span>
                <span className="material-symbols-outlined text-[18px] text-ios-label-secondary/40">chevron_right</span>
              </span>
            </IosRow>
          ))}
        </IosCard>
      )}
    </div>
  );
};
