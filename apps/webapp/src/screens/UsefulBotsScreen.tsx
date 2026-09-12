import React, { useState, useEffect } from 'react';
import { apiFetch } from '../config';

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

/**
 * "Foydali botlar" — xavfsizlik/moderatsiya filtrlarini (so'kinish,
 * spam-link, qimor, firibgarlik, flud) HAR BIR GURUHDA alohida yoqish/
 * o'chirish uchun ekran. Ro'yxat -> bitta botni tanlash -> shu bot uchun
 * barcha guruhlar ro'yxati, har birida iOS-uslubidagi yoqish/o'chirish
 * tugmasi (o'zgarish darhol serverga saqlanadi).
 */
export const UsefulBotsScreen: React.FC<UsefulBotsScreenProps> = ({ onBack }) => {
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
      <div className="flex flex-col gap-4 animate-fade-in pb-16">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSelectedBot(null); loadBots(); }}
            className="p-1.5 text-on-surface-variant hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px] font-bold">arrow_back</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">{selectedBot.icon}</span>
            <div>
              <h1 className="text-lg font-bold text-on-surface dark:text-slate-100">{selectedBot.name}</h1>
              <p className="text-[10px] text-slate-500">{selectedBot.description}</p>
            </div>
          </div>
        </div>

        {groupsLoading ? (
          <div className="text-center text-xs text-slate-500 py-8">Yuklanmoqda...</div>
        ) : groups.length === 0 ? (
          <div className="bg-surface dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500 shadow-sm">
            Hali hech qanday guruh yo'q — bot birorta guruhga qo'shilishi kerak.
          </div>
        ) : (
          <div className="bg-surface dark:bg-[#17212B] rounded-2xl border border-outline-variant/30 dark:border-slate-800 shadow-sm overflow-hidden">
            {groups.map((g) => (
              <div key={g.id} className="border-b border-outline-variant/20 dark:border-slate-800 last:border-0">
                <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                  <span className="text-xs font-semibold text-on-surface dark:text-slate-100 truncate">{g.title}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedBot.key === 'SPAM_LINK' && (
                      <button
                        onClick={() => toggleDomainEditor(g.id)}
                        className="text-[10px] font-bold text-primary dark:text-sky-400 px-2 py-1 rounded-lg hover:bg-primary/10 dark:hover:bg-sky-500/10"
                      >
                        {expandedGroupId === g.id ? 'Yopish' : 'Domenlar'}
                      </button>
                    )}
                    {/* iOS uslubidagi yoqish/o'chirish tugmasi */}
                    <button
                      onClick={() => toggleGroup(g)}
                      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${
                        g.isEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                          g.isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Ruxsat etilgan domenlar tahriri — faqat Spam-link filtri uchun */}
                {selectedBot.key === 'SPAM_LINK' && expandedGroupId === g.id && (
                  <div className="px-3.5 pb-3.5 pt-1 bg-surface-container-low/40 dark:bg-slate-900/30">
                    <p className="text-[10px] text-slate-500 mb-2">
                      Bu domenlarga havola yuborishga ruxsat beriladi (masalan o'zining rasmiy sayti).
                      "t.me/olmaliq_bot" va "olmaliq.online" har doim, alohida qo'shmasdan ruxsat etilgan.
                    </p>
                    {domainsLoading ? (
                      <p className="text-[10px] text-slate-500">Yuklanmoqda...</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {(domainsByGroup[g.id] || []).map((d) => (
                          <span
                            key={d.id}
                            className="bg-primary/10 dark:bg-sky-500/20 text-primary dark:text-sky-300 text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5"
                          >
                            {d.domain}
                            <button onClick={() => removeDomain(g.id, d.id)} className="hover:text-red-400 font-bold">×</button>
                          </span>
                        ))}
                        {(domainsByGroup[g.id] || []).length === 0 && (
                          <span className="text-[10px] text-slate-500">Hali qo'shilmagan</span>
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
                        className="flex-1 bg-surface-container-low dark:bg-[#1C2733] border border-outline-variant/40 dark:border-slate-700 rounded-full px-3 py-1.5 text-[11px] outline-none"
                      />
                      <button
                        onClick={() => addDomain(g.id)}
                        className="bg-sky-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shrink-0"
                      >
                        Qo'shish
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── VIEW 1: botlar ro'yxati ──────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 animate-fade-in pb-16">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-1.5 text-on-surface-variant hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px] font-bold">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold text-on-surface dark:text-slate-100">Foydali botlar</h1>
      </div>
      <p className="text-[11px] text-slate-500 -mt-2">
        Har bir botni istalgan guruhda alohida yoqish/o'chirish mumkin. Yangi guruhda hammasi o'chiq boshlanadi.
      </p>

      {loading ? (
        <div className="text-center text-xs text-slate-500 py-8">Yuklanmoqda...</div>
      ) : (
        <div className="bg-surface dark:bg-[#17212B] rounded-2xl border border-outline-variant/30 dark:border-slate-800 shadow-sm overflow-hidden">
          {bots.map((bot) => (
            <button
              key={bot.key}
              onClick={() => openBot(bot)}
              className="w-full flex items-center gap-3 px-3.5 py-3 border-b border-outline-variant/20 dark:border-slate-800 last:border-0 hover:bg-surface-container-low/60 dark:hover:bg-slate-800/40 active:scale-[0.99] transition-all text-left"
            >
              <span className="text-xl shrink-0">{bot.icon}</span>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-xs text-on-surface dark:text-slate-100">{bot.name}</h4>
                <p className="text-[10px] text-slate-500 truncate">{bot.description}</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                {bot.enabledGroupCount > 0 ? `${bot.enabledGroupCount} ta guruhda` : "O'chiq"}
              </span>
              <span className="material-symbols-outlined text-[16px] text-slate-400 shrink-0">chevron_right</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
