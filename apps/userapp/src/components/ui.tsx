import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ApiError } from '../lib/api';
import { Blob, BlobShape, BlobMood } from './Blob';

/** Ma'lumot yuklash: { data, error, loading, reload }. */
export function useAsync<T>(fn: () => Promise<T>, deps: React.DependencyList = []) {
  const [state, setState] = useState<{ data?: T; error?: ApiError; loading: boolean }>({ loading: true });
  const seq = useRef(0);
  const run = useCallback(() => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    fn()
      .then((data) => id === seq.current && setState({ data, loading: false }))
      .catch((error) => id === seq.current && setState({ error: error instanceof ApiError ? error : new ApiError(0, {}), loading: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(run, [run]);
  return { ...state, reload: run };
}

// ---------- Bottom sheet (Stitch "clay-sheet") ----------
export const Sheet: React.FC<{ open: boolean; onClose: () => void; children: React.ReactNode; title?: string }> = ({ open, onClose, children, title }) => {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Yopish" className="absolute inset-0 bg-on-surface/40 backdrop-blur-[2px] animate-[fadeIn_.2s_ease]" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface-container-lowest rounded-t-[2rem] clay-sheet pb-safe anim-slide-up max-h-[92vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1">
          <span className="w-10 h-1.5 rounded-full bg-outline-variant/60 clay-handle" />
        </div>
        {children}
      </div>
    </div>
  );
};

// ---------- Toast ----------
type ToastKind = 'success' | 'error' | 'info';
const ToastCtx = createContext<(msg: string, kind?: ToastKind) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<{ msg: string; kind: ToastKind; id: number } | null>(null);
  const show = useCallback((msg: string, kind: ToastKind = 'info') => {
    const id = Date.now();
    setToast({ msg, kind, id });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div className="fixed top-4 inset-x-0 z-[80] flex justify-center px-margin pointer-events-none pt-safe">
          <div
            className={`anim-slide-up px-4 py-3 rounded-2xl shadow-lg font-label-lg text-label-lg flex items-center gap-2 ${
              toast.kind === 'success' ? 'bg-tertiary-container text-white' : toast.kind === 'error' ? 'bg-error text-white' : 'bg-inverse-surface text-inverse-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[20px] fill">
              {toast.kind === 'success' ? 'check_circle' : toast.kind === 'error' ? 'error' : 'info'}
            </span>
            {toast.msg}
          </div>
        </div>
      )}
    </ToastCtx.Provider>
  );
};

// ---------- Holat ekranlari (bo'sh / xato / internet yo'q) ----------
export const StateView: React.FC<{
  shape?: BlobShape;
  mood?: BlobMood;
  title: string;
  text?: string;
  action?: { label: string; onClick: () => void; icon?: string };
  secondary?: { label: string; onClick: () => void };
}> = ({ shape = 'sphere', mood = 'idle', title, text, action, secondary }) => (
  <div className="flex flex-col items-center text-center px-6 py-10 anim-slide-up">
    <Blob shape={shape} mood={mood} size={112} />
    <h2 className="font-headline-md text-headline-md text-on-surface mt-6">{title}</h2>
    {text && <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-xs">{text}</p>}
    {action && (
      <button
        onClick={action.onClick}
        className="mt-6 h-12 px-6 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-label-lg text-label-lg clay-fab flex items-center gap-2 active:scale-95 transition-transform"
      >
        {action.icon && <span className="material-symbols-outlined text-[20px]">{action.icon}</span>}
        {action.label}
      </button>
    )}
    {secondary && (
      <button onClick={secondary.onClick} className="mt-3 h-11 px-5 rounded-full text-primary font-label-lg text-label-lg active:scale-95">
        {secondary.label}
      </button>
    )}
  </div>
);

/** API xatosini mos holat ekraniga aylantiradi. */
export const ErrorView: React.FC<{ error: ApiError; onRetry: () => void }> = ({ error, onRetry }) =>
  error.status === 0 ? (
    <StateView shape="square" mood="sleepy" title="Internet yo'q" text="Aloqani tekshirib, qayta urinib ko'ring." action={{ label: 'Qayta urinish', icon: 'refresh', onClick: onRetry }} />
  ) : error.status === 401 ? (
    <StateView shape="sphere" mood="sad" title="Telegram orqali oching" text="Ilova faqat Telegram bot ichida ishlaydi." />
  ) : (
    <StateView shape="square" mood="sad" title="Biroz nosozlik" text="Tez orada tuzatamiz. Qayta urinib ko'ring." action={{ label: 'Qayta urinish', icon: 'refresh', onClick: onRetry }} />
  );

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => <div className={`skeleton rounded-2xl ${className}`} />;
