import React, { useState, useEffect } from 'react';
import { apiFetch } from '../config';
import { IosHeader } from '../components/ios/IosHeader';
import { IosCard } from '../components/ios/IosCard';
import { useLanguage } from '../context/LanguageContext';

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
  const { t } = useLanguage();
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
    <div className="flex flex-col gap-4 -mx-4 px-4 pt-1 pb-16">
      <IosHeader title="Bloklangan xabarlar" onBack={onBack} backLabel={t('action_back')} />

      {/* Kategoriya filtri */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setCategoryFilter(null)}
          className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
            !categoryFilter
              ? 'bg-ios-blue text-white'
              : 'bg-ios-fill/[0.12] text-ios-label-secondary'
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
                ? 'bg-ios-blue text-white'
                : 'bg-ios-fill/[0.12] text-ios-label-secondary'
            }`}
          >
            {meta.icon} {meta.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-[13px] text-ios-label-secondary/70 py-8">Yuklanmoqda...</div>
      ) : logs.length === 0 ? (
        <IosCard>
          <div className="p-8 text-center text-[13px] text-ios-label-secondary/70">
            Hozircha bloklangan xabar yo'q.
          </div>
        </IosCard>
      ) : (
        <div className="flex flex-col gap-2.5">
          {logs.map((log) => {
            const meta = CATEGORY_LABELS[log.category] || { label: log.category, icon: '🛡' };
            return (
              <div key={log.id} className="bg-ios-card rounded-ios-lg shadow-sm p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-ios-blue">
                    {meta.icon} {meta.label}
                  </span>
                  <span className="text-[10px] text-ios-label-secondary/60">
                    {new Date(log.createdAt).toLocaleString('uz-UZ')}
                  </span>
                </div>
                <p className="text-[10px] text-ios-label-secondary/70 mb-1">
                  📍 {log.groupTitle} · 👤 {log.telegramUserId}
                </p>
                <p className="text-[13px] text-ios-label bg-ios-fill/[0.06] rounded-ios px-3 py-2 break-words">
                  {log.rawMessage}
                </p>

                {log.category === 'SPAM_LINK' && (
                  <div className="mt-2">
                    {log.aiAnalysis ? (
                      <p className="text-[12px] text-ios-green bg-ios-green/10 rounded-ios px-3 py-2">
                        🤖 {log.aiAnalysis}
                      </p>
                    ) : (
                      <button
                        onClick={() => analyzeLink(log)}
                        disabled={analyzingId === log.id}
                        className="text-[12px] font-bold text-ios-blue px-3 py-1.5 rounded-full border border-ios-blue/30 active:bg-ios-blue/10 disabled:opacity-50 transition-colors"
                      >
                        {analyzingId === log.id ? 'Tekshirilmoqda...' : '🤖 Tahlil qil'}
                      </button>
                    )}
                    {analyzeError[log.id] && (
                      <p className="text-[11px] text-ios-red mt-1">{analyzeError[log.id]}</p>
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
