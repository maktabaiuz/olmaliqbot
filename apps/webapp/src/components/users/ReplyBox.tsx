import React, { useState } from 'react';

export interface ReplyBoxProps {
  onSendReply: (message: string) => Promise<void>;
  sending: boolean;
}

export const ReplyBox: React.FC<ReplyBoxProps> = ({ onSendReply, sending }) => {
  const [text, setText] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    const messageToSend = text.trim();
    setText('');
    await onSendReply(messageToSend);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 bg-surface-low dark:bg-[#1C2733] border-t border-outline-variant/60 flex items-center gap-2 sticky bottom-0 z-10"
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Foydalanuvchiga Telegram orqali javob yozing..."
        disabled={sending}
        className="flex-1 px-4 py-2.5 rounded-[15px] bg-surface-container border border-outline-variant/60 focus:outline-none focus:border-primary text-body-main text-on-surface dark:text-slate-100 placeholder:text-outline"
      />
      <button
        type="submit"
        disabled={!text.trim() || sending}
        className="px-5 py-2.5 bg-primary text-on-primary font-bold rounded-[15px] hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2 shrink-0 active:scale-95 text-body-main"
      >
        <span>{sending ? 'Yuborilmoqda...' : 'Yuborish'}</span>
        <span className="material-symbols-outlined text-[18px]">send</span>
      </button>
    </form>
  );
};
