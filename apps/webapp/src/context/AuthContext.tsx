import React, { createContext, useContext, useEffect, useState } from 'react';

export interface AuthUser {
  id: string;
  telegramId?: string;
  name: string;
  // MUHIM (2026-09): bu ro'yxat avval bazadagi haqiqiy Role enum'idan
  // (packages/db/prisma/schema.prisma) FARQ QILAR EDI (masalan
  // "MODERATOR_FULL" bazada umuman yo'q) — natijada frontend real
  // CITY_ADMIN/MODERATOR_* rollarni to'g'ri tekshira olmasdi. Endi
  // bazadagi enum bilan bir xil.
  role: 'SUPER_ADMIN' | 'CITY_ADMIN' | 'MODERATOR_APPROVER' | 'MODERATOR_EDITOR' | 'MODERATOR_VIEWER' | 'USER';
  cityId: string;
  cityName: string;
}

export type AuthState =
  | 'CHECKING'
  | 'AUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'REQUIRES_PASSWORD'
  | 'REQUIRES_SETUP'
  | 'REQUIRES_WEB_LOGIN'
  | 'BANNED';

export interface LoginResult {
  success: boolean;
  message?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  authState: AuthState;
  banMessage: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithPassword: (password: string) => Promise<LoginResult>;
  setupPassword: (password: string) => Promise<LoginResult>;
  /** Telegram tashqarisida, oddiy brauzerdan kirish (saytdan). */
  loginWithWebCredentials: (loginUsername: string, password: string) => Promise<LoginResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authState, setAuthState] = useState<AuthState>('CHECKING');
  const [banMessage, setBanMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // -------------------------------------------------------
        // LOCAL DEV BYPASS (faqat localhost da ishlaydi)
        // Telegram kerak emas — SUPER_ADMIN sifatida avtomatik kiradi
        // -------------------------------------------------------
        const isLocalDev =
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1';

        if (isLocalDev) {
          console.info('[DEV MODE] Super Admin sifatida kirish...');
          setUser({
            id: 'local-dev-superadmin',
            telegramId: '6355516451',
            name: 'Bobur (Dev)',
            role: 'SUPER_ADMIN',
            cityId: 'olmaliq',
            cityName: 'Olmaliq',
          });
          setAuthState('AUTHENTICATED');
          setIsLoading(false);
          return;
        }

        // ----------------------------------------------------
        // PRODUCTION: HMAC verified via Telegram initData
        // ----------------------------------------------------
        const tgData = window.Telegram?.WebApp?.initData;

        if (!tgData) {
          // Telegram konteksti yo'q — oddiy brauzerdan (saytdan) kirilgan
          // bo'lishi mumkin (2026-09, standalone web-login). Avval mavjud
          // sessiya cookie'si hali kuchdami tekshiramiz (masalan sahifa
          // yangilangan bo'lsa) — bo'lmasa, login formasi ko'rsatiladi.
          try {
            const sessionRes = await fetch('/api/auth/session');
            if (sessionRes.ok) {
              const sessionData = await sessionRes.json();
              if (sessionData.success && sessionData.user) {
                setUser(sessionData.user);
                setAuthState('AUTHENTICATED');
                setIsLoading(false);
                return;
              }
            }
          } catch (err) {
            console.error('Session check failed:', err);
          }
          setUser(null);
          setAuthState('REQUIRES_WEB_LOGIN');
          setIsLoading(false);
          return;
        }

        const res = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tgData }),
        });

        if (res.ok) {
          const data = await res.json();
          // Parol talab qilinishi har doim ustuvor tekshiriladi — aks holda
          // "success:true + user" mavjudligi parolni chetlab o'tib, foydalanuvchini
          // parol kiritmasdan turib "kirgan" deb hisoblab qo'yishi mumkin edi.
          if (data.banned) {
            setBanMessage(data.bannedMessage || "Vaqtincha bloklangan.");
            setAuthState('BANNED');
          } else if (data.requiresSetup) {
            setAuthState('REQUIRES_SETUP');
          } else if (data.requiresPassword) {
            setAuthState('REQUIRES_PASSWORD');
          } else if (data.success && data.user) {
            setUser(data.user);
            setAuthState('AUTHENTICATED');
          } else {
            setUser(null);
            setAuthState('ACCESS_DENIED');
          }
        } else {
          setUser(null);
          setAuthState('ACCESS_DENIED');
        }
      } catch (err) {
        console.error('Auth verification error:', err);
        setUser(null);
        setAuthState('ACCESS_DENIED');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const loginWithPassword = async (password: string): Promise<LoginResult> => {
    try {
      const tgData = window.Telegram?.WebApp?.initData;
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tgData, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && data.user) {
        setUser(data.user);
        setAuthState('AUTHENTICATED');
        return { success: true };
      }

      if (data.banned) {
        setBanMessage(data.message || "Vaqtincha bloklangan.");
        setAuthState('BANNED');
        return { success: false, message: data.message };
      }

      return { success: false, message: data.message };
    } catch (err) {
      console.error('Password login failed:', err);
      return { success: false };
    }
  };

  // MUHIM (2026-09 topilgan xato): bu funksiya avval `oneTimePass`/`newPass`
  // maydonlarini yuborardi, lekin backend (`/auth/setup-password`)
  // ANCHA OLDIN soddalashtirilib, yagona `password` maydonini kutadigan
  // bo'lib qolgan edi — bir martalik kod umuman tekshirilmaydi. Bu
  // nomuvofiqlik sabab parol o'rnatish HAR DOIM 400 xatosi bilan
  // muvaffaqiyatsiz bo'lardi. Backend `user` obyektini ham qaytarmaydi
  // (faqat `{success, message}`) — shu sabab `data.user`ni talab qilish
  // ham noto'g'ri edi.
  const setupPassword = async (password: string): Promise<LoginResult> => {
    try {
      const tgData = window.Telegram?.WebApp?.initData;
      const res = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tgData, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setAuthState('AUTHENTICATED');
        return { success: true };
      }
      return { success: false, message: data.message };
    } catch (err) {
      console.error('Setup password failed:', err);
      return { success: false };
    }
  };

  const loginWithWebCredentials = async (loginUsername: string, password: string): Promise<LoginResult> => {
    try {
      const res = await fetch('/api/auth/web-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginUsername, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && data.user) {
        setUser(data.user);
        setAuthState('AUTHENTICATED');
        return { success: true };
      }

      if (data.banned) {
        setBanMessage(data.message || "Vaqtincha bloklangan.");
        setAuthState('BANNED');
        return { success: false, message: data.message };
      }

      return { success: false, message: data.message || "Login yoki parol noto'g'ri" };
    } catch (err) {
      console.error('Web login failed:', err);
      return { success: false };
    }
  };

  const logout = () => {
    setUser(null);
    setAuthState(window.Telegram?.WebApp?.initData ? 'ACCESS_DENIED' : 'REQUIRES_WEB_LOGIN');
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authState,
        banMessage,
        isAuthenticated: authState === 'AUTHENTICATED' && !!user,
        isLoading,
        loginWithPassword,
        setupPassword,
        loginWithWebCredentials,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
