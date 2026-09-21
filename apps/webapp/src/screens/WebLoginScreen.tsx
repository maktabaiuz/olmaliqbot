import React, { useState } from 'react';

export interface WebLoginScreenProps {
  onLogin: (loginUsername: string, password: string) => Promise<{ success: boolean; message?: string }>;
}

/**
 * Telegram tashqarisida, oddiy brauzerdan (masalan https://olmaliq.online)
 * kirilganda ko'rsatiladigan login ekrani — login+parol admin tomonidan
 * avval (Telegram orqali, "Til va Mavzu" sozlamalarida) o'rnatilgan bo'lishi
 * kerak.
 */
export const WebLoginScreen: React.FC<WebLoginScreenProps> = ({ onLogin }) => {
  const [loginUsername, setLoginUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !password.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await onLogin(loginUsername.trim(), password);
      if (!result.success) {
        setError(result.message || "Login yoki parol noto'g'ri.");
      }
    } catch (err: any) {
      setError('Autentifikatsiya xatoligi yuz berdi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ios-bg text-ios-label flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="w-16 h-16 bg-ios-blue/10 rounded-full flex items-center justify-center mx-auto mb-5 text-ios-blue">
          <span className="material-symbols-outlined text-[28px]">language</span>
        </div>

        <h1 className="text-[22px] font-semibold mb-1 text-ios-label text-center">
          Kim bor? — Admin panel
        </h1>
        <p className="text-ios-label-secondary/70 text-[15px] mb-6 text-center">
          Saytdan kirish uchun login va parolingizni kiriting
        </p>

        {error && (
          <div className="mb-4 px-3.5 py-3 bg-ios-red/10 rounded-ios text-ios-red text-[13px] text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-ios-card rounded-ios shadow-sm">
            <div className="px-4" style={{ borderBottom: '0.5px solid rgb(var(--ios-separator) / 0.29)' }}>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Login"
                autoCapitalize="none"
                autoCorrect="off"
                required
                autoFocus
                className="w-full bg-transparent py-3.5 text-[16px] text-ios-label placeholder:text-ios-label-secondary/50 focus:outline-none"
              />
            </div>
            <div className="px-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Parol"
                required
                className="w-full bg-transparent py-3.5 text-[16px] text-ios-label placeholder:text-ios-label-secondary/50 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !loginUsername.trim() || !password.trim()}
            className="w-full bg-ios-blue active:opacity-70 text-white font-medium py-3.5 rounded-ios text-[16px] transition-opacity disabled:opacity-40"
          >
            {isSubmitting ? 'Tekshirilmoqda…' : 'Kirish'}
          </button>
        </form>

        <p className="text-[13px] text-ios-label-secondary/60 text-center mt-6 leading-relaxed">
          Login/parolingiz yo'qmi? Telegram botdan admin panelga kiring va
          "Yana → Til va Mavzu" bo'limidan saytga kirish uchun login
          o'rnating.
        </p>
      </div>
    </div>
  );
};
