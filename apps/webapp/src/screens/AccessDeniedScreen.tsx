import React from 'react';

export const AccessDeniedScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-8 max-w-sm w-full shadow-2xl backdrop-blur-md">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-400 text-3xl">
          🔒
        </div>
        
        <h1 className="text-xl font-bold mb-3 text-slate-100">
          Ruxsat berilmadi
        </h1>
        
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          Bu panel faqat shahar adminlari uchun 🔒
        </p>

        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 text-xs text-slate-400">
          Telegram Mini App orqali tasdiqlangan admin hisobi bilan kiring.
        </div>
      </div>
    </div>
  );
};
