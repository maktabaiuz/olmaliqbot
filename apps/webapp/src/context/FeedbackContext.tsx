import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

/**
 * Replaces alert()/window.confirm() app-wide with real iOS-style UI:
 * a bottom toast for notices, and a bottom action-sheet for confirmations.
 * Exposed via useToast()/useConfirm() so any screen can swap a bare
 * alert()/confirm() call for the real thing with minimal changes.
 */

interface ToastState {
  id: number;
  message: string;
  tone: 'default' | 'success' | 'error';
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface FeedbackContextType {
  showToast: (message: string, tone?: ToastState['tone']) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, tone: ToastState['tone'] = 'default') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, tone });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfirmState(options);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const closeConfirm = (result: boolean) => {
    setConfirmState(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  };

  return (
    <FeedbackContext.Provider value={{ showToast, confirm }}>
      {children}

      {toast && (
        <div className="fixed bottom-24 left-0 right-0 z-[100] flex justify-center px-6 pointer-events-none animate-fade-in">
          <div
            className={`pointer-events-auto max-w-[320px] px-4 py-2.5 rounded-full shadow-lg text-[14px] font-medium text-white backdrop-blur-xl ${
              toast.tone === 'error' ? 'bg-ios-red/95' : toast.tone === 'success' ? 'bg-ios-green/95' : 'bg-[#1C1C1E]/95'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      {confirmState && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => closeConfirm(false)} />
          <div className="relative w-full max-w-container-max mx-auto px-2 pb-2 flex flex-col gap-2 animate-fade-in">
            <div className="bg-ios-card/95 backdrop-blur-xl rounded-ios-lg overflow-hidden text-center">
              <div className="px-4 py-3.5" style={{ borderBottom: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}>
                <p className="text-[13px] font-semibold text-ios-label">{confirmState.title}</p>
                {confirmState.message && (
                  <p className="text-[13px] text-ios-label-secondary/70 mt-1">{confirmState.message}</p>
                )}
              </div>
              <button
                onClick={() => closeConfirm(true)}
                className={`w-full py-3.5 text-[17px] font-normal active:bg-ios-fill/10 ${
                  confirmState.destructive ? 'text-ios-red' : 'text-ios-blue'
                }`}
              >
                {confirmState.confirmLabel || 'Tasdiqlash'}
              </button>
            </div>
            <button
              onClick={() => closeConfirm(false)}
              className="bg-ios-card/95 backdrop-blur-xl rounded-ios-lg py-3.5 text-[17px] font-bold text-ios-blue active:bg-ios-fill/10"
            >
              {confirmState.cancelLabel || 'Bekor qilish'}
            </button>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used within a FeedbackProvider');
  return ctx;
};
