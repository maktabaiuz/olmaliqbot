import React, { useEffect, useRef, useState } from 'react';
import type { Route } from '../lib/router';
import { goBack } from '../lib/router';
import { api } from '../lib/api';
import type { Listing } from '../lib/types';
import { haptic } from '../lib/telegram';
import { Blob } from '../components/Blob';
import { ChatItemCard } from './chat/ItemCard';

interface Msg {
  id: number;
  role: 'user' | 'bot';
  text: string;
  items?: Listing[];
  time: string;
}

const SUGGESTIONS = [
  { e: '💊', t: 'Yaqin dorixona' },
  { e: '🚕', t: 'Tungi taksi' },
  { e: '🔥', t: 'Kalonka ustasi' },
  { e: '⚡', t: 'Elektr avariya' },
];
const now = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
const BUBBLE_BOT =
  'p-4 rounded-2xl rounded-bl-sm bg-surface-container-lowest text-on-surface shadow-[inset_2px_2px_4px_rgba(255,255,255,0.9),inset_-2px_-2px_4px_rgba(83,65,205,0.04),0_8px_20px_-4px_rgba(83,65,205,0.08)]';

const BotRow: React.FC<{ time?: string; children: React.ReactNode }> = ({ time, children }) => (
  <div className="flex items-end gap-space-sm max-w-[96%] anim-slide-up">
    <div className="relative shrink-0 mb-1">
      <Blob shape="sphere" mood="idle" size={40} />
    </div>
    <div className="flex flex-col items-start gap-1 min-w-0 w-full">
      <div className="flex items-center gap-1.5 px-1">
        <span className="font-label-sm text-label-sm text-primary font-bold">Borvoy</span>
        {time && <span className="font-body-sm text-body-sm text-on-surface-variant/70">{time}</span>}
      </div>
      {children}
    </div>
  </div>
);

export const ChatScreen: React.FC<{ route: Route }> = () => {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const end = useRef<HTMLDivElement>(null);
  const welcomeTime = useRef(now());

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs, busy]);

  const send = async (raw: string) => {
    const message = raw.trim();
    if (!message || busy) return;
    haptic('light');
    setText('');
    setMsgs((m) => [...m, { id: ++seq.current, role: 'user', text: message, time: now() }]);
    setBusy(true);
    try {
      const r = await api.assistant(message);
      setMsgs((m) => [...m, { id: ++seq.current, role: 'bot', text: r.reply, items: r.items || [], time: now() }]);
      haptic('select');
    } catch {
      setMsgs((m) => [...m, { id: ++seq.current, role: 'bot', text: "Hozir javob bera olmadim, keyinroq urinib ko'ring", time: now() }]);
      haptic('error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-background min-h-screen max-w-md mx-auto">
      <header className="sticky top-0 z-40 pt-safe bg-surface/90 backdrop-blur-xl shadow-[0_4px_20px_-4px_rgba(108,92,231,0.06)]">
        <div className="h-14 px-margin flex items-center gap-3">
          <button
            aria-label="Orqaga"
            onClick={() => {
              haptic('light');
              goBack();
            }}
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-primary active:scale-90 active:bg-surface-container transition-all"
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back_ios_new</span>
          </button>
          <Blob shape="sphere" mood="idle" size={36} />
          <div className="flex flex-col min-w-0">
            <span className="font-headline-sm text-headline-sm text-on-surface leading-tight">Borvoy</span>
            <span className="font-label-sm text-label-sm text-tertiary flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> AI yordamchi
            </span>
          </div>
        </div>
      </header>

      <div className="px-margin pt-space-md flex justify-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high/80 backdrop-blur-md shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),0_2px_6px_rgba(0,0,0,0.03)]">
          <span className="material-symbols-outlined fill text-[16px] text-tertiary">verified_user</span>
          <span className="font-label-sm text-label-sm text-tertiary">Faqat bazadagi ishonchli ma'lumotdan javob beradi</span>
        </div>
      </div>

      <div className="flex flex-col px-margin gap-space-lg pt-space-md pb-44">
        <BotRow time={welcomeTime.current}>
          <div className={BUBBLE_BOT}>
            <p className="font-body-md text-body-md leading-relaxed">
              Assalomu alaykum! Men <strong className="text-primary font-bold">Borvoy</strong> — Olmaliqdagi ustalar, do'konlar va xizmatlar bo'yicha yordamchingizman. 🧭
            </p>
            <p className="font-body-md text-body-md mt-2 text-on-surface-variant">Sizga kim yoki qanday yordam kerak?</p>
          </div>
        </BotRow>

        {msgs.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="flex flex-col items-end self-end max-w-[86%] gap-1 anim-slide-up">
              <div className="p-4 rounded-2xl rounded-br-sm bg-gradient-to-br from-primary-container to-primary text-on-primary shadow-[0_8px_20px_-4px_rgba(83,65,205,0.4),inset_0_2px_0_rgba(255,255,255,0.3)]">
                <p className="font-body-md text-body-md leading-relaxed text-on-primary whitespace-pre-wrap break-words">{m.text}</p>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant px-1">{m.time}</span>
            </div>
          ) : (
            <BotRow key={m.id} time={m.time}>
              <div className={`${BUBBLE_BOT} w-full flex flex-col gap-3`}>
                <p className="font-body-md text-body-md leading-snug whitespace-pre-wrap break-words">{m.text}</p>
                {m.items?.map((l) => <ChatItemCard key={l.id} l={l} />)}
              </div>
            </BotRow>
          ),
        )}

        {busy && (
          <div className="flex items-end gap-space-sm anim-slide-up">
            <Blob shape="sphere" mood="scan" size={40} />
            <div className={`${BUBBLE_BOT} flex items-center gap-1.5 py-3`} aria-label="Yozmoqda">
              {[0, 150, 300].map((d) => (
                <span key={d} className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={end} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-xl pt-2 pb-safe shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-2 px-margin overflow-x-auto no-scrollbar pb-2.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.t}
                disabled={busy}
                onClick={() => void send(s.t)}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-lowest text-on-surface font-label-md text-label-md shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),0_2px_6px_rgba(0,0,0,0.05)] active:scale-95 transition-transform disabled:opacity-60"
              >
                <span>{s.e}</span> <span>{s.t}</span>
              </button>
            ))}
          </div>
          <form
            className="px-margin pb-2 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send(text);
            }}
          >
            <div className="flex-1 flex items-center gap-2 h-12 px-4 rounded-full bg-surface-container-lowest shadow-[inset_2px_2px_4px_rgba(0,0,0,0.04),inset_-1px_-1px_2px_rgba(255,255,255,0.9)]">
              <input
                className="w-full bg-transparent border-0 outline-none text-on-surface placeholder:text-outline font-body-md text-body-md focus:ring-0 p-0"
                placeholder="Kimni yoki nimani qidiryapsiz?..."
                value={text}
                maxLength={500}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
            <button
              type="submit"
              aria-label="Xabarni yuborish"
              disabled={busy || !text.trim()}
              className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 active:scale-95 transition-transform shadow-[0_8px_18px_rgba(83,65,205,0.4),inset_0_2px_0_rgba(255,255,255,0.35)] disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px] -rotate-45 ml-0.5">send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
