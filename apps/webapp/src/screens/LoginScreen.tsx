import React, { useState } from 'react';

export interface LoginScreenProps {
  adminName?: string;
  onLogin: (loginCode: string, password: string) => Promise<boolean>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  adminName = 'Admin',
  onLogin,
}) => {
  const [loginCode, setLoginCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginCode.trim() || !password.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const success = await onLogin(loginCode, password);
      if (!success) {
        setError("Login kodi yoki parol noto'g'ri. Qayta urinib ko'ring.");
      }
    } catch (err: any) {
      setError("Autentifikatsiya xatoligi yuz berdi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-7 max-w-sm w-full shadow-2xl backdrop-blur-md">
        <div className="w-14 h-14 bg-brand-500/10 border border-brand-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-brand-400 text-2xl shadow-inner">
          🔐
        </div>

        <h1 className="text-xl font-bold mb-1 text-slate-100 text-center">
          Xush kelibsiz, {adminName}
        </h1>
        <p className="text-slate-400 text-xs mb-5 text-center">
          3 Qavatli Xavfsiz Autentifikatsiya Paneliga Kirish
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Login kodi (6-xonali raqam)
            </label>
            <input
              type="text"
              maxLength={6}
              value={loginCode}
              onChange={(e) => setLoginCode(e.target.value.replace(/\D/g, ''))}
              placeholder="Masalan: 483920"
              required
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors font-mono tracking-wider"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Parol (6-harf yoki shaxsiy parol)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masalan: kavtre"
              required
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !loginCode.trim() || !password.trim()}
            className="w-full bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white font-semibold py-3.5 px-4 rounded-xl text-sm transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Tekshirilmoqda...' : '🔐 Panelga kirish'}
          </button>
        </form>
      </div>
    </div>
  );
};
