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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-tg-bgLight dark:bg-tg-bgDark">
      <div className="bg-white dark:bg-[#16212F] p-6 rounded-card border border-ios-separator/60 dark:border-ios-darkSeparator shadow-xl w-full max-w-sm flex flex-col items-center gap-4 text-center">
        {/* Logo Icon */}
        <div className="w-16 h-16 rounded-full bg-tg-gradient text-white flex items-center justify-center shadow-fab">
          <span className="material-symbols-outlined text-[36px]">lock</span>
        </div>

        <div>
          <h2 className="font-extrabold text-[20px] text-tg-textLight dark:text-tg-textDark">
            Xush kelibsiz 👋
          </h2>
          <p className="text-[12px] text-tg-textMuted mt-0.5">
            Olmaliq shahri admin paneliga kirish uchun parolni kiriting
          </p>
        </div>

        {errorMsg && (
          <div className="w-full p-2.5 bg-ios-red/15 text-ios-red text-[12px] font-bold rounded-btn border border-ios-red/30">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="w-full space-y-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-3 text-tg-textMuted text-[20px]">
              key
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin paroli..."
              className="w-full pl-10 pr-4 py-2.5 rounded-btn bg-tg-bgLight dark:bg-tg-bgDark border border-ios-separator text-[14px] text-tg-textLight dark:text-tg-textDark focus:outline-none focus:border-tg-blue"
            />
          </div>

          <button
            type="submit"
            disabled={!password.trim() || loading}
            className="w-full py-3 rounded-btn bg-tg-gradient text-white font-bold text-[14px] shadow-fab active-scale disabled:opacity-50"
          >
            {loading ? 'Tekshirilmoqda...' : 'Kirish →'}
          </button>
        </form>

        <button
          onClick={() => alert("Parolni tiklash uchun bot orqali bir martalik kod oling")}
          className="text-[11px] font-semibold text-tg-blue hover:underline"
        >
          Parolni unutdingizmi?
        </button>
      </div>
    </div>
  );
};
