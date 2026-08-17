import React, { useState } from 'react';
import { TopHeader } from '../../components/common/TopHeader';

export const SuperAdminCityDetailScreen: React.FC = () => {
  const [groups] = useState([
    {
      id: 'g1',
      name: "Olmaliqliklar Rasmiy Guruhi",
      username: '@olmaliq_chat',
      membersCount: 14500,
      type: 'Guruh',
      monthlyQueries: 840,
      botStatus: 'ADMIN', // ADMIN | COMMENT_ONLY | NOT_ADMIN
    },
    {
      id: 'g2',
      name: "Olmaliq Yangiliklari Kanali",
      username: '@olmaliq_news',
      membersCount: 22000,
      type: 'Kanal',
      monthlyQueries: 320,
      botStatus: 'COMMENT_ONLY',
    },
  ]);

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 animate-fade-in max-w-container-max mx-auto">
      <TopHeader title="Olmaliq shahri" subtitle="Admin: Bobur · Tarif: Standart (299K)" showBack />

      {/* Shahar Ixcham Summary Bar */}
      <div className="bg-white dark:bg-[#16212F] p-3.5 rounded-card border border-ios-separator/50 flex items-center justify-between shadow-card text-[13px]">
        <div>
          <div className="text-tg-textMuted text-[11px]">Faoliyat holati</div>
          <div className="font-bold text-ios-green">● Faol ishlamoqda</div>
        </div>
        <div>
          <div className="text-tg-textMuted text-[11px]">To'lov muddati</div>
          <div className="font-bold text-tg-textLight dark:text-tg-textDark">14 Avgust 2026</div>
        </div>
      </div>

      {/* Ulangan Guruh/Kanallar (KATTA KARTALAR) */}
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-tg-textMuted uppercase tracking-wider">
          Ulangan Guruh va Kanallar ({groups.length})
        </h3>
        <button
          onClick={() => alert("Yangi guruh/kanal ulash yo'riqnomasi botga yuborildi")}
          className="text-[12px] font-bold text-tg-blue hover:underline"
        >
          ＋ Yangi guruh ulash
        </button>
      </div>

      <div className="space-y-3">
        {groups.map((g) => (
          <div
            key={g.id}
            className="bg-white dark:bg-[#16212F] p-4 rounded-card border border-ios-separator/50 dark:border-ios-darkSeparator/50 shadow-card flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-icon bg-tg-blue/15 text-tg-blue font-bold flex items-center justify-center text-[18px]">
                  {g.type === 'Guruh' ? '👥' : '📢'}
                </div>
                <div>
                  <h4 className="font-bold text-[15px] text-tg-textLight dark:text-tg-textDark">
                    {g.name}
                  </h4>
                  <a
                    href={`https://t.me/${g.username.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12px] text-tg-blue font-medium hover:underline"
                  >
                    {g.username}
                  </a>
                </div>
              </div>

              {/* Bot Status Badge */}
              {g.botStatus === 'ADMIN' && (
                <span className="text-[11px] font-bold bg-ios-green/15 text-ios-green px-2.5 py-1 rounded-pill">
                  Admin ✅
                </span>
              )}
              {g.botStatus === 'COMMENT_ONLY' && (
                <span className="text-[11px] font-bold bg-tg-blue/15 text-tg-blue px-2.5 py-1 rounded-pill">
                  Izoh ✅
                </span>
              )}
              {g.botStatus === 'NOT_ADMIN' && (
                <span className="text-[11px] font-bold bg-ios-red/15 text-ios-red px-2.5 py-1 rounded-pill">
                  Admin emas ⚠️
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-ios-separator/40 text-[12px] text-tg-textMuted">
              <div>A'zolar soni: <strong className="text-tg-textLight dark:text-tg-textDark">{g.membersCount.toLocaleString()} kishi</strong></div>
              <div>Oydagi savollar: <strong className="text-tg-textLight dark:text-tg-textDark">{g.monthlyQueries} ta</strong></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
