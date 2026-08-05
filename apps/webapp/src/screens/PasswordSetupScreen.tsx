import React, { useState } from 'react';

export interface PasswordSetupScreenProps {
  adminName?: string;
  onSetupPassword: (oneTimePass: string, newPass: string) => Promise<boolean>;
}

export const PasswordSetupScreen: React.FC<PasswordSetupScreenProps> = ({
  adminName = 'Admin',
  onSetupPassword,
}) => {
  const [oneTimePass, setOneTimePass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      setError("Yangi parollar mos kelmadi!");
      return;
    }

    if (newPass.length < 6) {
      setError("Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak!");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const success = await onSetupPassword(oneTimePass, newPass);
      if (!success) {
        setError("Bir martalik parol noto'g'ri!");
      }
    } catch (err: any) {
      setError("Parol o'rnatishda xatolik yuz berdi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-8 max-w-sm w-full shadow-2xl backdrop-blur-md">
        <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-5 text-amber-400 text-2xl">
          🛡️
        </div>

        <h1 className="text-xl font-bold mb-1 text-slate-100 text-center">
          Birinchi kirish, {adminName}
        </h1>
        <p className="text-slate-400 text-xs mb-6 text-center">
          Berilgan bir martalik parolni kiriting va o'zingizning shaxsiy parolingizni o'rnating
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Bir martalik berilgan parol
            </label>
            <input
              type="password"
              value={oneTimePass}
              onChange={(e) => setOneTimePass(e.target.value)}
              placeholder="Sizga berilgan parol"
              required
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Yangi shaxsiy parol
            </label>
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Kamida 6 belgi"
              required
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Yangi parolni takrorlang
            </label>
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Parolni qayta kiriting"
              required
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !oneTimePass || !newPass}
            className="w-full bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saqlanmoqda..." : "Parolni o'rnatish va kirish"}
          </button>
        </form>
      </div>
    </div>
  );
};
