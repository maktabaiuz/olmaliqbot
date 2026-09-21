import React, { useState } from 'react';
import { IosHeader } from '../components/ios/IosHeader';
import { useLanguage } from '../context/LanguageContext';

export interface BotSimulatorScreenProps {
  onBack: () => void;
}

interface ScoreBreakdownEntry {
  listingId: string;
  name: string;
  totalScore: number;
  priorityBonus: number;
  isVerifiedBonus: number;
  jargonBonus: number;
  directJargonBonus: number;
  jargonStrength: 'strong' | 'category' | 'weak' | null;
  badgeBonus: number;
  matchedBadgeCount: number;
  ratingScore: number;
  countScore: number;
  recencyScore: number;
  completenessScore: number;
  rotationBonus: number;
}

interface SimulateResponse {
  success: boolean;
  message?: string;
  steps: {
    zeroLayer?: { passed: boolean };
    aiClassification?: {
      intent: string;
      object_type: string | null;
      category: string | null;
      name: string | null;
      landmark: string | null;
      confidence: number;
    };
    selfOfferCheck?: { isSelfOffer: boolean; isJobVacancy: boolean; isUtilityStatusQuestion: boolean; blocked: boolean };
    requestedBadges?: string[];
  };
  finalResult: {
    found: boolean;
    reason?: string;
    listingName?: string;
    categoryName?: string;
    formattedText?: string;
    otherMatchesCount?: number;
  };
  scoreBreakdown: ScoreBreakdownEntry[] | null;
}

const SCORE_COLUMNS: { key: keyof ScoreBreakdownEntry; label: string }[] = [
  { key: 'priorityBonus', label: "Ustuvorlik (1/2/3-o'rin)" },
  { key: 'directJargonBonus', label: 'Jargon moslik' },
  { key: 'badgeBonus', label: 'Belgilar' },
  { key: 'isVerifiedBonus', label: 'Tasdiqlangan' },
  { key: 'ratingScore', label: 'Reyting' },
  { key: 'countScore', label: 'Sharhlar soni' },
  { key: 'completenessScore', label: "To'liqlik" },
  { key: 'recencyScore', label: 'Yangilik' },
  { key: 'rotationBonus', label: 'Aylanma bonus' },
];

