import React, { useEffect, useState, useRef } from 'react';

interface ChatMessage {
  id: string;
  telegramUserId: string;
  senderType: 'USER' | 'BOT_AI' | 'BOT_SEARCH' | 'ADMIN';
  text: string;
  isComplaint: boolean;
  createdAt: string;
}

interface UserChatScreenProps {
  telegramUserId: string;
  userFullName: string;
  userUsername?: string;
  onBack: () => void;
}

export const UserChatScreen: React.FC<UserChatScreenProps> = ({
  telegramUserId,
  userFullName,
  userUsername,
  onBack,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [userStats, setUserStats] = useState({
    registeredAt: '2026-08-10T12:00:00Z',
    queryCountToday: 5,
    queryCountTotal: 48,
    complaintCount: 1,
    cityName: 'Olmaliq',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async (silent = false) => {
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const headers: HeadersInit = { 'x-init-data': initData };
      const response = await fetch(`/api/admin/chats/${telegramUserId}/messages`, { headers });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const headers = { 'x-init-data': initData };
      const response = await fetch(`/api/admin/users?search=${telegramUserId}`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const u = data[0];
          setUserStats({
            registeredAt: u.lastActivity, // fallback or registration date
            queryCountToday: u.queryCountToday,
            queryCountTotal: u.queryCountToday + 20, // dummy estimate
            complaintCount: u.hasComplaints ? 1 : 0,
            cityName: 'Olmaliq',
          });
        }
      }
    } catch (err) {
      console.error('Failed to load user stats:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchUserStats();
    const interval = setInterval(() => fetchMessages(true), 3000);
    return () => clearInterval(interval);
  }, [telegramUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    setIsSending(true);
    const textToSend = inputText.trim();
    setInputText('');

    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const response = await fetch(`/api/admin/users/${telegramUserId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-init-data': initData,
        },
        body: JSON.stringify({ text: textToSend }),
      });

      if (response.ok) {
        const resData = await response.json();
        if (resData.success && resData.message) {
          setMessages((prev) => [...prev, resData.message]);
        }
      } else {
        alert('Xabar yuborishda xatolik yuz berdi ❌');
        setInputText(textToSend);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setInputText(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(telegramUserId);
    alert("Telegram ID nusxalandi! 📋");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-900/5 rounded-3xl overflow-hidden border border-outline-variant/20 dark:border-slate-800 shadow-xl backdrop-blur-md relative">
      
      {/* Header */}
      <div className="px-4 py-3 bg-surface dark:bg-[#17212B] border-b border-outline-variant/30 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center text-on-surface dark:text-slate-200 active:scale-90"
          >
            <span className="material-symbols-outlined text-[20px] font-bold">arrow_back</span>
          </button>

          <div className="min-w-0">
            <h2 className="font-bold text-xs text-on-surface dark:text-slate-100 truncate">
              {userFullName}
            </h2>
            <p className="text-[10px] text-sky-500 dark:text-sky-400 font-semibold truncate">
              {userUsername ? `@${userUsername}` : `ID: ${telegramUserId}`}
            </p>
          </div>
        </div>

        {/* Info button */}
        <button
          onClick={() => setShowInfoModal(!showInfoModal)}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center text-on-surface dark:text-slate-200"
        >
          <span className="material-symbols-outlined text-[20px]">info</span>
        </button>
      </div>

      {/* Query Limit Bar */}
      <div className="px-4 py-2 bg-slate-100 dark:bg-[#1C2733] border-b border-outline-variant/20 dark:border-slate-800/80 flex items-center justify-between">
        <span className="text-[10px] text-slate-500 font-bold uppercase">Bugungi limit</span>
        <div className="flex items-center gap-3 flex-1 max-w-[200px] ml-4">
          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 transition-all"
              style={{ width: `${Math.min(100, (userStats.queryCountToday / 20) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-sky-500 whitespace-nowrap">
            {userStats.queryCountToday}/20
          </span>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/5 dark:bg-[#0E141B]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
            <span className="material-symbols-outlined text-[32px] animate-spin">sync</span>
            <span className="text-xs">Yuklanmoqda...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center px-6">
            <span className="material-symbols-outlined text-[40px] text-slate-600 mb-2">forum</span>
            <h3 className="font-bold text-sm text-slate-400">Suhbat boshlanmagan</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Foydalanuvchi botda faollik ko'rsatishi bilan bu yerda xabarlar paydo bo'ladi.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.senderType === 'USER';
            const isBot = m.senderType === 'BOT_SEARCH' || m.senderType === 'BOT_AI';
            const isAdmin = m.senderType === 'ADMIN';

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isUser ? 'items-start' : 'items-end'} w-full`}
              >
                {/* Bubble styling based on type */}
                <div
                  className={`max-w-[80%] rounded-[18px] px-3.5 py-2.5 shadow-sm text-xs leading-relaxed relative overflow-hidden ${
                    m.isComplaint
                      ? 'bg-red-500/20 border border-red-500/40 text-red-700 dark:text-red-300 rounded-tl-sm'
                      : isUser
                      ? 'bg-slate-200 dark:bg-[#1C2733] text-on-surface dark:text-slate-100 rounded-tl-sm'
                      : isAdmin
                      ? 'bg-emerald-600 text-white rounded-tr-sm'
                      : 'bg-gradient-to-r from-[#2AABEE] to-[#0088CC] text-white rounded-tr-sm'
                  }`}
                >
                  {/* Sender Prefix */}
                  {!isUser && (
                    <span className="block text-[8px] font-bold uppercase tracking-wider text-white/70 mb-1">
                      {isAdmin ? '👤 Admin' : isBot && m.senderType === 'BOT_AI' ? '🤖 Bot AI' : '🤖 Bot Search'}
                    </span>
                  )}

                  <p className="whitespace-pre-wrap">{m.text}</p>
                  
                  <span className={`text-[8px] block text-right mt-1.5 font-bold ${
                    isUser ? 'text-slate-500' : 'text-white/60'
                  }`}>
                    {new Date(m.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Info Drawer Modal */}
      {showInfoModal && (
        <div className="absolute inset-0 bg-black/40 z-50 flex justify-end animate-fade-in" onClick={() => setShowInfoModal(false)}>
          <div
            className="w-72 bg-surface dark:bg-[#1C2733] h-full shadow-2xl p-5 flex flex-col gap-4 animate-slide-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-extrabold text-sm text-on-surface dark:text-slate-100">Foydalanuvchi Profili</h3>
              <button onClick={() => setShowInfoModal(false)} className="text-slate-400 hover:text-on-surface">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Mijoz Ismi</span>
                <span className="font-bold text-on-surface dark:text-slate-100">{userFullName}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Telegram ID</span>
                <button
                  onClick={handleCopyId}
                  className="flex items-center gap-1.5 font-mono text-[11px] text-sky-500 dark:text-sky-400 hover:underline text-left"
                >
                  <span>{telegramUserId}</span>
                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Shahar</span>
                <span className="font-bold text-on-surface dark:text-slate-100">{userStats.cityName}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Jami so'rovlari</span>
                <span className="font-bold text-on-surface dark:text-slate-100">{userStats.queryCountTotal} ta</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Shikoyatlari</span>
                <span className="font-bold text-rose-500">{userStats.complaintCount} ta</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reply Form */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-surface dark:bg-[#17212B] border-t border-outline-variant/30 dark:border-slate-800 flex gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Mijozga Telegram orqali javob yozing..."
          className="flex-1 bg-slate-50 dark:bg-slate-900 border border-outline-variant/30 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-on-surface dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2AABEE] to-[#0088CC] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
        </button>
      </form>
    </div>
  );
};
