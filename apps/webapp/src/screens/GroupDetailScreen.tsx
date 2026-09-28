import React, { useState, useEffect, useRef } from 'react';
import { avatarColorForName } from '../utils/avatarColor';
import { TrendAreaChart, GenericTrendChart, HorizontalBarList, RatioBar, HealthScoreRing } from '../components/MiniCharts';

// Ekran ochiq turganda har 20 soniyada yangi ma'lumot so'raladi — "real
// live rejim" (2026-09-28, aniq shunday so'ralgan). Skelet-yuklanish faqat
// BIRINCHI marta ko'rsatiladi; fon-yangilanishlarda eski ma'lumot ekranda
// qolib, jimgina yangisiga almashadi (miltillash bo'lmasligi uchun).
const LIVE_REFRESH_INTERVAL_MS = 20_000;

interface GroupDetailScreenProps {
  groupId: string;
  groupTitle: string;
  onBack: () => void;
}

const MODERATION_LABELS: Record<string, string> = {
  PROFANITY: "So'kinish",
  SPAM_LINK: 'Spam-link',
  GAMBLING: 'Qimor',
  SCAM: 'Firibgarlik',
  FLOOD: 'Flud',
};

const HAIRLINE = { borderTop: '0.5px solid rgb(var(--ios-separator) / 0.29)' };

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
  today: { total: number; resolved: number; users: number };
  dailySeries: { date: string; total: number; resolved: number; users: number }[];
  moderationStats: {
    total: number;
    byCategory: { category: string; count: number }[];
  };
  healthScore: number;
  activity: {
    totalMessages: number;
    activeMembers: number;
    activeMembersRatio: number | null;
    botUsefulnessPercent: number | null;
  };
  topActiveUsers: { name: string; messageCount: number }[];
  memberTrend: { date: string; memberCount: number }[];
  categoryDemand: { categoryName: string; count: number }[];
  landmarkDistribution: { landmarkName: string; count: number }[];
  benchmark: { avgTotalQueries: number; avgResolvedPercent: number | null; groupCount: number } | null;
  loyalUsers: { loyal: number; oneTime: number };
  languageDistribution: { latinPercent: number; cyrillicPercent: number; mixedPercent: number };
  joinConversion: { joined: number; conversionRatePercent: number | null };
  responseTime: { avgMs: number | null; p95Ms: number | null };
  topMissingNamed: { sample: string; count: number }[];
}