// MUHIM (2026-09, "Bot sinovi" xususiyati): bu ekran orqali admin
// Telegram'ga chiqmasdan botning HAQIQIY pipeline'ini (0-qavat filtr,
// haqiqiy Gemini AI klassifikatsiyasi, o'z-e'lon tekshiruvi, qidiruv)
// aynan o'zini sinab ko'radi va HAR BIR bosqichda nima bo'lganini,
// natijada nega aynan shu yozuv tanlanganini (reyting tafsiloti) ko'radi.
// Butun bu sessiyada uchragan real xatolarning (Yana tugmasi, badge
// bonus, self-offer bo'shliqlari) barchasi aynan shu turdagi qo'lda
// tekshiruv orqali topilgan edi — endi buni admin panelining o'zidan
// bir necha soniyada bajarish mumkin.
export const BotSimulatorScreen: React.FC<BotSimulatorScreenProps> = ({ onBack }) => {
  const { t } = useLanguage();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initData = window.Telegram?.WebApp?.initData || '';

  const handleSimulate = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-init-data': initData },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Xato yuz berdi');
      } else {
        setResult(data);
      }
    } catch {
      setError('Aloqa xatosi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 -mx-4 px-4 pt-1 pb-16">
      <IosHeader
        title="Bot sinovi"
        subtitle="Xabar yozing — bot NIMA javob berishini va NEGA shuni ko'ring"
        onBack={onBack}
        backLabel={t('action_back')}
      />

      <div className="bg-ios-card rounded-ios-lg p-3.5 shadow-sm flex flex-col gap-2.5">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Masalan: santexnik kerak kafolat bilan, karzinka yonida"
          className="w-full h-20 bg-ios-fill/[0.10] rounded-ios px-3 py-2 text-[14px] text-ios-label placeholder:text-ios-label-secondary/70 outline-none resize-none"
        />
        <button
          onClick={handleSimulate}
          disabled={loading || !message.trim()}
          className="w-full py-2.5 bg-ios-blue text-white rounded-ios text-[14px] font-semibold disabled:opacity-40 active:opacity-70 transition-opacity"
        >
          {loading ? 'Tekshirilmoqda... (haqiqiy AI so\'rovi)' : 'Sinash'}
        </button>
      </div>

      {error && (
        <div className="bg-ios-red/10 border border-ios-red/30 rounded-ios p-3 text-[13px] text-ios-red">{error}</div>
      )}

      {result && (
        <div className="flex flex-col gap-3">
          {/* BOSQICHLAR */}
          <div className="bg-ios-card rounded-ios-lg p-3.5 shadow-sm flex flex-col gap-2.5">
            <h3 className="text-[12px] font-semibold text-ios-label-secondary/70 uppercase tracking-wide">Bosqichlar</h3>

            {result.steps.zeroLayer && (
              <StepRow
                label="0-qavat filtri (guruh uchun)"
                ok={result.steps.zeroLayer.passed}
                detail={result.steps.zeroLayer.passed ? "O'tdi — AI'ga yuboriladi" : "O'tmadi — guruhda AI'ga umuman yuborilmaydi"}
              />
            )}

            {result.steps.aiClassification && (
              <div className="pt-1.5" style={{ borderTop: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}>
                <p className="text-[12px] font-semibold text-ios-label mb-1">AI klassifikatsiyasi</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
                  <Field label="Intent" value={result.steps.aiClassification.intent} />
                  <Field label="Ishonch" value={`${Math.round(result.steps.aiClassification.confidence * 100)}%`} />
                  <Field label="Kategoriya" value={result.steps.aiClassification.category || '—'} />
                  <Field label="Nomi" value={result.steps.aiClassification.name || '—'} />
                  <Field label="Mo'ljal" value={result.steps.aiClassification.landmark || '—'} />
                  <Field label="Turi" value={result.steps.aiClassification.object_type || '—'} />
                </div>
              </div>
            )}

            {result.steps.selfOfferCheck && (
              <div className="pt-1.5" style={{ borderTop: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}>
                <StepRow
                  label="O'z-e'lon / ish-e'loni tekshiruvi"
                  ok={!result.steps.selfOfferCheck.blocked}
                  detail={
                    result.steps.selfOfferCheck.blocked
                      ? `Bloklandi (${[
                          result.steps.selfOfferCheck.isSelfOffer && "o'z-e'lon",
                          result.steps.selfOfferCheck.isJobVacancy && 'ish e\'loni',
                          result.steps.selfOfferCheck.isUtilityStatusQuestion && 'kommunal holat',
                        ]
                          .filter(Boolean)
                          .join(', ')})`
                      : "Bloklanmadi — haqiqiy so'rov deb hisoblandi"
                  }
                />
              </div>
            )}

            {result.steps.requestedBadges && result.steps.requestedBadges.length > 0 && (
              <div className="pt-1.5" style={{ borderTop: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}>
                <p className="text-[12px] font-semibold text-ios-label mb-1">Aniqlangan belgi so'rovlari</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.steps.requestedBadges.map((b) => (
                    <span key={b} className="bg-ios-purple/[0.12] text-ios-purple text-[11px] px-2.5 py-1 rounded-full font-medium">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* YAKUNIY NATIJA */}
          <div className={`rounded-ios-lg p-3.5 shadow-sm ${result.finalResult.found ? 'bg-ios-green/10 border border-ios-green/30' : 'bg-ios-fill/[0.08]'}`}>
            <h3 className="text-[12px] font-semibold text-ios-label-secondary/70 uppercase tracking-wide mb-1.5">
              Yakuniy natija
            </h3>
            {result.finalResult.found ? (
              <>
                <p className="text-[14px] font-semibold text-ios-label">
                  ✅ Topildi: {result.finalResult.listingName} ({result.finalResult.categoryName})
                </p>
                {typeof result.finalResult.otherMatchesCount === 'number' && result.finalResult.otherMatchesCount > 0 && (
                  <p className="text-[12px] text-ios-label-secondary/70 mt-0.5">
                    + yana {result.finalResult.otherMatchesCount} ta mos yozuv ("Yana ko'rish" bilan)
                  </p>
                )}
                {result.finalResult.formattedText && (
                  <div
                    className="mt-2 bg-ios-card rounded-ios p-3 text-[13px] text-ios-label whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: result.finalResult.formattedText }}
                  />
                )}
              </>
            ) : (
              <p className="text-[13px] text-ios-label-secondary/80">🔇 Bot javob bermaydi — {result.finalResult.reason}</p>
            )}
          </div>

          {/* REYTING TAFSILOTI */}
          {result.scoreBreakdown && result.scoreBreakdown.length > 0 && (
            <div className="bg-ios-card rounded-ios-lg p-3.5 shadow-sm">
              <h3 className="text-[12px] font-semibold text-ios-label-secondary/70 uppercase tracking-wide mb-2">
                Nega bu tartibda? (reyting tafsiloti)
              </h3>
              <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left py-1.5 pr-2 text-ios-label-secondary/70 font-medium sticky left-0 bg-ios-card">Yozuv</th>
                      <th className="text-right py-1.5 px-1.5 text-ios-label-secondary/70 font-medium">Jami</th>
                      {SCORE_COLUMNS.map((c) => (
                        <th key={c.key} className="text-right py-1.5 px-1.5 text-ios-label-secondary/70 font-medium whitespace-nowrap">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.scoreBreakdown
                      .slice()
                      .sort((a, b) => b.totalScore - a.totalScore)
                      .map((entry, idx) => (
                        <tr key={entry.listingId} className={idx === 0 ? 'bg-ios-green/10' : ''} style={{ borderTop: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}>
                          <td className="py-1.5 pr-2 font-medium text-ios-label sticky left-0" style={{ background: idx === 0 ? undefined : 'inherit' }}>
                            {idx === 0 ? '🥇 ' : ''}
                            {entry.name}
                          </td>
                          <td className="text-right py-1.5 px-1.5 font-bold text-ios-label">{Math.round(entry.totalScore)}</td>
                          {SCORE_COLUMNS.map((c) => {
                            const v = entry[c.key];
                            const num = typeof v === 'number' ? v : 0;
                            return (
                              <td key={c.key} className={`text-right py-1.5 px-1.5 ${num > 0 ? 'text-ios-label' : 'text-ios-label-secondary/40'}`}>
                                {typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(2)) : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const StepRow: React.FC<{ label: string; ok: boolean; detail: string }> = ({ label, ok, detail }) => (
  <div className="flex items-start gap-2">
    <span className={`material-symbols-outlined text-[16px] mt-0.5 ${ok ? 'text-ios-green' : 'text-ios-orange'}`}>
      {ok ? 'check_circle' : 'cancel'}
    </span>
    <div>
      <p className="text-[12px] font-semibold text-ios-label">{label}</p>
      <p className="text-[11px] text-ios-label-secondary/70">{detail}</p>
    </div>
  </div>
);

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <span className="text-ios-label-secondary/60">{label}: </span>
    <span className="text-ios-label font-medium">{value}</span>
  </div>
);
