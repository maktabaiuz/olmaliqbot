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
              <div
                key={g.id}
                className="flex items-center justify-between gap-3 px-3.5 py-3 border-b border-outline-variant/20 dark:border-slate-800 last:border-0"
              >
                <span className="text-xs font-semibold text-on-surface dark:text-slate-100 truncate">{g.title}</span>
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
