import React from 'react';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Ushlangan xato:', error, info.componentStack);
  }

  handleRetry = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-ios-bg dark:bg-[#0E141B]">
          <span className="material-symbols-outlined text-ios-red text-[48px]">error</span>
          <div>
            <h2 className="font-bold text-[17px] text-[#1C1C1E] dark:text-white">
              Nimadir xato ketdi
            </h2>
            <p className="text-[13px] text-ios-gray mt-1 max-w-[280px]">
              Sahifani yuklashda kutilmagan xatolik yuz berdi. Qayta urinib ko'ring.
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="px-5 py-2.5 rounded-btn bg-tg text-white font-bold text-[14px] shadow-fab active-scale"
          >
            🔄 Qayta urinish
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
