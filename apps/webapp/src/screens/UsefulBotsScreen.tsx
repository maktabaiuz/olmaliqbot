import React, { useState, useEffect } from 'react';
import { apiFetch } from '../config';
import { IosHeader } from '../components/ios/IosHeader';
import { IosCard, IosRow } from '../components/ios/IosCard';
import { useLanguage } from '../context/LanguageContext';
import { useFeedback } from '../context/FeedbackContext';

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
  requiredCount: number | null;
  linkLabel: string | null;
  linkButtonStyle: string | null;
}

// Telegram Bot API'ning HAQIQIY, cheklangan 3 ta tugma rangi — boshqa
// joylardagi (Ommaviy xabar, Xabar yuborish) bilan bir xil.
const BUTTON_STYLES: { value: string | null; label: string; swatchClass: string }[] = [
  { value: null, label: 'Standart', swatchClass: 'bg-ios-label-secondary/40' },
  { value: 'primary', label: "Ko'k", swatchClass: 'bg-ios-blue' },
  { value: 'success', label: 'Yashil', swatchClass: 'bg-ios-green' },
  { value: 'danger', label: 'Qizil', swatchClass: 'bg-ios-red' },
];

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
  const { showToast } = useFeedback();
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
    // "Majburiy taklif"ni yoqishda, agar hali son kiritilmagan bo'lsa —
    // kiritish maydonini darhol ochib qo'yamiz (aks holda son=0/bo'sh
    // holda yoqilgan botning hech qanday ma'nosi yo'q).
    if (selectedBot.key === 'MANDATORY_INVITE' && nextEnabled && !group.requiredCount) {
      setExpandedGroupId(group.id);
    }
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

  // "Majburiy taklif" — har bir guruh uchun "necha kishi" sonini VA
  // taklif-havola tugmasining matni/rangini qo'lda kiritib, "Saqlash"
  // bosilgach bittada saqlaydi (boshqa botlarga tegishli emas).
  const [requiredCountDraft, setRequiredCountDraft] = useState<Record<string, string>>({});
  const [linkLabelDraft, setLinkLabelDraft] = useState<Record<string, string>>({});
  const [linkStyleDraft, setLinkStyleDraft] = useState<Record<string, string | null>>({});
  const [savingRequiredCountFor, setSavingRequiredCountFor] = useState<string | null>(null);

  const saveRequiredCount = async (group: GroupToggle) => {
    if (!selectedBot) return;
    const raw = (requiredCountDraft[group.id] ?? String(group.requiredCount ?? '')).trim();
    const n = Number(raw);
    if (!raw || !Number.isInteger(n) || n < 1 || n > 1000) {
      showToast('1 dan 1000 gacha butun son kiriting', 'error');
      return;
    }
    const linkLabel = linkLabelDraft[group.id] ?? group.linkLabel ?? '';
    const linkButtonStyle = group.id in linkStyleDraft ? linkStyleDraft[group.id] : group.linkButtonStyle;
    setSavingRequiredCountFor(group.id);
    try {
      const res = await apiFetch(`/api/admin/useful-bots/${selectedBot.key}/groups/${group.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: group.isEnabled, requiredCount: n, linkLabel, linkButtonStyle }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, requiredCount: n, linkLabel: linkLabel || null, linkButtonStyle } : g)));
        // Draft'ni tozalab, keyingi input HAR DOIM bazadagi eng so'nggi
        // qiymatdan boshlansin — "istalgan payt qayta o'zgartirish" shart.
        setRequiredCountDraft((prev) => {
          const next = { ...prev };
          delete next[group.id];
          return next;
        });
        setLinkLabelDraft((prev) => { const next = { ...prev }; delete next[group.id]; return next; });
        setLinkStyleDraft((prev) => { const next = { ...prev }; delete next[group.id]; return next; });
        showToast(`Saqlandi: ${n} kishi`, 'success');
      } else {
        showToast(data.message || 'Saqlashda xatolik yuz berdi', 'error');
      }
    } catch (err) {
      console.error('Failed to save requiredCount:', err);
      showToast('Aloqa xatoligi', 'error');
    } finally {
      setSavingRequiredCountFor(null);
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
                    {selectedBot.key === 'MANDATORY_INVITE' && (
                      <button
                        onClick={() => setExpandedGroupId(expandedGroupId === g.id ? null : g.id)}
                        className="text-[11px] font-semibold text-ios-blue px-2 py-1 rounded-ios active:bg-ios-blue/10"
                      >
                        {expandedGroupId === g.id ? 'Yopish' : g.requiredCount ? `${g.requiredCount} kishi` : 'Soni'}
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

                {/* "Necha kishi taklif qilish shart" — faqat Majburiy taklif uchun */}
                {selectedBot.key === 'MANDATORY_INVITE' && expandedGroupId === g.id && (
                  <div className="px-4 pb-3.5 pt-1 bg-ios-fill/[0.04]">
                    <p className="text-[11px] text-ios-label-secondary/70 mb-2">
                      Yangi a'zo shuncha odam taklif qilmaguncha, bu guruhda yoza olmaydi.
                      Bot shu guruhda ADMIN bo'lishi (va taklif havolasi yaratish huquqi) shart.
                    </p>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={requiredCountDraft[g.id] ?? (g.requiredCount ?? '')}
                        onChange={(e) => setRequiredCountDraft((prev) => ({ ...prev, [g.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveRequiredCount(g); }}
                        placeholder="masalan: 10"
                        className="flex-1 bg-ios-fill/[0.08] rounded-full px-3 py-1.5 text-[12px] text-ios-label outline-none"
                      />
                      <button
                        onClick={() => saveRequiredCount(g)}
                        disabled={savingRequiredCountFor === g.id}
                        className="bg-ios-blue text-white text-[12px] font-bold px-3 py-1.5 rounded-full shrink-0 disabled:opacity-50"
                      >
                        {savingRequiredCountFor === g.id ? 'Saqlanmoqda...' : 'Saqlash'}
                      </button>
                    </div>

                    {/* Taklif-havola tugmasining matni va rangi (ixtiyoriy) —
                        havolaning O'ZI har doim shu odam uchun avtomatik
                        yaratiladi, bu yerda faqat tugmaning ko'rinishi sozlanadi. */}
                    <div className="mt-2.5 pt-2.5" style={{ borderTop: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}>
                      <p className="text-[10px] font-semibold text-ios-label-secondary/70 uppercase tracking-wide mb-1.5">
                        Taklif tugmasi ko'rinishi (ixtiyoriy)
                      </p>
                      <input
                        type="text"
                        value={linkLabelDraft[g.id] ?? (g.linkLabel ?? '')}
                        onChange={(e) => setLinkLabelDraft((prev) => ({ ...prev, [g.id]: e.target.value }))}
                        placeholder="Tugma matni, masalan: 🔗 Taklif havolam"
                        className="w-full bg-ios-fill/[0.08] rounded-full px-3 py-1.5 text-[12px] text-ios-label placeholder:text-ios-label-secondary/50 outline-none mb-1.5"
                      />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {BUTTON_STYLES.map((s) => {
                          const current = g.id in linkStyleDraft ? linkStyleDraft[g.id] : g.linkButtonStyle;
                          return (
                            <button
                              key={s.label}
                              type="button"
                              onClick={() => setLinkStyleDraft((prev) => ({ ...prev, [g.id]: s.value }))}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border ${
                                current === s.value ? 'border-ios-blue bg-ios-blue/10 text-ios-blue' : 'border-ios-fill/20 text-ios-label-secondary/70'
                              }`}
                            >
                              <span className={`w-2.5 h-2.5 rounded-full ${s.swatchClass}`} />
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
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
