import React, { useState } from 'react';
import { API_BASE_URL } from '../../config';

export interface AiCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiCopilotDrawer: React.FC<AiCopilotDrawerProps> = ({ isOpen, onClose }) => {
  const [prompt, setPrompt] = useState<string>('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: "Salom! Men sizning AI Copilot yordamchingizman 🤖 Shaharingiz statistikasini bilish yoki yangi usta qo'shishda yordam bera olaman.",
    },
  ]);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userMsg = prompt.trim();
    setPrompt('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch(`${API_BASE_URL}/admin/copilot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': initData,
        },
        body: JSON.stringify({ prompt: userMsg }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply || 'Tushundim!' }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Kechirasiz, javob olishda xatolik bo\'ldi.' }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Tarmoq xatoligi yuz berdi.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#16212F] rounded-t-card max-w-container-max mx-auto w-full h-[80vh] flex flex-col shadow-2xl border-t border-ios-purple/30">
        {/* Drawer Header */}
        <div className="p-4 border-b border-ios-separator dark:border-ios-darkSeparator flex items-center justify-between bg-ios-purple/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-icon bg-ios-purple text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[20px]">smart_toy</span>
            </div>
            <div>
              <h3 className="font-bold text-[16px] text-tg-textLight dark:text-tg-textDark">
                AI Copilot Yordamchi
              </h3>
              <p className="text-[11px] text-ios-purple font-semibold">Gemini Pro Agent</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-ios-separator dark:bg-slate-800 text-tg-textMuted flex items-center justify-center font-bold text-xs"
          >
            ✕
          </button>
        </div>

        {/* Chat Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-tg-bgLight dark:bg-tg-bgDark">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-2xl text-[14px] leading-relaxed shadow-sm ${
                  m.role === 'user'
                    ? 'bg-ios-purple text-white rounded-tr-none'
                    : 'bg-white dark:bg-[#1C2733] text-tg-textLight dark:text-tg-textDark rounded-tl-none border border-ios-separator/60 dark:border-ios-darkSeparator'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-[#1C2733] p-3 rounded-2xl text-[12px] text-tg-textMuted animate-pulse">
                AI fikrlamoqda...
              </div>
            </div>
          )}
        </div>

        {/* Prompt Input */}
        <form onSubmit={handleSend} className="p-3 border-t border-ios-separator dark:border-ios-darkSeparator bg-white dark:bg-[#16212F] flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="AI agentdan so'rang (masalan: gazaviklarni statistikasi)..."
            className="flex-1 px-4 py-2.5 rounded-btn bg-tg-bgLight dark:bg-tg-bgDark border border-ios-separator dark:border-ios-darkSeparator text-[14px] text-tg-textLight dark:text-tg-textDark focus:outline-none focus:border-ios-purple"
          />
          <button
            type="submit"
            disabled={!prompt.trim() || loading}
            className="px-4 py-2.5 bg-ios-purple text-white font-bold rounded-btn active-scale disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
