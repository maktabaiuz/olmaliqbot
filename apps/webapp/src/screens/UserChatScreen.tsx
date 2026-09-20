import React, { useEffect, useState, useRef } from 'react';
import { useFeedback } from '../context/FeedbackContext';

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

const HAIRLINE = { borderBottom: '0.5px solid rgb(var(--ios-separator) / 0.29)' };

export const UserChatScreen: React.FC<UserChatScreenProps> = ({
  telegramUserId,
  userFullName,
  userUsername,
  onBack,
}) => {
  const { showToast } = useFeedback();
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
    const interval = setInterval(() => fetchMessages(true), 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        showToast('Xabar yuborishda xatolik yuz berdi', 'error');
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
    showToast('Telegram ID nusxalandi', 'success');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-ios-bg rounded-ios-lg overflow-hidden shadow-sm relative">

      {/* Header */}
      <div className="px-4 py-3 bg-ios-card flex items-center justify-between" style={HAIRLINE}>
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="flex items-center gap-0.5 text-ios-blue text-[15px] font-normal -ml-1 active:opacity-50 transition-opacity shrink-0"
          >
            <span className="material-symbols-outlined text-[22px]">chevron_left</span>
          </button>

          <div className="min-w-0">
            <h2 className="font-semibold text-[15px] text-ios-label truncate">
              {userFullName}
            </h2>
            <p className="text-[12px] text-ios-label-secondary/70 truncate">
              {userUsername ? `@${userUsername}` : `ID: ${telegramUserId}`}
            </p>
          </div>
        </div>

        {/* Info button */}
        <button
          onClick={() => setShowInfoModal(!showInfoModal)}
          className="w-8 h-8 rounded-full bg-ios-fill/[0.12] flex items-center justify-center text-ios-blue active:opacity-60 transition-opacity shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">info</span>
        </button>
      </div>

      {/* Query Limit Bar */}
      <div className="px-4 py-2 bg-ios-card-alt flex items-center justify-between" style={HAIRLINE}>
        <span className="text-[11px] text-ios-label-secondary/70 font-medium uppercase">Bugungi limit</span>
        <div className="flex items-center gap-3 flex-1 max-w-[200px] ml-4">
          <div className="w-full h-1.5 bg-ios-fill/[0.16] rounded-full overflow-hidden">
            <div
              className="h-full bg-ios-blue transition-all"
              style={{ width: `${Math.min(100, (userStats.queryCountToday / 20) * 100)}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold text-ios-blue whitespace-nowrap">
            {userStats.queryCountToday}/20
          </span>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-ios-bg">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-ios-label-secondary/70 gap-2">
            <span className="material-symbols-outlined text-[32px] animate-spin">sync</span>
            <span className="text-[13px]">Yuklanmoqda...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-ios-label-secondary/70 text-center px-6">
            <span className="material-symbols-outlined text-[40px] mb-2">forum</span>
            <h3 className="font-semibold text-[15px] text-ios-label">Suhbat boshlanmagan</h3>
            <p className="text-[13px] text-ios-label-secondary/70 max-w-xs mt-1">
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
                  className={`max-w-[80%] rounded-[18px] px-3.5 py-2.5 shadow-sm text-[13px] leading-relaxed relative overflow-hidden ${
                    m.isComplaint
                      ? 'bg-ios-red/15 text-ios-red rounded-tl-sm'
                      : isUser
                      ? 'bg-ios-fill/[0.12] text-ios-label rounded-tl-sm'
                      : isAdmin
                      ? 'bg-ios-green text-white rounded-tr-sm'
                      : 'bg-ios-blue text-white rounded-tr-sm'
                  }`}
                >
                  {/* Sender Prefix */}
                  {!isUser && (
                    <span className="block text-[9px] font-semibold uppercase tracking-wider text-white/70 mb-1">
                      {isAdmin ? 'Admin' : isBot && m.senderType === 'BOT_AI' ? 'Bot AI' : 'Bot Search'}
                    </span>
                  )}

                  <p className="whitespace-pre-wrap">{m.text}</p>

                  <span className={`text-[10px] block text-right mt-1.5 font-medium ${
                    isUser ? 'text-ios-label-secondary/60' : 'text-white/60'
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
            className="w-72 bg-ios-card h-full shadow-2xl p-5 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3" style={HAIRLINE}>
              <h3 className="font-semibold text-[15px] text-ios-label">Foydalanuvchi profili</h3>
              <button onClick={() => setShowInfoModal(false)} className="text-ios-label-secondary/70 active:opacity-50">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3.5 text-[13px]">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-ios-label-secondary/70 font-medium uppercase">Mijoz ismi</span>
                <span className="font-medium text-ios-label">{userFullName}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-ios-label-secondary/70 font-medium uppercase">Telegram ID</span>
                <button
                  onClick={handleCopyId}
                  className="flex items-center gap-1.5 font-mono text-[12px] text-ios-blue text-left active:opacity-60"
                >
                  <span>{telegramUserId}</span>
                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-ios-label-secondary/70 font-medium uppercase">Shahar</span>
                <span className="font-medium text-ios-label">{userStats.cityName}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-ios-label-secondary/70 font-medium uppercase">Jami so'rovlari</span>
                <span className="font-medium text-ios-label">{userStats.queryCountTotal} ta</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-ios-label-secondary/70 font-medium uppercase">Shikoyatlari</span>
                <span className="font-medium text-ios-red">{userStats.complaintCount} ta</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reply Form */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-ios-card flex gap-2"
        style={{ borderTop: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Mijozga Telegram orqali javob yozing..."
          className="flex-1 bg-ios-fill/[0.12] rounded-ios px-4 py-2.5 text-[13px] text-ios-label placeholder:text-ios-label-secondary/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="w-10 h-10 rounded-ios bg-ios-blue text-white flex items-center justify-center active:opacity-70 transition-opacity disabled:opacity-40 shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
        </button>
      </form>
    </div>
  );
};
