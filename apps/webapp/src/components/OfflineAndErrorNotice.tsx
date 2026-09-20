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
        <div className="p-6 text-center space-y-4 my-auto bg-ios-card rounded-ios-lg shadow-sm m-4">
          <div className="w-12 h-12 rounded-full bg-ios-orange/10 text-ios-orange flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[26px]">warning</span>
          </div>
          <div>
            <h3 className="font-semibold text-[16px] text-ios-label">Nimadir xato ketdi</h3>
            <p className="text-[13px] text-ios-label-secondary/70 mt-1">
              Ma'lumotlarni yuklashda vaqtinchalik muammo yuzaga keldi. Qayta urinib ko'ring.
            </p>
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="px-4 py-2.5 bg-ios-blue text-white font-medium text-[14px] rounded-ios active:opacity-70 transition-opacity"
          >
            Qayta yuklash
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
    <div className="sticky top-0 z-50 bg-ios-orange text-white font-medium text-[13px] px-4 py-2 text-center flex items-center justify-center gap-2 animate-fade-in">
      <span className="material-symbols-outlined text-[16px]">wifi_off</span>
      <span>Internet aloqasi uzildi. Qoralama qurilmangizda saqlanadi.</span>
    </div>
  );
};
