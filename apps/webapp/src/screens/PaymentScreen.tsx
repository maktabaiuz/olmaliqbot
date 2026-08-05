import React, { useState } from 'react';

export interface PaymentScreenProps {
  planType?: 'ASOSCHI' | 'STANDART' | 'KATTA_SHAHAR';
  onCheckoutComplete: (credentials: { loginCode: string; tempPassword: string }) => void;
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({
  planType = 'ASOSCHI',
  onCheckoutComplete,
}) => {
  const [loading, setLoading] = useState(false);

  const planDetails = {
    ASOSCHI: { name: '🌟 Asoschi', price: '149 000 so\'m/oy', desc: 'Birinchi 3 shahar uchun umrbod tarif' },
    STANDART: { name: '🏙️ Standart', price: '299 000 so\'m/oy', desc: 'Oddiy shahar va o\'rta hududlar uchun' },
    KATTA_SHAHAR: { name: '🏛️ Katta shahar', price: '499 000 so\'m/oy', desc: '10 000+ auditoriyaga ega katta shaharlar' },
  }[planType];

  const handleTestCheckout = async () => {
    setLoading(true);

    try {
      const res = await fetch('/api/auth/test-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType }),
      });

      const data = await res.json();
      if (data.success) {
        onCheckoutComplete(data.credentials);
      } else {
        alert(data.message || 'To\'lov xatosi');
      }
    } catch (e) {
      console.error(e);
      // Fallback local test mode generator
      const mockLogin = Math.floor(100000 + Math.random() * 900000).toString();
      const mockPass = 'kavtre';
      onCheckoutComplete({ loginCode: mockLogin, tempPassword: mockPass });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans max-w-container-max mx-auto p-4 flex flex-col justify-between">
      <div className="space-y-6 pt-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-brand-500/10 border border-brand-500/30 rounded-2xl flex items-center justify-center mx-auto text-brand-400 text-3xl shadow-inner">
            💳
          </div>
          <h1 className="text-xl font-bold text-slate-100">Shahar Bot Tarifini Tanlash</h1>
          <p className="text-xs text-slate-400">To'lov va ro'yxatdan o'tish sahifasi</p>
        </div>

        {/* Selected Plan Card */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 space-y-3 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <span className="font-bold text-base text-slate-100">{planDetails.name}</span>
            <span className="text-sm font-extrabold text-brand-400 bg-brand-500/10 px-3 py-1 rounded-full border border-brand-500/20">
              {planDetails.price}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{planDetails.desc}</p>
        </div>

        {/* Test Mode Banner (Section 2 Specification) */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-2 text-xs text-amber-200">
          <div className="flex items-center gap-2 font-bold text-amber-400">
            <span>🧪</span> <span>SINOV REJIMIDASIZ</span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-300/90">
            Haqiqiy to'lov tizimi keyin ulanadi. Hozir <b>'Sinov rejimi (Test Checkout)'</b> tugmasini bosib, login va parol olishingiz hamda ro'yxatdan o'tishni davom ettirishingiz mumkin.
          </p>
        </div>
      </div>

      {/* Action Button */}
      <div className="pb-4 pt-6">
        <button
          onClick={handleTestCheckout}
          disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-500 active:bg-brand-700 disabled:opacity-50 text-white font-bold py-4 px-4 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-xl transition-all"
        >
          {loading ? (
            <span>Generatsiya qilinmoqda...</span>
          ) : (
            <>
              <span>⚡</span>
              <span>Sinov rejimi (Test Checkout)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
