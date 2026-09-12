import React, { useState, useEffect } from 'react';
import { apiFetch } from '../config';

export interface ModerationLogsScreenProps {
  onBack: () => void;
}

interface LogItem {
  id: string;
  chatId: string;
  groupTitle: string;
  telegramUserId: string;
  category: string;
  rawMessage: string;
  aiAnalysis: string | null;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  PROFANITY: { label: "So'kinish", icon: '🤬' },
  SPAM_LINK: { label: 'Spam-link', icon: '🔗' },
  GAMBLING: { label: 'Qimor', icon: '🎰' },
  SCAM: { label: 'Firibgarlik', icon: '💸' },
  FLOOD: { label: 'Flud', icon: '🌊' },
};

/**
 * "Bloklangan xabarlar" — barcha 5 moderatsiya filtri bo'yicha kim, qachon,
 * nima uchun jazolanganini ko'rish. SPAM_LINK yozuvlarida "Tahlil qil"
 * tugmasi orqali Gemini (URL Context) yordamida havolaning nima ekanini
 * talab bo'yicha tekshirish mumkin.
 */
export const ModerationLogsScreen: React.FC<ModerationLogsScreenProps> = ({ onBack }) => {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<Record<string, string>>({});

  const loadLogs = async () => {
    setLoading(true);
    try {
      const qs = categoryFilter ? `?category=${categoryFilter}` : '';
      const res = await apiFetch(`/api/admin/moderation-logs${qs}`);
      if (res.ok) setLogs(await res.json());
    } catch (err) {
      console.error('Failed to load moderation logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  const analyzeLink = async (log: LogItem) => {
    setAnalyzingId(log.id);
    setAnalyzeError((prev) => ({ ...prev, [log.id]: '' }));
    try {
      const res = await apiFetch(`/api/admin/moderation-logs/${log.id}/analyze-link`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setLogs((prev) => prev.map((l) => (l.id === log.id ? { ...l, aiAnalysis: data.aiAnalysis } : l)));
      } else {
        setAnalyzeError((prev) => ({ ...prev, [log.id]: data.message || "Tahlil qilib bo'lmadi" }));
      }
    } catch (err) {
      setAnalyzeError((prev) => ({ ...prev, [log.id]: 'Aloqa xatoligi' }));
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in pb-16">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-1.5 text-on-surface-variant hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px] font-bold">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold text-on-surface dark:text-slate-100">Bloklangan xabarlar</h1>
      </div>

      {/* Kategoriya filtri */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 -mx-4 px-4">
        <button
          onClick={() => setCategoryFilter(null)}
          className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
            !categoryFilter
              ? 'bg-primary dark:bg-sky-500 text-white'
              : 'bg-surface-container-high dark:bg-[#1C2733] text-on-surface-variant dark:text-slate-300 border border-outline-variant/20'
          }`}
        >
          Hammasi
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setCategoryFilter(key)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
              categoryFilter === key
                ? 'bg-primary dark:bg-sky-500 text-white'
                : 'bg-surface-container-high dark:bg-[#1C2733] text-on-surface-variant dark:text-slate-300 border border-outline-variant/20'
            }`}
          >
            {meta.icon} {meta.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-xs text-slate-500 py-8">Yuklanmoqda...</div>
      ) : logs.length === 0 ? (
        <div className="bg-surface dark:bg-[#17212B] border border-outline-variant/30 dark:border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500 shadow-sm">
          Hozircha bloklangan xabar yo'q.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {logs.map((log) => {
            const meta = CATEGORY_LABELS[log.category] || { label: log.category, icon: '🛡' };
            return (
              <div
                key={log.id}
                className="bg-surface dark:bg-[#17212B] rounded-2xl border border-outline-variant/30 dark:border-slate-800 shadow-sm p-3.5"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-primary dark:text-sky-400">
                    {meta.icon} {meta.label}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(log.createdAt).toLocaleString('uz-UZ')}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mb-1">
                  📍 {log.groupTitle} · 👤 {log.telegramUserId}
                </p>
                <p className="text-xs text-on-surface dark:text-slate-200 bg-surface-container-low dark:bg-[#1C2733] rounded-xl px-3 py-2 break-words">
                  {log.rawMessage}
                </p>

                {log.category === 'SPAM_LINK' && (
                  <div className="mt-2">
                    {log.aiAnalysis ? (
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 rounded-xl px-3 py-2">
                        🤖 {log.aiAnalysis}
                      </p>
                    ) : (
                      <button
                        onClick={() => analyzeLink(log)}
                        disabled={analyzingId === log.id}
                        className="text-[11px] font-bold text-primary dark:text-sky-400 px-3 py-1.5 rounded-full border border-primary/30 dark:border-sky-500/30 hover:bg-primary/10 dark:hover:bg-sky-500/10 disabled:opacity-50"
                      >
                        {analyzingId === log.id ? 'Tekshirilmoqda...' : '🤖 Tahlil qil'}
                      </button>
                    )}
                    {analyzeError[log.id] && (
                      <p className="text-[10px] text-red-500 mt-1">{analyzeError[log.id]}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
