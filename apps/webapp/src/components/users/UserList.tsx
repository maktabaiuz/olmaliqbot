import React, { useEffect, useState } from 'react';

export interface UserItem {
  id: string;
  telegramUserId: string;
  name: string;
  username: string | null;
  phone?: string | null;
  role: string;
  cityName: string;
  createdAt: string;
  lastActive: string;
  todayCount: number;
  totalQueries: number;
  complaintsCount: number;
  hasComplaint: boolean;
  latestLogId?: string;
}

export interface UserListProps {
  users: UserItem[];
  loading: boolean;
  selectedUserId: string | null;
  onSelectUser: (user: UserItem) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filter: 'all' | 'active' | 'complaints' | 'new';
  onFilterChange: (f: 'all' | 'active' | 'complaints' | 'new') => void;
  sort: 'active' | 'newest' | 'complaints';
  onSortChange: (s: 'active' | 'newest' | 'complaints') => void;
}

export const UserList: React.FC<UserListProps> = ({
  users,
  loading,
  selectedUserId,
  onSelectUser,
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  sort,
  onSortChange,
}) => {
  const [searchInput, setSearchInput] = useState(searchQuery);

  // Debounce 300ms for search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, onSearchChange]);

  const getAvatarLetter = (name: string) => {
    if (!name) return 'U';
    const clean = name.replace(/User ID:/i, '').trim();
    return clean.charAt(0).toUpperCase() || 'U';
  };

  return (
    <div className="flex flex-col h-full bg-surface-low border-r border-outline-variant/60">
      {/* Header Bar */}
      <div className="p-3 border-b border-outline-variant/60 flex flex-col gap-2.5 bg-surface">
        <div className="flex items-center justify-between">
          <h2 className="text-title-bold font-bold text-on-surface dark:text-slate-100 flex items-center gap-2">
            <span>Userlar</span>
            <span className="text-caption font-bold bg-primary-container/20 text-primary dark:text-sky-400 px-2 py-0.5 rounded-full">
              {users.length} ta
            </span>
          </h2>

          {/* Sort Dropdown */}
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as any)}
            className="text-caption font-medium bg-surface-container border border-outline-variant/60 text-on-surface dark:text-slate-200 rounded-lg px-2 py-1 focus:outline-none"
          >
            <option value="active">Eng faollar</option>
            <option value="newest">Eng yangilar</option>
            <option value="complaints">Eng ko'p shikoyatli</option>
          </select>
        </div>

        {/* Qidiruv input (Search bar) */}
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Ism, @username yoki Telegram ID..."
            className="w-full pl-9 pr-7 py-2 text-body-secondary rounded-[14px] bg-surface-container border border-outline-variant/60 focus:outline-none focus:border-primary text-on-surface dark:text-slate-100 placeholder:text-outline"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-2.5 text-outline hover:text-on-surface text-caption"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'all', label: 'Hammasi' },
            { id: 'active', label: 'Faol' },
            { id: 'complaints', label: 'Shikoyatli' },
            { id: 'new', label: 'Yangi' },
          ].map((chip) => {
            const isActive = filter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => onFilterChange(chip.id as any)}
                className={`px-3 py-1 rounded-full text-caption font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container hover:bg-surface-high text-on-surface-variant dark:text-slate-300'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Users Scroll List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-surface-container-high" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-surface-container-high rounded w-3/4" />
                  <div className="h-2.5 bg-surface-container-high rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-body-secondary text-outline">
            Hozircha foydalanuvchi yo'q
          </div>
        ) : (
          users.map((u) => {
            const isSelected = selectedUserId === u.telegramUserId;
            return (
              <div
                key={u.telegramUserId}
                onClick={() => onSelectUser(u)}
                className={`p-3.5 border-b border-outline-variant/30 cursor-pointer transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-primary-container/20 border-l-4 border-l-primary'
                    : 'hover:bg-surface-high dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  {/* Bosh harf-avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary dark:text-sky-400 font-bold flex items-center justify-center shrink-0 border border-primary/20">
                    {getAvatarLetter(u.name)}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-body-main text-on-surface dark:text-slate-100 truncate">
                        {u.name}
                      </span>
                      {u.hasComplaint && (
                        <span className="w-2.5 h-2.5 rounded-full bg-error shrink-0" title="Shikoyati bor" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-caption text-outline">
                      {u.username && (
                        <span className="text-primary dark:text-sky-400 font-medium">
                          {u.username}
                        </span>
                      )}
                      <span>ID: {u.telegramUserId}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {/* Bugungi so'rov badge "5/20" */}
                  <span
                    className={`text-caption font-bold px-2 py-0.5 rounded-full ${
                      u.todayCount >= 20
                        ? 'bg-error/20 text-error'
                        : 'bg-surface-container font-mono text-outline'
                    }`}
                  >
                    {u.todayCount}/20
                  </span>

                  <span className="material-symbols-outlined text-[18px] text-outline">
                    chevron_right
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
