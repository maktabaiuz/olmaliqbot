import React, { useEffect, useState } from 'react';
import { IosHeader } from '../components/ios/IosHeader';
import { useLanguage } from '../context/LanguageContext';

export interface LoginHistoryScreenProps {
  onBack: () => void;
}

interface AuditLogEntry {
  id: string;
  action: string;
  details: any;
  deviceInfo: string | null;
  ipAddress: string | null;
  createdAt: string;
  by: string;
  role: string | null;
}

// MUHIM (2026-09): backend (`/admin/audit-logs`) va bazadagi AuditLog
// jadvali AVVALDAN mavjud edi (bir nechta amal — yozuv qo'shish,
// moderator boshqaruvi — allaqachon shu yerga yozib kelinardi), lekin
// HECH QANDAY ekranda ko'rsatilmasdi. Endi shu haqiqiy ma'lumot to'liq
// ko'rinadi — "kim, qachon, qaysi qurilma/IP'dan tizimga kirgan" (LOGIN)
// va boshqa muhim amallar (moderator qo'shish/o'chirish, yozuv
// tasdiqlash va h.k.) bitta joyda.
const ACTION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  LOGIN: { label: 'Tizimga kirdi', icon: 'login', color: 'text-ios-blue' },
  CREATE_LISTING: { label: 'Yozuv qo\'shdi', icon: 'add_circle', color: 'text-ios-green' },
  CREATE_MODERATOR: { label: 'Moderator qo\'shdi', icon: 'person_add', color: 'text-ios-green' },
  SUSPEND_MODERATOR: { label: 'Moderatorni to\'xtatdi', icon: 'block', color: 'text-ios-red' },
  RESTORE_MODERATOR: { label: 'Moderatorni tikladi', icon: 'lock_open', color: 'text-ios-green' },
  DELETE_MODERATOR: { label: 'Moderatorni o\'chirdi', icon: 'person_remove', color: 'text-ios-red' },
  VERIFY_LISTING: { label: 'Yozuvni tasdiqladi', icon: 'verified', color: 'text-ios-blue' },
  REPLY_TO_USER: { label: 'Foydalanuvchiga javob yozdi', icon: 'chat', color: 'text-ios-purple' },
};

const ACTION_FILTERS = ['Hammasi', 'LOGIN', 'CREATE_LISTING', 'VERIFY_LISTING', 'CREATE_MODERATOR', 'SUSPEND_MODERATOR', 'DELETE_MODERATOR', 'REPLY_TO_USER'];

function shortDevice(ua: string | null): string {
  if (!ua) return 'Noma\'lum qurilma';
  if (/iphone/i.test(ua)) return 'iPhone';
  if (/ipad/i.test(ua)) return 'iPad';
  if (/android/i.test(ua)) return 'Android';
  if (/windows/i.test(ua)) return 'Windows';
  if (/macintosh|mac os/i.test(ua)) return 'Mac';
  if (/telegram/i.test(ua)) return 'Telegram';
  return ua.slice(0, 40);
}

export const LoginHistoryScreen: React.FC<LoginHistoryScreenProps> = ({ onBack }) => {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Hammasi');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 40;

  const initData = window.Telegram?.WebApp?.initData || '';

  const load = async (nextOffset: number, replace: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/audit-logs?limit=${LIMIT}&offset=${nextOffset}`, {
        headers: { 'x-init-data': initData },
      });
      const data = await res.json();
      const newLogs: AuditLogEntry[] = data.logs || [];
      setLogs((prev) => (replace ? newLogs : [...prev, ...newLogs]));
      setHasMore(newLogs.length === LIMIT);
      setOffset(nextOffset);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredLogs = activeFilter === 'Hammasi' ? logs : logs.filter((l) => l.action === activeFilter);

  return (
    <div className="flex flex-col gap-4 -mx-4 px-4 pt-1 pb-16">
      <IosHeader
        title="Kirishlar tarixi"
        subtitle="Super-Admin · Kim, qachon, qaysi qurilmadan kirgani"
        onBack={onBack}
        backLabel={t('action_back')}
      />

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
        {ACTION_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors ${
              activeFilter === f ? 'bg-ios-blue text-white' : 'bg-ios-fill/[0.12] text-ios-label-secondary/70'
            }`}
          >
            {f === 'Hammasi' ? 'Hammasi' : ACTION_LABELS[f]?.label || f}
          </button>
        ))}
      </div>

      {loading && logs.length === 0 ? (
        <div className="text-center text-[13px] text-ios-label-secondary/70 py-8">Yuklanmoqda...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-ios-card rounded-ios-lg p-6 text-center text-[13px] text-ios-label-secondary/70 shadow-sm">
          Yozuv topilmadi
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredLogs.map((log) => {
            const meta = ACTION_LABELS[log.action] || { label: log.action, icon: 'info', color: 'text-ios-label-secondary' };
            return (
              <div key={log.id} className="bg-ios-card rounded-ios-lg p-3.5 shadow-sm flex items-start gap-3">
                <span className={`material-symbols-outlined text-[20px] mt-0.5 ${meta.color}`}>{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[14px] font-semibold text-ios-label">{log.by}</span>
                    <span className="text-[11px] text-ios-label-secondary/60 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[13px] text-ios-label-secondary/80 mt-0.5">{meta.label}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {log.role && (
                      <span className="text-[10px] bg-ios-fill/[0.12] text-ios-label-secondary px-2 py-0.5 rounded-full">
                        {log.role}
                      </span>
                    )}
                    <span className="text-[10px] text-ios-label-secondary/50">{shortDevice(log.deviceInfo)}</span>
                    {log.ipAddress && (
                      <span className="text-[10px] text-ios-label-secondary/50 font-mono">{log.ipAddress}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && !loading && filteredLogs.length > 0 && (
        <button
          onClick={() => load(offset + LIMIT, false)}
          className="w-full py-3 bg-ios-fill/[0.10] text-ios-blue rounded-ios text-[13px] font-semibold active:bg-ios-fill/20 transition-colors"
        >
          Ko'proq yuklash
        </button>
      )}
    </div>
  );
};
