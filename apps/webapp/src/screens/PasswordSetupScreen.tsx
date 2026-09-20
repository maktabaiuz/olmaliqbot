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
    <div className="min-h-screen bg-ios-bg text-ios-label flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="w-16 h-16 bg-ios-orange/10 rounded-full flex items-center justify-center mx-auto mb-5 text-ios-orange">
          <span className="material-symbols-outlined text-[30px]">shield</span>
        </div>

        <h1 className="text-[22px] font-semibold mb-1 text-ios-label text-center">
          Birinchi kirish, {adminName}
        </h1>
        <p className="text-ios-label-secondary/70 text-[15px] mb-6 text-center">
          Berilgan bir martalik parolni kiriting va shaxsiy parolingizni o'rnating
        </p>

        {error && (
          <div className="mb-4 px-3.5 py-3 bg-ios-red/10 rounded-ios text-ios-red text-[13px] text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-ios-card rounded-ios shadow-sm overflow-hidden">
            <div className="px-4" style={{ borderBottom: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}>
              <input
                type="password"
                value={oneTimePass}
                onChange={(e) => setOneTimePass(e.target.value)}
                placeholder="Bir martalik parol"
                required
                className="w-full bg-transparent py-3.5 text-[16px] text-ios-label placeholder:text-ios-label-secondary/50 focus:outline-none"
              />
            </div>
            <div className="px-4" style={{ borderBottom: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Yangi parol (kamida 6 belgi)"
                required
                className="w-full bg-transparent py-3.5 text-[16px] text-ios-label placeholder:text-ios-label-secondary/50 focus:outline-none"
              />
            </div>
            <div className="px-4">
              <input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Yangi parolni takrorlang"
                required
                className="w-full bg-transparent py-3.5 text-[16px] text-ios-label placeholder:text-ios-label-secondary/50 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !oneTimePass || !newPass}
            className="w-full bg-ios-blue active:opacity-70 text-white font-medium py-3.5 rounded-ios text-[16px] transition-opacity disabled:opacity-40"
          >
            {isSubmitting ? "Saqlanmoqda…" : "Parolni o'rnatish va kirish"}
          </button>
        </form>
      </div>
    </div>
  );
};
