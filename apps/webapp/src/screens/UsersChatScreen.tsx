import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';
import { UserList, UserItem } from '../components/users/UserList';
import { UserProfileCard } from '../components/users/UserProfileCard';
import { ChatThread, ChatMessage } from '../components/users/ChatThread';
import { ReplyBox } from '../components/users/ReplyBox';

export const UsersChatScreen: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'active' | 'complaints' | 'new'>('all');
  const [sort, setSort] = useState<'active' | 'newest' | 'complaints'>('active');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [sendingReply, setSendingReply] = useState<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Users List
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (filter !== 'all') params.set('filter', filter);
      if (sort !== 'active') params.set('sort', sort);

      const res = await fetch(`${API_BASE_URL}/admin/users?${params.toString()}`, {
        headers: { 'x-telegram-init-data': initData },
      });

      if (res.ok) {
        const data: UserItem[] = await res.json();
        setUsers(data);

        // Auto-select first user if none selected or previous selection missing
        if (data.length > 0 && !selectedUser) {
          setSelectedUser(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchQuery, filter, sort]);

  // 2. Fetch Chat Messages for Selected User
  const fetchMessages = async (telegramUserId: string) => {
    setLoadingMessages(true);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch(`${API_BASE_URL}/admin/users/${telegramUserId}/messages`, {
        headers: { 'x-telegram-init-data': initData },
      });

      if (res.ok) {
        const data: ChatMessage[] = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Failed to fetch user messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.telegramUserId);
    } else {
      setMessages([]);
    }
  }, [selectedUser?.telegramUserId]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Send Direct Admin Reply via API (Optimistic Update)
  const handleSendReply = async (messageText: string) => {
    if (!selectedUser) return;

    setSendingReply(true);

    // Optimistic Update
    const tempId = `temp-${Date.now()}`;
    const newAdminMsg: ChatMessage = {
      id: tempId,
      telegramUserId: selectedUser.telegramUserId,
      rawMessage: '[Admin Xabari]',
      botResponse: messageText,
      intent: 'SERVICE',
      isComplaint: false,
      complaintReason: null,
      adminReply: messageText,
      adminReplyAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newAdminMsg]);

    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch(`${API_BASE_URL}/admin/users/${selectedUser.telegramUserId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': initData,
        },
        body: JSON.stringify({
          message: messageText,
          logId: selectedUser.latestLogId,
        }),
      });

      if (res.ok) {
        // Refetch to align exact timestamps & DB state
        await fetchMessages(selectedUser.telegramUserId);
      } else {
        alert('Xabar yuborishda xatolik yuz berdi');
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
      alert('Tarmoq xatoligi yuz berdi');
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-surface text-on-background overflow-hidden">
      {/* LEFT PANE: Ekran 1 — Userlar ro'yxati */}
      <div className="w-full md:w-2/5 lg:w-1/3 h-1/2 md:h-full shrink-0">
        <UserList
          users={users}
          loading={loadingUsers}
          selectedUserId={selectedUser?.telegramUserId || null}
          onSelectUser={(u) => setSelectedUser(u)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filter={filter}
          onFilterChange={setFilter}
          sort={sort}
          onSortChange={setSort}
        />
      </div>

      {/* RIGHT PANE: Ekran 2 — Chuqur Profil + Chat Thread + Sticky Reply */}
      <div className="flex-1 flex flex-col h-1/2 md:h-full overflow-hidden bg-surface">
        {selectedUser ? (
          <>
            {/* Profil Kartasi (Yuqorida) */}
            <UserProfileCard user={selectedUser} />

            {/* Chat Tarixi (O'rtada, scroll) */}
            <ChatThread messages={messages} loading={loadingMessages} chatEndRef={chatEndRef as any} />

            {/* Admin Qo'lda Javob (Pastda, sticky) */}
            <ReplyBox onSendReply={handleSendReply} sending={sendingReply} />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-outline text-body-main">
            <span className="material-symbols-outlined text-[64px] mb-3 opacity-40">person_search</span>
            Suhbatni ko'rish uchun chap ro'yxatdan foydalanuvchini tanlang
          </div>
        )}
      </div>
    </div>
  );
};
