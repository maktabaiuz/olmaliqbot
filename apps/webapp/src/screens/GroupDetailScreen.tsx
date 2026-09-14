import React, { useState, useEffect } from 'react';
import { avatarColorForName } from '../utils/avatarColor';

interface GroupDetailScreenProps {
  groupId: string;
  groupTitle: string;
  onBack: () => void;
}

const IOS_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, sans-serif';

const MODERATION_LABELS: Record<string, string> = {
  PROFANITY: "So'kinish",
  SPAM_LINK: 'Spam-link',
  GAMBLING: 'Qimor',
  SCAM: 'Firibgarlik',
  FLOOD: 'Flud',
};

interface GroupDetail {
  id: string;
  chatId: string;
  title: string;
  createdAt: string;
  memberCount: number | null;
  health: {
    botStatus: string | null;
    canDelete: boolean;
    canRestrict: boolean;
    hasIssue: boolean;
    message: string;
  };
  enabledFeatureKeys: string[];
  periodDays: number;
  queryStats: {
    total: number;
    resolved: number;
    resolvedPercent: number | null;
  };
  unresolvedTopics: { categoryName: string | null; count: number }[];
  activityByHour: number[];
  moderationStats: {
    total: number;
    byCategory: { category: string; count: number }[];
  };
}

