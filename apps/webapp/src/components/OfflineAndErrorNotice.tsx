import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('WebApp Error Boundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center space-y-4 my-auto bg-surface dark:bg-[#1C2733] rounded-2xl border border-outline-variant/30 dark:border-slate-800 m-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[28px]">warning</span>
          </div>
          <div>
            <h3 className="font-bold text-base text-on-surface dark:text-slate-100">Nimadir xato ketdi</h3>
            <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-1">
              Ma'lumotlarni yuklashda vaqtinchalik muammo yuzaga keldi. Qayta urinib ko'ring.
            </p>
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="px-4 py-2 bg-primary text-white font-bold text-xs rounded-xl shadow-sm hover:opacity-90 active:scale-95 transition-all"
          >
            Qayta yuklash 🔄
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export const OfflineStatusBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-slate-950 font-bold text-xs px-4 py-2 text-center flex items-center justify-center gap-2 shadow-md animate-fadeIn">
      <span className="material-symbols-outlined text-[18px]">wifi_off</span>
      <span>Internet aloqasi uzildi. Qoralama qurilmangizda saqlanadi.</span>
    </div>
  );
};
