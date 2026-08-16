import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';

interface UserItem {
  telegramUserId: string;
  name: string;
  username: string | null;
  phone?: string | null;
  lastActive: string;
  totalQueries: number;
  complaintsCount: number;
  hasComplaint: boolean;
}

interface ChatMessage {
  id: string;
  telegramUserId: string;
  rawMessage: string;
  botResponse: string;
  intent: string;
  isComplaint: boolean;
  complaintReason: string | null;
  adminReply: string | null;
  adminReplyAt: string | null;
  createdAt: string;
}

export const UsersChatScreen: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [filterComplaints, setFilterComplaints] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  
  const [replyText, setReplyText] = useState<string>('');
  const [sendingReply, setSendingReply] = useState<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load Users List
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const queryParams = new URLSearchParams();
      if (filterComplaints) queryParams.set('complaintsOnly', 'true');
      if (searchQuery) queryParams.set('search', searchQuery);

      const res = await fetch(`${API_BASE_URL}/admin/users?${queryParams.toString()}`, {
        headers: { 'x-telegram-init-data': initData },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        if (data.length > 0 && !selectedUser) {
          setSelectedUser(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filterComplaints, searchQuery]);

  // Load Chat Messages for Selected User
  const fetchMessages = async (telegramUserId: string) => {
    setLoadingMessages(true);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch(`${API_BASE_URL}/admin/users/${telegramUserId}/messages`, {
        headers: { 'x-telegram-init-data': initData },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Failed to fetch user messages', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.telegramUserId);
    }
  }, [selectedUser]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send Direct Telegram Message from Admin
  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !replyText.trim() || sendingReply) return;

    setSendingReply(true);
    try {
      const latestLogId = messages.length > 0 ? messages[messages.length - 1].id : null;
      const res = await fetch(`${API_BASE_URL}/admin/users/${selectedUser.telegramUserId}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyText.trim(),
          logId: latestLogId,
        }),
      });

      if (res.ok) {
        setReplyText('');
        fetchMessages(selectedUser.telegramUserId);
      } else {
        alert('Xabar yuborishda xatolik yuz berdi');
      }
    } catch (err) {
      alert('Tarmoq xatoligi');
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface text-on-background">
      {/* Header Tabs */}
      <div className="flex items-center justify-between p-4 border-b border-outline-variant bg-surface-low">
        <div>
          <h1 className="text-title-bold font-bold text-primary">👥 Foydalanuvchilar va Chatlar</h1>
          <p className="text-body-secondary text-outline">Botga yozganlar hamda shikoyatlar jurnali</p>
        </div>
        <div className="flex bg-surface-container rounded-lg p-1 border border-outline-variant">
          <button
            onClick={() => setFilterComplaints(false)}
            className={`px-3 py-1.5 rounded-md text-body-secondary font-medium transition ${
              !filterComplaints ? 'bg-primary text-on-primary shadow' : 'text-on-background hover:bg-surface-high'
            }`}
          >
            Barchasi
          </button>
          <button
            onClick={() => setFilterComplaints(true)}
            className={`px-3 py-1.5 rounded-md text-body-secondary font-medium transition flex items-center gap-1 ${
              filterComplaints ? 'bg-error text-on-error shadow' : 'text-error hover:bg-error-container'
            }`}
          >
            ⚠️ Shikoyatlar
          </button>
        </div>
      </div>

      {/* Main Content: Dual Pane (User List + Live Chat) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Users List */}
        <div className="w-1/3 min-w-[270px] border-r border-outline-variant flex flex-col bg-surface-low overflow-y-auto">
          {/* Search Bar Input */}
          <div className="p-3 border-b border-outline-variant/60 bg-surface">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Telegram ID, ism yoki username..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/60 focus:outline-none focus:border-primary text-on-surface dark:text-slate-100 placeholder:text-outline"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-outline hover:text-on-surface text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {loadingUsers ? (
            <div className="p-6 text-center text-outline">Yuklanmoqda...</div>
          ) : users.length === 0 ? (
            <div className="p-6 text-center text-outline">
              {filterComplaints ? "Hozircha shikoyatlar yo'q" : "Foydalanuvchilar topilmadi"}
            </div>
          ) : (
            users.map((u) => (
              <div
                key={u.telegramUserId}
                onClick={() => setSelectedUser(u)}
                className={`p-3 border-b border-outline-variant/40 cursor-pointer transition flex flex-col gap-1 ${
                  selectedUser?.telegramUserId === u.telegramUserId
                    ? 'bg-primary-container/20 border-l-4 border-l-primary'
                    : 'hover:bg-surface-high'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-body-main text-on-background flex items-center gap-1.5 line-clamp-1">
                    {u.name || `User ID: ${u.telegramUserId}`}
                    {u.hasComplaint && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-error/15 text-error font-bold">
                        ⚠️ {u.complaintsCount}
                      </span>
                    )}
                  </span>
                  <span className="text-caption text-outline shrink-0 ml-1">
                    {new Date(u.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex items-center justify-between text-caption text-outline">
                  <span className="font-mono text-[11px] bg-surface-container px-1.5 py-0.5 rounded text-primary dark:text-sky-400 font-bold">
                    ID: {u.telegramUserId}
                  </span>
                  {u.username && (
                    <span className="text-body-secondary text-primary dark:text-sky-400 font-medium">
                      {u.username}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Side: Live Chat Screen */}
        <div className="flex-1 flex flex-col bg-surface">
          {selectedUser ? (
            <>
              {/* Chat User Bar */}
              <div className="p-3 bg-surface-high border-b border-outline-variant flex items-center justify-between">
                <div>
                  <div className="font-bold text-body-main text-on-background flex items-center gap-2">
                    💬 {selectedUser.name || `User ID: ${selectedUser.telegramUserId}`}
                    <span className="text-caption text-primary dark:text-sky-400 font-bold font-mono bg-surface-container px-2 py-0.5 rounded">ID: {selectedUser.telegramUserId}</span>
                  </div>
                  <div className="text-body-secondary text-outline">
                    Jami so'rovlar: {selectedUser.totalQueries} ta
                  </div>
                </div>
                {selectedUser.username && (
                  <a
                    href={`https://t.me/${selectedUser.username.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-telegram-blue text-white rounded-lg text-body-secondary hover:opacity-90 transition flex items-center gap-1"
                  >
                    ✈️ Telegramda ochish
                  </a>
                )}
              </div>

              {/* Chat Dialogue Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {loadingMessages ? (
                  <div className="text-center text-outline py-8">Chat tarixi yuklanmoqda...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-outline py-8">Suhbat tarixi topilmadi</div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="space-y-2">
                      {/* User's Question Message */}
                      <div className="flex justify-start">
                        <div className="max-w-[80%] bg-surface-container rounded-2xl rounded-tl-none p-3 border border-outline-variant shadow-sm">
                          <div className="text-caption text-primary font-bold mb-1 flex justify-between items-center gap-4">
                            <span>👤 Foydalanuvchi</span>
                            <span className="text-outline font-normal">
                              {new Date(msg.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                          <p className="text-body-main text-on-background font-medium">{msg.rawMessage}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-caption bg-surface-high text-outline px-2 py-0.5 rounded font-mono">
                              Intent: {msg.intent}
                            </span>
                            {msg.isComplaint && (
                              <span className="text-caption bg-error/15 text-error font-bold px-2 py-0.5 rounded">
                                ⚠️ Shikoyat
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* AI / Bot Response Message */}
                      <div className="flex justify-end">
                        <div className="max-w-[80%] bg-primary-container/30 text-on-primary-container rounded-2xl rounded-tr-none p-3 border border-primary/20 shadow-sm">
                          <div className="text-caption text-primary font-bold mb-1">🤖 AI Bot Javobi</div>
                          <div className="text-body-main whitespace-pre-wrap">{msg.botResponse}</div>
                        </div>
                      </div>

                      {/* Admin's Direct Reply if sent */}
                      {msg.adminReply && (
                        <div className="flex justify-end">
                          <div className="max-w-[80%] bg-secondary-container/40 text-on-secondary-container rounded-2xl rounded-tr-none p-3 border border-secondary/30 shadow-sm">
                            <div className="text-caption text-secondary font-bold mb-1 flex justify-between items-center gap-4">
                              <span>👨‍💼 Admin (Sizning javobingiz)</span>
                              {msg.adminReplyAt && (
                                <span className="text-outline font-normal">
                                  {new Date(msg.adminReplyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            <p className="text-body-main">{msg.adminReply}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Admin Direct Input Box */}
              <form onSubmit={handleSendAdminReply} className="p-3 border-t border-outline-variant bg-surface-low flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Foydalanuvchiga to'g'ridan-to'g meyoriy javob yozing..."
                  className="flex-1 bg-surface border border-outline-variant rounded-xl px-4 py-2 text-body-main text-on-background focus:outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  className="bg-primary text-on-primary px-5 py-2 rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  {sendingReply ? '...' : '🚀 Yuborish'}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-outline">
              Suhbatni ko'rish uchun chap tomondan foydalanuvchini tanlang
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
