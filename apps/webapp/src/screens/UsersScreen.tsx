import React, { useEffect, useState, useRef } from 'react';
import { IosHeader } from '../components/ios/IosHeader';
import { IosSearchBar } from '../components/ios/IosSearchBar';

interface UserItem {
  id: string;
  telegramId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phoneNumber?: string;
  queryCountToday: number;
  hasComplaints: boolean;
  lastActivity: string;
  lastMessageText?: string;
  isSuspended: boolean;
  role: string;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super-Admin',
  MODERATOR_APPROVER: 'Moderator',
  MODERATOR_EDITOR: 'Moderator',
};

interface UsersScreenProps {
  onSelectUser: (telegramUserId: string, fullName: string, username?: string) => void;
}

const POLL_INTERVAL_MS = 15000;

function initData(): string {
  return window.Telegram?.WebApp?.initData || '';
}

export const UsersScreen: React.FC<UsersScreenProps> = ({ onSelectUser }) => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [newUsersToday, setNewUsersToday] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'complained' | 'new'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  // Swipe State
  const [swipedRowId, setSwipedRowId] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const headers = { 'x-init-data': initData() };

  const fetchUsers = async (showSpinner = false) => {
    if (showSpinner) setIsLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch(`/api/admin/users?search=${encodeURIComponent(searchQuery)}&filter=${activeFilter}`, { headers }),
        fetch('/api/admin/stats', { headers }),
      ]);
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data || []);
      }
      if (statsRes.ok) {
        const s = await statsRes.json();
        setTotalUsers(s.totalUsers ?? 0);
        setNewUsersToday(s.newUsersToday ?? 0);
      }
      setLastUpdatedAt(new Date());
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Qidiruv/filtr o'zgarganda darhol yuklaydi
  useEffect(() => {
    fetchUsers(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, activeFilter]);

  // Real vaqtda yangilanish — har 15 soniyada fonda (spinner ko'rsatmasdan)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    pollRef.current = setInterval(() => fetchUsers(false), POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, activeFilter]);

  const handleToggleSuspend = async (u: UserItem) => {
    setBusyUserId(u.id);
    setSwipedRowId(null);
    const nextSuspend = !u.isSuspended;
    // Darhol UI'da yangilaymiz — real vaqtda tuyulishi uchun (server javobi bilan tasdiqlanadi)
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isSuspended: nextSuspend } : x)));
    try {
      const res = await fetch(`/api/admin/users/${u.id}/suspend`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspend: nextSuspend }),
      });
      if (!res.ok) {
        // Muvaffaqiyatsiz bo'lsa — orqaga qaytaramiz
        setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isSuspended: u.isSuspended } : x)));
      }
    } catch {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isSuspended: u.isSuspended } : x)));
    } finally {
      setBusyUserId(null);
    }
  };

  const handleTouchStart = (e: React.TouchEvent, _id: string) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent, id: string) => {
    if (touchStartX === null) return;
    const currentX = e.touches[0].clientX;
    const diffX = touchStartX - currentX;

    if (diffX > 40) {
      setSwipedRowId(id);
    } else if (diffX < -40) {
      if (swipedRowId === id) setSwipedRowId(null);
    }
  };

  const handleTouchEnd = () => {
    setTouchStartX(null);
  };

  const formatActivityTime = (isoString: string) => {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);

    if (diffMin < 1) return 'Hozir';
    if (diffMin < 60) return `${diffMin} daq oldin`;
    if (diffHrs < 24) return `${diffHrs} soat oldin`;
    return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <IosHeader title="Userlar" />

        {/* Jonli statistika kartasi */}
        <div className="relative overflow-hidden bg-gradient-to-br from-teal-500 to-emerald-600 text-white p-4 rounded-ios-lg shadow-sm">
          <div className="absolute right-0 top-0 w-28 h-28 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                  Jonli · har {POLL_INTERVAL_MS / 1000}s yangilanadi
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl font-black tracking-tight">{totalUsers}</span>
                <span className="text-xs font-semibold text-white/80">bot foydalanuvchisi</span>
              </div>
            </div>
            {newUsersToday > 0 && (
              <div className="bg-white/15 backdrop-blur rounded-ios px-3 py-2 text-center">
                <div className="text-lg font-black leading-none">+{newUsersToday}</div>
                <div className="text-[9px] font-bold uppercase text-white/80 mt-0.5">bugun</div>
              </div>
            )}
          </div>
          {lastUpdatedAt && (
            <p className="relative text-[9px] text-white/60 mt-2">
              Oxirgi yangilanish: {lastUpdatedAt.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          )}
        </div>

        {/* Search */}
        <IosSearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Ism, username yoki telefon..." />

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4">
          {[
            { id: 'all', label: 'Hammasi' },
            { id: 'active', label: 'Faol' },
            { id: 'complained', label: 'Shikoyatli' },
            { id: 'new', label: 'Yangi' },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => {
                setActiveFilter(chip.id as any);
              }}
              className={`flex-shrink-0 min-w-max px-4 py-1.5 rounded-full text-[13px] font-bold transition-all active:scale-95 ${
                activeFilter === chip.id
                  ? 'bg-ios-blue text-white shadow-sm'
                  : 'bg-ios-fill/[0.12] text-ios-label-secondary/70'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* List Container */}
      <div className="flex flex-col gap-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-ios-label-secondary/70 gap-2">
            <span className="material-symbols-outlined text-[32px] animate-spin">sync</span>
            <span className="text-[13px]">Yuklanmoqda...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-ios-card rounded-ios-lg p-8 flex flex-col items-center justify-center text-center shadow-sm">
            <span className="material-symbols-outlined text-[36px] text-ios-label-secondary/50 mb-2">group</span>
            <h3 className="font-semibold text-[15px] text-ios-label">Foydalanuvchilar yo'q</h3>
            <p className="text-[13px] text-ios-label-secondary/70 mt-0.5">Ushbu filtr bo'yicha hech kim topilmadi.</p>
          </div>
        ) : (
          <div className="bg-ios-card rounded-ios-lg overflow-hidden shadow-sm">
            {users.map((u, idx) => {
              const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Mijoz';
              const isSwiped = swipedRowId === u.id;
              const isLast = idx === users.length - 1;

              return (
                <div
                  key={u.id}
                  className="relative overflow-hidden w-full h-[72px]"
                  onTouchStart={(e) => handleTouchStart(e, u.id)}
                  onTouchMove={(e) => handleTouchMove(e, u.id)}
                  onTouchEnd={handleTouchEnd}
                  style={isLast ? undefined : { borderBottom: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}
                >
                  {/* Swipe Actions Behind — Blok tugmasi faqat oddiy (rol=USER)
                      foydalanuvchilar uchun (admin/moderatorlarni bu yerdan
                      bloklab bo'lmaydi — backend ham buni rad etadi). */}
                  <div className="absolute inset-y-0 right-0 flex items-center z-0">
                    <button
                      onClick={() => onSelectUser(u.telegramId, fullName, u.username)}
                      className="h-full w-[64px] bg-ios-blue text-white font-bold text-[11px] flex flex-col items-center justify-center gap-0.5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">chat</span>
                      Javob
                    </button>
                    {u.role === 'USER' && (
                      <button
                        onClick={() => handleToggleSuspend(u)}
                        disabled={busyUserId === u.id}
                        className={`h-full w-[64px] text-white font-bold text-[11px] flex flex-col items-center justify-center gap-0.5 transition-colors disabled:opacity-60 ${
                          u.isSuspended ? 'bg-ios-green' : 'bg-ios-red'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {u.isSuspended ? 'lock_open' : 'block'}
                        </span>
                        {u.isSuspended ? 'Ochish' : 'Blok'}
                      </button>
                    )}
                  </div>

                  {/* Foreground Content Card */}
                  <div
                    onClick={() => {
                      if (isSwiped) {
                        setSwipedRowId(null);
                      } else {
                        onSelectUser(u.telegramId, fullName, u.username);
                      }
                    }}
                    className="absolute inset-0 bg-ios-card p-3 flex items-center gap-3 transition-transform duration-300 z-10 cursor-pointer"
                    style={{ transform: isSwiped ? `translateX(-${u.role === 'USER' ? 128 : 64}px)` : 'translateX(0)' }}
                  >
                    {/* Avatar with red dot complaint indicator */}
                    <div className="relative">
                      <div
                        className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0 ${
                          u.isSuspended ? 'bg-ios-label-secondary' : 'bg-gradient-to-tr from-sky-400 to-blue-500'
                        }`}
                      >
                        {u.firstName ? u.firstName[0].toUpperCase() : 'U'}
                      </div>
                      {u.hasComplaints && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-ios-red border-2 border-ios-card" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <h4 className="font-semibold text-[13px] text-ios-label truncate flex items-center gap-1.5">
                          {fullName}
                          {ROLE_LABELS[u.role] && (
                            <span className="text-[9px] font-bold bg-ios-purple/15 text-ios-purple px-1.5 py-0.5 rounded-full shrink-0">
                              {ROLE_LABELS[u.role]}
                            </span>
                          )}
                          {u.isSuspended && (
                            <span className="text-[9px] font-bold bg-ios-red/15 text-ios-red px-1.5 py-0.5 rounded-full shrink-0">
                              Bloklangan
                            </span>
                          )}
                        </h4>
                        <span className="text-[9px] text-ios-label-secondary/70 shrink-0">
                          {formatActivityTime(u.lastActivity)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[11px] text-ios-blue font-medium truncate">
                          {u.username ? `@${u.username}` : `ID: ${u.telegramId}`}
                        </p>
                        <span className="text-[10px] bg-ios-fill/[0.12] text-ios-label-secondary/70 px-2 py-0.5 rounded-full font-semibold shrink-0">
                          Limit: {u.queryCountToday}/20
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
