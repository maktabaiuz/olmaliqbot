import { useEffect, useRef, useState } from 'react';

const KEY = 'kimbor_recent';

export function getRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function saveRecent(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 8)));
  } catch {
    /* ignore */
  }
}

export function pushRecent(q: string): string[] {
  const t = q.trim();
  if (!t) return getRecent();
  const list = [t, ...getRecent().filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 8);
  saveRecent(list);
  return list;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SR = (): any => (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const speechSupported = () => typeof window !== 'undefined' && !!SR();

/** Ovozli qidiruv: start() → interim matn, yakunda onFinal(text). */
export function useVoice(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [text, setText] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rec = useRef<any>(null);
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;

  const stop = () => {
    try {
      rec.current?.abort();
    } catch {
      /* ignore */
    }
    rec.current = null;
    setListening(false);
  };

  const start = () => {
    const Ctor = SR();
    if (!Ctor) return;
    stop();
    const r = new Ctor();
    r.lang = 'uz-UZ';
    r.interimResults = true;
    r.maxAlternatives = 1;
    let last = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      let s = '';
      for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript;
      last = s;
      setText(s);
    };
    r.onerror = () => setListening(false);
    r.onend = () => {
      setListening(false);
      rec.current = null;
      if (last.trim()) finalRef.current(last.trim());
    };
    rec.current = r;
    setText('');
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
    }
  };

  /** Hozirgi matn bilan darhol yakunlash. */
  const finish = () => {
    const t = text.trim();
    stop();
    if (t) finalRef.current(t);
  };

  useEffect(() => () => stop(), []);
  return { listening, text, start, stop, finish };
}
