import React, { useState, useEffect } from 'react';

interface PaymentHistoryItem {
  id: string;
  amount: number;
  status: 'PAID' | 'FAILED' | 'PENDING';
  createdAt: string;
}

interface SubscriptionBillingScreenProps {
  onBack: () => void;
}

export const SubscriptionBillingScreen: React.FC<SubscriptionBillingScreenProps> = ({ onBack }) => {
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [currentPlan, setCurrentPlan] = useState({
    name: 'Standart',
    price: "299,000 so'm/oy",
    expiresAt: '2026-09-17T12:00:00Z',
    status: 'ACTIVE',
  });


  const fetchBillingInfo = async () => {
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const headers = { 'x-init-data': initData };
      const response = await fetch('/api/admin/subscription', { headers });
      if (response.ok) {
        const data = await response.json();
        if (data.currentPlan) setCurrentPlan(data.currentPlan);
        if (data.history) setHistory(data.history);
      } else {
        // Fallback default details
        setHistory([
          { id: '1', amount: 299000, status: 'PAID', createdAt: '2026-08-17T10:00:00Z' },
          { id: '2', amount: 299000, status: 'PAID', createdAt: '2026-07-17T10:00:00Z' },
        ]);
      }
    } catch {
      setHistory([
        { id: '1', amount: 299000, status: 'PAID', createdAt: '2026-08-17T10:00:00Z' },
        { id: '2', amount: 299000, status: 'PAID', createdAt: '2026-07-17T10:00:00Z' },
      ]);
    }
  };

  useEffect(() => {
    fetchBillingInfo();
  }, []);

  const handleRenew = () => {
    alert("To'lov click orqali amalga oshiriladi 💳");
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in pb-16">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-on-surface dark:text-slate-100 font-bold active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px] font-bold">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-bold text-on-surface dark:text-slate-100">Obuna & To'lov</h1>
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Hisobingiz va to'lovlar</p>
        </div>
      </div>

      {/* Plan Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 rounded-2xl shadow-md space-y-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full blur-xl -mr-6 -mt-6" />
        
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Faol Tarif</span>
          <h2 className="text-xl font-extrabold">{currentPlan.name}</h2>
          <p className="text-xs text-blue-100/90 mt-0.5">{currentPlan.price}</p>
        </div>

        <div className="flex items-center justify-between border-t border-white/20 pt-3 text-xs">
          <span>Amal qilish muddati:</span>
          <span className="font-bold">
            {new Date(currentPlan.expiresAt).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      <button
        onClick={handleRenew}
        className="w-full py-3.5 bg-gradient-to-r from-[#2AABEE] to-[#0088CC] text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-[18px]">credit_card</span>
        Obunani uzaytirish
      </button>

      {/* Payment History Grouped List */}
      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">To'lovlar tarixi</h3>
        <div className="bg-surface dark:bg-[#17212B] rounded-2xl border border-outline-variant/30 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-outline-variant/10 dark:divide-slate-800/80">
          {history.map((h) => (
            <div key={h.id} className="p-3.5 flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-on-surface dark:text-slate-100">
                  {h.amount.toLocaleString('uz-UZ')} so'm
                </span>
                <span className="text-[9px] text-slate-500">
                  {new Date(h.createdAt).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                h.status === 'PAID'
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-rose-500/10 text-rose-500'
              }`}>
                {h.status === 'PAID' ? 'To\'landi' : 'Xato'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
