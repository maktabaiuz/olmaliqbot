import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../config';

/**
 * "Userlar" bo'limining umumiy qismlari (2026-10-08): Telegram avatari,
 * belgilar va vaqt formatlari.
 */

export interface Person {
  id: string;
  telegramId: string;
  name: string | null;
  username: string | null;
  languageCode: string | null;
  isPremium: boolean;
  via: 'bot' | 'uz11' | 'app' | 'group' | string;
  sourceGroupChatId: string | null;
  sourceGroupTitle: string | null;
  startParam: string | null;
  startedBot: boolean;
  blocked: boolean;
  suspended: boolean;
  createdAt: string;
  lastActive: string;
  queries: number;
  unanswered: number;
  dmMessages: number;
  groupMessages: number;
  rentals: number;
  business: number;
  seeker: boolean;
  rejected: number;
  moderated: number;
  complaints: number;
  trust: 'trusted' | 'normal' | 'risky';
  activeRecently: boolean;
}

// Avatar: himoyalangan API'dan blob qilib olinadi (oddiy <img src> header yubora olmaydi)
const avatarCache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

function loadAvatar(tgId: string): Promise<string | null> {
  if (avatarCache.has(tgId)) return Promise.resolve(avatarCache.get(tgId)!);
  if (!inflight.has(tgId)) {
    inflight.set(
      tgId,
      apiFetch(`/api/admin/people/${tgId}/avatar`)
        .then(async (r) => (r.ok ? URL.createObjectURL(await r.blob()) : null))
        .catch(() => null)
        .then((url) => {
          avatarCache.set(tgId, url);
          inflight.delete(tgId);
          return url;
        })
    );
  }
  return inflight.get(tgId)!;
}

const GRADIENTS = ['from-sky-400 to-blue-600', 'from-violet-400 to-purple-600', 'from-emerald-400 to-teal-600', 'from-amber-400 to-orange-600', 'from-rose-400 to-pink-600', 'from-cyan-400 to-sky-600'];

export const Avatar: React.FC<{ tgId: string; name: string | null; size?: number; ring?: string }> = ({ tgId, name, size = 44, ring }) => {
  const [url, setUrl] = useState<string | null>(avatarCache.get(tgId) ?? null);
  useEffect(() => {
    let alive = true;
    loadAvatar(tgId).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [tgId]);
  const initials = (name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const grad = GRADIENTS[Number(tgId.slice(-2)) % GRADIENTS.length];
  return (
    <span
      className={`relative shrink-0 rounded-full overflow-hidden flex items-center justify-center text-white font-bold bg-gradient-to-br ${grad} ${ring || ''}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : initials}
    </span>
  );
};

export const VIA: Record<string, { icon: string; label: string; cls: string }> = {
  bot: { icon: 'smart_toy', label: 'Bot', cls: 'text-ios-blue bg-ios-blue/10' },
  uz11: { icon: 'apps', label: '@uz11_bot', cls: 'text-ios-purple bg-ios-purple/10' },
  app: { icon: 'smartphone', label: 'Ilova', cls: 'text-ios-green bg-ios-green/10' },
  group: { icon: 'groups', label: 'Guruhdan', cls: 'text-ios-orange bg-ios-orange/10' },
};

export const LANG: Record<string, string> = { uz: "🇺🇿 O'zbek", ru: '🇷🇺 Rus', en: '🇬🇧 Ingliz', kk: '🇰🇿 Qozoq', tg: '🇹🇯 Tojik', ky: '🇰🇬 Qirg\'iz', tr: '🇹🇷 Turk' };

export function relTime(iso: string | Date): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'hozir';
  if (m < 60) return `${m} daq oldin`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat oldin`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'kecha';
  if (d < 30) return `${d} kun oldin`;
  return `${Math.floor(d / 30)} oy oldin`;
}

export function displayName(p: { name: string | null; username: string | null; telegramId: string }) {
  return p.name || (p.username ? `@${p.username}` : `ID ${p.telegramId}`);
}

/** Telegram profilini ochish: @username bo'lsa t.me, bo'lmasa tg://user?id */
export function telegramLink(p: { username: string | null; telegramId: string }) {
  return p.username ? `https://t.me/${p.username}` : `tg://user?id=${p.telegramId}`;
}

export function openTelegram(p: { username: string | null; telegramId: string }) {
  const url = telegramLink(p);
  const wa = (window as any).Telegram?.WebApp;
  if (wa?.openTelegramLink && url.startsWith('https://t.me/')) wa.openTelegramLink(url);
  else window.open(url, '_blank');
}

export const TrustBadge: React.FC<{ trust: Person['trust'] }> = ({ trust }) =>
  trust === 'normal' ? null : (
    <span className={`text-[10.5px] font-semibold rounded-full px-1.5 py-[1px] ${trust === 'trusted' ? 'bg-ios-green/15 text-ios-green' : 'bg-ios-red/15 text-ios-red'}`}>
      {trust === 'trusted' ? '✓ Ishonchli' : '⚠ Shubhali'}
    </span>
  );

export const Sparkline: React.FC<{ values: number[]; height?: number }> = ({ values, height = 34 }) => {
  const w = 120;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(height - (v / max) * (height - 4) - 2).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="rgb(var(--ios-blue))" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};