export const GroupDetailScreen: React.FC<GroupDetailScreenProps> = ({ groupId, groupTitle, onBack }) => {
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<7 | 30>(7);
  const [trendMetric, setTrendMetric] = useState<'total' | 'users'>('total');
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    hasLoadedOnce.current = false;
  }, [groupId]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (!hasLoadedOnce.current) setLoading(true);
      const initData = window.Telegram?.WebApp?.initData || '';
      fetch(`/api/admin/groups/${groupId}?days=${days}`, { headers: { 'x-init-data': initData } })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (cancelled || !data) return;
          setDetail(data);
          hasLoadedOnce.current = true;
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    load();
    const interval = setInterval(load, LIVE_REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [groupId, days]);

  const name = detail?.title || groupTitle;
  const maxHourCount = detail ? Math.max(1, ...detail.activityByHour) : 1;

  return (
    <div className="animate-fade-in -mx-4 -mt-2 pb-10">
      <div className="px-4 pt-1 pb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-0.5 text-ios-blue text-[15px] font-normal -ml-1 active:opacity-50 transition-opacity"
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
        <h1 className="text-[20px] font-semibold text-ios-label text-center px-6">{name}</h1>
        <div className="flex items-center gap-1.5 text-[13px] text-ios-label-secondary/70">
          <span>
            {detail?.memberCount !== null && detail?.memberCount !== undefined ? `${detail.memberCount} a'zo` : 'Yuklanmoqda...'}
          </span>
          {detail && (
            <span className="flex items-center gap-1 text-ios-green">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ios-green opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-ios-green" />
              </span>
              <span className="text-[11px] font-medium">live</span>
            </span>
          )}
        </div>
      </div>

      {loading || !detail ? (
        <div className="px-4 space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 bg-ios-fill/20 rounded-ios animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="px-4 space-y-6">
          {/* Guruh salomatlik balli — yagona, bir qarashda tushunarli
              yakuniy baho (javob foizi + faol a'zolar + moderatsiya + bot
              holati birlashtirilgan) */}
          <div className="bg-ios-card rounded-ios shadow-sm p-3.5 flex items-center gap-4">
            <HealthScoreRing score={detail.healthScore} size={84} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide mb-1">
                Guruh salomatligi
              </p>
              <p className="text-[15px] text-ios-label leading-snug">
                {detail.healthScore >= 80
                  ? "A'lo — javob foizi va a'zolar faolligi yaxshi"
                  : detail.healthScore >= 50
                    ? "O'rtacha — ba'zi ko'rsatkichlarga e'tibor bering"
                    : "Past — javobsiz so'rovlar yoki moderatsiya hodisalari ko'p"}
              </p>
            </div>
          </div>

          {/* Bot holati */}
          <div
            className={`rounded-ios shadow-sm p-3.5 flex items-center gap-3 ${
              detail.health.hasIssue ? 'bg-ios-red/10' : 'bg-ios-green/10'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[24px] ${detail.health.hasIssue ? 'text-ios-red' : 'text-ios-green'}`}
            >
              {detail.health.hasIssue ? 'error' : 'check_circle'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-medium text-ios-label">{detail.health.message}</p>
              {detail.enabledFeatureKeys.length > 0 && (
                <p className="text-[12px] text-ios-label-secondary/70 mt-0.5">
                  Yoqilgan: {detail.enabledFeatureKeys.map((k) => MODERATION_LABELS[k] || k).join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Bugungi holat — jonli, davr almashtirgichidan mustaqil */}
          <div>
            <span className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide px-1 mb-1.5 block">
              Bugun
            </span>
            <div className="bg-ios-card rounded-ios shadow-sm p-3.5 flex items-center justify-around text-center">
              <div>
                <p className="text-[22px] font-semibold text-ios-blue">{detail.today.users}</p>
                <p className="text-[11px] text-ios-label-secondary/70">kishiga javob berildi</p>
              </div>
              <div>
                <p className="text-[22px] font-semibold text-ios-label">{detail.today.total}</p>
                <p className="text-[11px] text-ios-label-secondary/70">jami so'rov</p>
              </div>
              <div>
                <p className="text-[22px] font-semibold text-ios-green">{detail.today.resolved}</p>
                <p className="text-[11px] text-ios-label-secondary/70">javob berilgan</p>
              </div>
            </div>
          </div>

          {/* Guruh faolligi — chuqur tahlil (2026-09-28): nechta odam
              JONLI (xabar yozgan), nechta a'zo "jim" (aktiv emas), bot
              qanchalik foydali */}
          <div>
            <span className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide px-1 mb-1.5 block">
              Guruh faolligi ({detail.periodDays} kunda)
            </span>
            <div className="bg-ios-card rounded-ios shadow-sm p-3.5 space-y-3">
              <div className="flex items-center justify-around text-center">
                <div>
                  <p className="text-[22px] font-semibold text-ios-green">{detail.activity.activeMembers}</p>
                  <p className="text-[11px] text-ios-label-secondary/70">jonli (yozgan)</p>
                </div>
                <div>
                  <p className="text-[22px] font-semibold text-ios-label">{detail.activity.totalMessages}</p>
                  <p className="text-[11px] text-ios-label-secondary/70">jami xabar</p>
                </div>
                <div>
                  <p className="text-[22px] font-semibold text-ios-blue">
                    {detail.activity.botUsefulnessPercent !== null ? `${detail.activity.botUsefulnessPercent}%` : '—'}
                  </p>
                  <p className="text-[11px] text-ios-label-secondary/70">bot foydaliligi</p>
                </div>
              </div>
              {detail.activity.activeMembersRatio !== null && typeof detail.memberCount === 'number' && (
                <div>
                  <div className="flex items-center justify-between text-[12px] text-ios-label-secondary/70 mb-1">
                    <span>Faol a'zolar</span>
                    <span>
                      {detail.activity.activeMembers} / {detail.memberCount} a'zo ({detail.activity.activeMembersRatio}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-ios-fill/[0.12] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-ios-green"
                      style={{ width: `${Math.min(100, detail.activity.activeMembersRatio)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-ios-label-secondary/60 mt-1">
                    Qolgan {Math.max(0, detail.memberCount - detail.activity.activeMembers)} a'zo bu davrda hech narsa yozmagan (aktiv emas).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Eng faol a'zolar */}
          <div>
            <span className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide px-1 mb-1.5 block">
              Eng faol a'zolar
            </span>
            <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden">
              <HorizontalBarList
                items={detail.topActiveUsers.map((u) => ({ label: u.name, count: u.messageCount }))}
                emptyText="Hali ma'lumot yo'q"
              />
            </div>
          </div>

          {/* A'zolar soni tendensiyasi */}
          {detail.memberTrend.length >= 2 && (
            <div>
              <span className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide px-1 mb-1.5 block">
                A'zolar soni
              </span>
              <div className="bg-ios-card rounded-ios shadow-sm p-3.5 pt-4">
                <GenericTrendChart
                  data={detail.memberTrend.map((m) => ({ date: m.date, value: m.memberCount }))}
                  tooltipSuffix=" a'zo"
                />
              </div>
            </div>
          )}

          {/* Davr almashtirgich */}
          <div className="flex bg-ios-fill/[0.12] rounded-ios p-[2px]">
            {([7, 30] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`flex-1 py-1.5 rounded-[8px] text-[13px] font-medium transition-colors ${
                  days === d ? 'bg-ios-card text-ios-label shadow-sm' : 'text-ios-label-secondary/70'
                }`}
              >
                {d} kun
              </button>
            ))}
          </div>

          {/* So'rov/javob statistikasi */}
          <div>
            <span className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide px-1 mb-1.5 block">
              So'rov / javob
            </span>
            <div className="bg-ios-card rounded-ios shadow-sm p-3.5 flex items-center justify-around text-center">
              <div>
                <p className="text-[22px] font-semibold text-ios-label">{detail.queryStats.total}</p>
                <p className="text-[11px] text-ios-label-secondary/70">jami so'rov</p>
              </div>
              <div>
                <p className="text-[22px] font-semibold text-ios-label">{detail.queryStats.resolved}</p>
                <p className="text-[11px] text-ios-label-secondary/70">javob berilgan</p>
              </div>
              <div>
                <p className="text-[22px] font-semibold text-ios-blue">
                  {detail.queryStats.resolvedPercent !== null ? `${detail.queryStats.resolvedPercent}%` : '—'}
                </p>
                <p className="text-[11px] text-ios-label-secondary/70">javob foizi</p>
              </div>
            </div>
          </div>

          {/* Kunlik trend */}
          <div>
            <div className="flex items-center justify-between px-1 mb-1.5">
              <span className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide">
                Kunlik faollik
              </span>
              <div className="flex bg-ios-fill/[0.12] rounded-[7px] p-[2px]">
                {([
                  { key: 'total', label: "So'rov" },
                  { key: 'users', label: 'Kishi' },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setTrendMetric(opt.key)}
                    className={`px-2 py-0.5 rounded-[5px] text-[11px] font-medium transition-colors ${
                      trendMetric === opt.key ? 'bg-ios-card text-ios-label shadow-sm' : 'text-ios-label-secondary/70'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-ios-card rounded-ios shadow-sm p-3.5 pt-4">
              <TrendAreaChart data={detail.dailySeries} metric={trendMetric} />
            </div>
          </div>

          {/* Javobsiz qolgan mavzular */}
          <div>
            <span className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide px-1 mb-1.5 block">
              Javobsiz qolgan mavzular
            </span>
            <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden">
              {detail.unresolvedTopics.length === 0 ? (
                <div className="p-3.5 text-[13px] text-ios-label-secondary/70 text-center">
                  Bu davrda javobsiz qolgan mavzu yo'q
                </div>
              ) : (
                detail.unresolvedTopics.map((t, idx) => (
                  <div
                    key={`${t.categoryName}-${idx}`}
                    className="flex items-center justify-between px-3.5 py-2.5"
                    style={idx === 0 ? undefined : HAIRLINE}
                  >
                    <span className="text-[15px] text-ios-label truncate">{t.categoryName || "Noma'lum"}</span>
                    <span className="text-[13px] text-ios-label-secondary/70 shrink-0">{t.count} marta</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bazada yo'q, lekin tez-tez so'ralayotgan nomlar */}
          {detail.topMissingNamed.length > 0 && (
            <div>
              <span className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide px-1 mb-1.5 block">
                Bazada yo'q, lekin so'ralmoqda
              </span>
              <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden">
                {detail.topMissingNamed.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3.5 py-2.5" style={idx === 0 ? undefined : HAIRLINE}>
                    <span className="text-[14px] text-ios-label truncate flex-1 min-w-0">{m.sample}</span>
                    <span className="text-[13px] text-ios-orange shrink-0 ml-2">{m.count} marta</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kategoriya talabi */}
          <div>
            <span className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide px-1 mb-1.5 block">
              Eng ko'p so'ralgan xizmatlar
            </span>
            <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden">
              <HorizontalBarList
                items={detail.categoryDemand.map((c) => ({ label: c.categoryName, count: c.count }))}
                emptyText="Bu davrda so'rov bo'lmagan"
              />
            </div>
          </div>

          {/* Mahalla/hudud taqsimoti */}
          {detail.landmarkDistribution.length > 0 && (
            <div>
              <span className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide px-1 mb-1.5 block">
                Eng ko'p so'ralgan hududlar
              </span>
              <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden">
                <HorizontalBarList
                  items={detail.landmarkDistribution.map((l) => ({ label: l.landmarkName, count: l.count }))}
                  emptyText="Mo'ljal so'ralmagan"
                />
              </div>
            </div>
          )}

          {/* Qiyosiy reyting (benchmark) */}
          {detail.benchmark && (
            <div>
              <span className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide px-1 mb-1.5 block">
                Boshqa guruhlar bilan solishtirganda
              </span>
              <div className="bg-ios-card rounded-ios shadow-sm p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-ios-label-secondary/70">Jami so'rov (bu guruh vs o'rtacha)</span>
                  <span className="text-ios-label font-medium">
                    {detail.queryStats.total} <span className="text-ios-label-secondary/50">vs</span> {detail.benchmark.avgTotalQueries}
                  </span>
                </div>
                {detail.benchmark.avgResolvedPercent !== null && detail.queryStats.resolvedPercent !== null && (
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="text-ios-label-secondary/70">Javob foizi (bu guruh vs o'rtacha)</span>
                    <span className="text-ios-label font-medium">
                      {detail.queryStats.resolvedPercent}% <span className="text-ios-label-secondary/50">vs</span> {detail.benchmark.avgResolvedPercent}%
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-ios-label-secondary/60">
                  {detail.benchmark.groupCount} ta boshqa guruh o'rtachasiga solishtirilgan
                </p>
              </div>
            </div>
          )}

          {/* Sodiq vs bir martalik foydalanuvchilar */}
          {(detail.loyalUsers.loyal > 0 || detail.loyalUsers.oneTime > 0) && (
            <div>
              <span className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide px-1 mb-1.5 block">
                Sodiq foydalanuvchilar
              </span>
              <div className="bg-ios-card rounded-ios shadow-sm p-3.5">
                <RatioBar
                  segments={[
                    { label: 'Sodiq (2+ marta so\'ragan)', value: detail.loyalUsers.loyal, color: 'rgb(var(--ios-blue))' },
                    { label: 'Bir martalik', value: detail.loyalUsers.oneTime, color: 'rgb(var(--ios-fill) / 0.4)' },
                  ]}
                />
              </div>
            </div>
          )}

          {/* Til taqsimoti */}
          {(detail.languageDistribution.latinPercent + detail.languageDistribution.cyrillicPercent + detail.languageDistribution.mixedPercent) > 0 && (
            <div>
              <span className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide px-1 mb-1.5 block">
                Yozuv tili
              </span>
              <div className="bg-ios-card rounded-ios shadow-sm p-3.5">
                <RatioBar
                  segments={[
                    { label: 'Lotin', value: detail.languageDistribution.latinPercent, color: 'rgb(var(--ios-blue))' },
                    { label: 'Krill', value: detail.languageDistribution.cyrillicPercent, color: 'rgb(var(--ios-green))' },
                    { label: 'Aralash', value: detail.languageDistribution.mixedPercent, color: 'rgb(var(--ios-orange))' },
                  ]}
                />
              </div>
            </div>
          )}

          {/* Yangi a'zo -> birinchi so'rov konversiyasi + javob tezligi */}
          <div className="grid grid-cols-2 gap-3">
            {detail.joinConversion.joined > 0 && (
              <div className="bg-ios-card rounded-ios shadow-sm p-3.5">
                <p className="text-[20px] font-semibold text-ios-label">
                  {detail.joinConversion.conversionRatePercent !== null ? `${detail.joinConversion.conversionRatePercent}%` : '—'}
                </p>
                <p className="text-[11px] text-ios-label-secondary/70 mt-0.5">
                  {detail.joinConversion.joined} ta yangi a'zodan botdan foydalandi
                </p>
              </div>
            )}
            {detail.responseTime.avgMs !== null && (
              <div className="bg-ios-card rounded-ios shadow-sm p-3.5">
                <p className="text-[20px] font-semibold text-ios-label">
                  {detail.responseTime.avgMs < 1000 ? `${detail.responseTime.avgMs} ms` : `${(detail.responseTime.avgMs / 1000).toFixed(1)} s`}
                </p>
                <p className="text-[11px] text-ios-label-secondary/70 mt-0.5">
                  o'rtacha javob tezligi{detail.responseTime.p95Ms !== null ? ` (95%: ${(detail.responseTime.p95Ms / 1000).toFixed(1)}s)` : ''}
                </p>
              </div>
            )}
          </div>

          {/* Faollik vaqti */}
          <div>
            <span className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide px-1 mb-1.5 block">
              Faollik vaqti (soat bo'yicha)
            </span>
            <div className="bg-ios-card rounded-ios shadow-sm p-3.5">
              <div className="flex items-end gap-[2px] h-20">
                {detail.activityByHour.map((count, hour) => (
                  <div key={hour} className="flex-1 flex flex-col items-center justify-end h-full" title={`${hour}:00 — ${count} ta`}>
                    <div
                      className={`w-full rounded-[2px] ${count > 0 ? 'bg-ios-blue' : 'bg-ios-fill/[0.12]'}`}
                      style={{ height: `${Math.max(2, (count / maxHourCount) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-ios-label-secondary/70 mt-1.5">
                <span>00:00</span>
                <span>12:00</span>
                <span>23:00</span>
              </div>
            </div>
          </div>

          {/* Moderatsiya statistikasi */}
          <div>
            <span className="text-[13px] font-normal text-ios-label-secondary/70 uppercase tracking-wide px-1 mb-1.5 block">
              Moderatsiya ({detail.moderationStats.total} ta xabar o'chirildi)
            </span>
            <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden">
              {detail.moderationStats.byCategory.length === 0 ? (
                <div className="p-3.5 text-[13px] text-ios-label-secondary/70 text-center">
                  Bu davrda moderatsiya harakati bo'lmagan
                </div>
              ) : (
                detail.moderationStats.byCategory.map((m, idx) => (
                  <div
                    key={m.category}
                    className="flex items-center justify-between px-3.5 py-2.5"
                    style={idx === 0 ? undefined : HAIRLINE}
                  >
                    <span className="text-[15px] text-ios-label">{MODERATION_LABELS[m.category] || m.category}</span>
                    <span className="text-[13px] text-ios-label-secondary/70 shrink-0">{m.count} ta</span>
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
