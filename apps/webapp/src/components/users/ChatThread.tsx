import React from 'react';

export interface ChatMessage {
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

export interface ChatThreadProps {
  messages: ChatMessage[];
  loading: boolean;
  chatEndRef: React.RefObject<HTMLDivElement>;
}

export const ChatThread: React.FC<ChatThreadProps> = ({
  messages,
  loading,
  chatEndRef,
}) => {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-outline text-caption">
        Chat tarixi yuklanmoqda...
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-outline text-body-secondary">
        <span className="material-symbols-outlined text-[48px] mb-2 opacity-50">forum</span>
        Hozircha suhbat tarixi yo'q
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-surface dark:bg-[#17212B]">
      {messages.map((msg) => {
        const isComplaint = msg.isComplaint;
        const complaintBg = isComplaint ? 'bg-error/10 border-error/40' : 'bg-surface-container border-outline-variant/50';

        return (
          <div key={msg.id} className="flex flex-col gap-2">
            {/* User Message (Right Side Bubble) */}
            <div className="flex justify-end">
              <div className="max-w-[85%] bg-primary text-on-primary rounded-2xl rounded-tr-none p-3 shadow-sm">
                <div className="text-caption opacity-80 mb-1 flex items-center justify-between gap-4 font-medium">
                  <span>👤 Foydalanuvchi</span>
                  <span className="text-[10px]">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-body-main whitespace-pre-wrap leading-relaxed">
                  {msg.rawMessage}
                </p>
              </div>
            </div>

            {/* Bot Response Message (Left Side Bubble) */}
            <div className="flex justify-start">
              <div
                className={`max-w-[85%] rounded-2xl rounded-tl-none p-3 border shadow-sm ${complaintBg} dark:bg-[#1C2733]`}
              >
                <div className="text-caption font-bold mb-1.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary dark:text-sky-400 text-[18px]">
                      smart_toy
                    </span>
                    <span className="text-on-surface dark:text-slate-100">Kim bor? Bot</span>

                    {/* Intent Chip */}
                    {msg.intent && (
                      <span className="text-[10px] font-bold bg-primary-container/30 text-primary dark:text-sky-300 px-2 py-0.5 rounded-full uppercase">
                        {msg.intent}
                      </span>
                    )}

                    {isComplaint && (
                      <span className="text-[10px] font-bold bg-error/20 text-error px-2 py-0.5 rounded-full">
                        ⚠️ Shikoyat
                      </span>
                    )}
                  </div>

                  <span className="text-caption text-outline font-normal">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-body-main text-on-surface dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {msg.botResponse}
                </p>

                {msg.complaintReason && (
                  <div className="mt-2 p-2 bg-error/15 rounded-lg text-caption text-error font-medium">
                    Shikoyat sababi: {msg.complaintReason}
                  </div>
                )}
              </div>
            </div>

            {/* Admin Direct Reply Message (Left Side Highlighted) */}
            {msg.adminReply && (
              <div className="flex justify-start pl-4">
                <div className="max-w-[85%] bg-emerald-500/15 border border-emerald-500/30 text-on-surface dark:text-slate-100 rounded-2xl rounded-tl-none p-3 shadow-sm">
                  <div className="text-caption font-bold text-emerald-600 dark:text-emerald-400 mb-1 flex justify-between items-center gap-4">
                    <span>👑 Admin javobi</span>
                    {msg.adminReplyAt && (
                      <span className="text-outline font-normal">
                        {new Date(msg.adminReplyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-body-main whitespace-pre-wrap leading-relaxed">
                    {msg.adminReply}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div ref={chatEndRef} />
    </div>
  );
};