export const GroupDetailScreen: React.FC<GroupDetailScreenProps> = ({ groupId, groupTitle, onBack }) => {
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<7 | 30>(7);

  useEffect(() => {
    setLoading(true);
    const initData = window.Telegram?.WebApp?.initData || '';
    fetch(`/api/admin/groups/${groupId}?days=${days}`, { headers: { 'x-init-data': initData } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setDetail(data))
      .finally(() => setLoading(false));
  }, [groupId, days]);

  const name = detail?.title || groupTitle;
  const maxHourCount = detail ? Math.max(1, ...detail.activityByHour) : 1;

  return (
    <div className="animate-fade-in -mx-4 -mt-2 pb-10" style={{ fontFamily: IOS_FONT }}>
      <div className="px-4 pt-1 pb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-0.5 text-[#007AFF] dark:text-[#0A84FF] text-[15px] font-normal -ml-1.5 active:opacity-40"
        >
          <span className="material-symbols-outlined text-[22px]">chevron_left</span>
          Guruhlar
        </button>
      </div>

      <div className="flex flex-col items-center gap-2 pt-2 pb-6">
        <span
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-white text-[28px] font-semibold shadow-sm"
          style={{ backgroundColor: avatarColorForName(name || '?') }}
        >
          {name.trim()[0]?.toUpperCase() || '?'}
        </span>
        <h1 className="text-[20px] font-semibold text-on-surface dark:text-white text-center px-6">{name}</h1>
        <p className="text-[13px] text-[#8E8E93]">
          {detail?.memberCount !== null && detail?.memberCount !== undefined ? `${detail.memberCount} a'zo` : 'Yuklanmoqda...'}
        </p>
      </div>

      {loading || !detail ? (
        <div className="px-4 space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] rounded-[10px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="px-4 space-y-6">
          {/* Bot holati */}
          <div
            className="rounded-[10px] shadow-sm p-3.5 flex items-center gap-3"
            style={{
              backgroundColor: detail.health.hasIssue ? 'rgba(255,59,48,0.1)' : 'rgba(52,199,89,0.1)',
            }}
          >
            <span
              className="material-symbols-outlined text-[24px]"
              style={{ color: detail.health.hasIssue ? '#FF3B30' : '#34C759' }}
            >
              {detail.health.hasIssue ? 'error' : 'check_circle'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-medium text-on-surface dark:text-white">{detail.health.message}</p>
              {detail.enabledFeatureKeys.length > 0 && (
                <p className="text-[12px] text-[#8E8E93] mt-0.5">
                  Yoqilgan: {detail.enabledFeatureKeys.map((k) => MODERATION_LABELS[k] || k).join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Davr almashtirgich */}
          <div className="flex bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] rounded-[10px] p-[2px]">
            {([7, 30] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`flex-1 py-1.5 rounded-[8px] text-[13px] font-medium transition-colors ${
                  days === d
                    ? 'bg-white dark:bg-[#3A3A3C] text-on-surface dark:text-white shadow-sm'
                    : 'text-[#8E8E93]'
                }`}
              >
                {d} kun
              </button>
            ))}
          </div>

          {/* So'rov/javob statistikasi */}
          <div>
            <span className="text-[13px] font-normal text-[#8E8E93] uppercase tracking-wide px-1 mb-1.5 block">
              So'rov / javob
            </span>
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] shadow-sm p-3.5 flex items-center justify-around text-center">
              <div>
                <p className="text-[22px] font-semibold text-on-surface dark:text-white">{detail.queryStats.total}</p>
                <p className="text-[11px] text-[#8E8E93]">jami so'rov</p>
              </div>
              <div>
                <p className="text-[22px] font-semibold text-on-surface dark:text-white">{detail.queryStats.resolved}</p>
                <p className="text-[11px] text-[#8E8E93]">javob berilgan</p>
              </div>
              <div>
                <p className="text-[22px] font-semibold" style={{ color: '#007AFF' }}>
                  {detail.queryStats.resolvedPercent !== null ? `${detail.queryStats.resolvedPercent}%` : '—'}
                </p>
                <p className="text-[11px] text-[#8E8E93]">javob foizi</p>
              </div>
            </div>
          </div>

          {/* Javobsiz qolgan mavzular */}
          <div>
            <span className="text-[13px] font-normal text-[#8E8E93] uppercase tracking-wide px-1 mb-1.5 block">
              Javobsiz qolgan mavzular
            </span>
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] shadow-sm overflow-hidden">
              {detail.unresolvedTopics.length === 0 ? (
                <div className="p-3.5 text-[13px] text-[#8E8E93] text-center">Bu davrda javobsiz qolgan mavzu yo'q</div>
              ) : (
                detail.unresolvedTopics.map((t, idx) => (
                  <div
                    key={`${t.categoryName}-${idx}`}
                    className="flex items-center justify-between px-3.5 py-2.5"
                    style={{ borderTop: idx === 0 ? 'none' : '0.5px solid rgba(60,60,67,0.29)' }}
                  >
                    <span className="text-[15px] text-on-surface dark:text-white truncate">{t.categoryName || 'Noma\'lum'}</span>
                    <span className="text-[13px] text-[#8E8E93] shrink-0">{t.count} marta</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Faollik vaqti */}
          <div>
            <span className="text-[13px] font-normal text-[#8E8E93] uppercase tracking-wide px-1 mb-1.5 block">
              Faollik vaqti (soat bo'yicha)
            </span>
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] shadow-sm p-3.5">
              <div className="flex items-end gap-[2px] h-20">
                {detail.activityByHour.map((count, hour) => (
                  <div key={hour} className="flex-1 flex flex-col items-center justify-end h-full" title={`${hour}:00 — ${count} ta`}>
                    <div
                      className="w-full rounded-[2px]"
                      style={{
                        height: `${Math.max(2, (count / maxHourCount) * 100)}%`,
                        backgroundColor: count > 0 ? '#007AFF' : 'rgba(118,118,128,0.12)',
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-[#8E8E93] mt-1.5">
                <span>00:00</span>
                <span>12:00</span>
                <span>23:00</span>
              </div>
            </div>
          </div>

          {/* Moderatsiya statistikasi */}
          <div>
            <span className="text-[13px] font-normal text-[#8E8E93] uppercase tracking-wide px-1 mb-1.5 block">
              Moderatsiya ({detail.moderationStats.total} ta xabar o'chirildi)
            </span>
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[10px] shadow-sm overflow-hidden">
              {detail.moderationStats.byCategory.length === 0 ? (
                <div className="p-3.5 text-[13px] text-[#8E8E93] text-center">Bu davrda moderatsiya harakati bo'lmagan</div>
              ) : (
                detail.moderationStats.byCategory.map((m, idx) => (
                  <div
                    key={m.category}
                    className="flex items-center justify-between px-3.5 py-2.5"
                    style={{ borderTop: idx === 0 ? 'none' : '0.5px solid rgba(60,60,67,0.29)' }}
                  >
                    <span className="text-[15px] text-on-surface dark:text-white">{MODERATION_LABELS[m.category] || m.category}</span>
                    <span className="text-[13px] text-[#8E8E93] shrink-0">{m.count} ta</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
