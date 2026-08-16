import React, { useState } from 'react';
import { UserItem } from './UserList';

export interface UserProfileCardProps {
  user: UserItem;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({ user }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.telegramUserId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const limitProgress = Math.min(Math.round((user.todayCount / 20) * 100), 100);

  return (
    <div className="bg-surface-container-low dark:bg-[#1C2733] border-b border-outline-variant/50 p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary text-on-primary font-bold text-lg flex items-center justify-center shrink-0 shadow-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-title-bold text-on-surface dark:text-slate-100 flex items-center gap-2">
              {user.name}
            </h3>
            <div className="flex items-center gap-2 text-body-secondary text-outline">
              {user.username && (
                <a
                  href={`https://t.me/${user.username.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary dark:text-sky-400 font-medium hover:underline"
                >
                  {user.username}
                </a>
              )}
              <div className="flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded-full font-mono text-caption text-on-surface-variant">
                <span>ID: {user.telegramUserId}</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="hover:text-primary transition-colors ml-1"
                  title="Nusxalash"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {user.username && (
          <a
            href={`https://t.me/${user.username.replace('@', '')}`}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 bg-telegram-blue text-white rounded-full text-caption font-bold hover:opacity-90 transition flex items-center gap-1.5 shadow-sm shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
            <span>Telegramda ochish</span>
          </a>
        )}
      </div>

      {/* Stats Bar & Progress Limit */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-outline-variant/30 text-caption">
        <div className="bg-surface-container/60 dark:bg-slate-800/60 p-2 rounded-xl">
          <div className="text-outline">Shahar</div>
          <div className="font-bold text-on-surface dark:text-slate-100">{user.cityName || 'Olmaliq'}</div>
        </div>

        <div className="bg-surface-container/60 dark:bg-slate-800/60 p-2 rounded-xl">
          <div className="text-outline">Qo'shilgan sana</div>
          <div className="font-bold text-on-surface dark:text-slate-100">
            {new Date(user.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        <div className="bg-surface-container/60 dark:bg-slate-800/60 p-2 rounded-xl">
          <div className="text-outline">Jami so'rovlar</div>
          <div className="font-bold text-on-surface dark:text-slate-100">{user.totalQueries} ta</div>
        </div>

        <div className="bg-surface-container/60 dark:bg-slate-800/60 p-2 rounded-xl">
          <div className="text-outline flex justify-between">
            <span>Bugungi limit</span>
            <span className="font-bold text-primary dark:text-sky-400">{user.todayCount}/20</span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-1 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${user.todayCount >= 20 ? 'bg-error' : 'bg-primary'}`}
              style={{ width: `${limitProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
