import React, { useState } from 'react';

export interface LoginScreenProps {
  adminName?: string;
  onLogin: (password: string) => Promise<{ success: boolean; message?: string }>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  adminName: _adminName = 'Admin',
  onLogin,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await onLogin(password);
      if (!result.success) {
        setError(result.message || "Parol noto'g'ri. Qayta urinib ko'ring.");
      }
    } catch (err: any) {
      setError("Autentifikatsiya xatoligi yuz berdi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ios-bg text-ios-label flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Kompyuter oldidagi o'rdak — animatsion WebP (shaffof fon, tungi/kunduzgi
            rejim, iPhone/Telegram'da ham o'zi aylanadi) */}
        <img
          src="/login-duck.webp"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="block w-52 h-52 mx-auto mb-2 select-none pointer-events-none dark:[filter:drop-shadow(0_0_16px_rgba(255,255,255,0.18))]"
        />

        <h1 className="text-[22px] font-semibold mb-1 text-ios-label text-center">
          Bu bo'lim adminlar uchun
        </h1>
        <p className="text-ios-label-secondary/70 text-[15px] mb-6 text-center">
          Ish olib borilmoqda · parolni kiriting
        </p>

        {error && (
          <div className="mb-4 px-3.5 py-3 bg-ios-red/10 rounded-ios text-ios-red text-[13px] text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-ios-card rounded-ios shadow-sm px-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Parol"
              required
              autoFocus
              className="w-full bg-transparent py-3.5 text-[16px] text-ios-label placeholder:text-ios-label-secondary/50 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !password.trim()}
            className="w-full bg-ios-blue active:opacity-70 text-white font-medium py-3.5 rounded-ios text-[16px] transition-opacity disabled:opacity-40"
          >
            {isSubmitting ? 'Tekshirilmoqda…' : 'Kirish'}
          </button>
        </form>
      </div>
    </div>
  );
};
