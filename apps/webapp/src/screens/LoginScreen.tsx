import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await login(password);
      if (!res.success) {
        setErrorMsg(res.message || 'Parol noto\'g\'ri');
      }
    } catch (err) {
      setErrorMsg('Tarmoq xatoligi yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = (role: 'SUPER_ADMIN' | 'CITY_ADMIN') => {
    if (window.Telegram?.WebApp?.ready) {
      window.Telegram.WebApp.ready();
    }
    // Set test auth directly
    window.location.href = role === 'SUPER_ADMIN' ? '?role=SUPER_ADMIN' : '?role=CITY_ADMIN';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-ios-bg dark:bg-[#0E141B]">
      <div className="bg-white dark:bg-[#16212F] p-6 rounded-card border border-ios-sep dark:border-[#2C2C2E] shadow-2xl w-full max-w-sm flex flex-col items-center gap-4 text-center">
        {/* Super-Admin Gold / Telegram Icon */}
        <div className="w-16 h-16 rounded-full bg-gold-grad text-white flex items-center justify-center shadow-fab">
          <span className="material-symbols-outlined text-[36px]">workspace_premium</span>
        </div>

        <div>
          <h2 className="font-extrabold text-[20px] text-[#1C1C1E] dark:text-white">
            Boshqaruv Markazi Kirish 👑
          </h2>
          <p className="text-[12px] text-ios-gray mt-1">
            "Kim bor?" shahar va super-admin paneliga xush kelibsiz! Sinash uchun pastdagi tugmani bosing:
          </p>
        </div>

        {/* Zudlik bilan bir bosishda kirish tugmalari */}
        <div className="w-full space-y-2 pt-1">
          <button
            type="button"
            onClick={() => handleQuickDemoLogin('SUPER_ADMIN')}
            className="w-full py-3 rounded-btn bg-gold-grad text-white font-bold text-[14px] shadow-fab active-scale flex items-center justify-center gap-2"
          >
            <span>👑 Super-Admin Sifatida Kirish</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickDemoLogin('CITY_ADMIN')}
            className="w-full py-2.5 rounded-btn bg-tg-grad text-white font-bold text-[13px] active-scale flex items-center justify-center gap-2"
          >
            <span>🏙 Shahar Admini (Olmaliq)</span>
          </button>
        </div>

        <div className="relative w-full flex items-center justify-center my-1">
          <div className="border-t border-ios-sep w-full"></div>
          <span className="bg-white dark:bg-[#16212F] px-3 text-[11px] text-ios-gray absolute font-semibold">yoki parol bilan</span>
        </div>

        {errorMsg && (
          <div className="w-full p-2.5 bg-ios-red/15 text-ios-red text-[12px] font-bold rounded-btn border border-ios-red/30">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="w-full space-y-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-3 text-ios-gray text-[20px]">
              key
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin paroli (admin/superadmin)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-btn bg-ios-bg dark:bg-[#0E141B] border border-ios-sep text-[14px] text-[#1C1C1E] dark:text-white focus:outline-none focus:border-tg"
            />
          </div>

          <button
            type="submit"
            disabled={!password.trim() || loading}
            className="w-full py-2.5 rounded-btn bg-ios-sep dark:bg-slate-800 text-[#1C1C1E] dark:text-white font-bold text-[13px] active-scale disabled:opacity-50"
          >
            {loading ? 'Tekshirilmoqda...' : 'Parol Bilan Kirish →'}
          </button>
        </form>
      </div>
    </div>
  );
};
