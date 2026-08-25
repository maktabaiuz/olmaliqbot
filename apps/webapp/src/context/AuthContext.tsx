import React, { createContext, useContext, useEffect, useState } from 'react';

export interface AuthUser {
  id: string;
  telegramId?: string;
  name: string;
  role: 'SUPER_ADMIN' | 'MODERATOR_FULL' | 'MODERATOR_VIEWER' | 'USER';
  cityId: string;
  cityName: string;
}

export type AuthState = 'CHECKING' | 'AUTHENTICATED' | 'ACCESS_DENIED' | 'REQUIRES_PASSWORD' | 'REQUIRES_SETUP' | 'BANNED';

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
  setupPassword: (oneTimePass: string, newPass: string) => Promise<boolean>;
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
          setUser(null);
          setAuthState('ACCESS_DENIED');
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

  const setupPassword = async (oneTimePass: string, newPass: string): Promise<boolean> => {
    try {
      const tgData = window.Telegram?.WebApp?.initData;
      const res = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tgData, oneTimePass, newPass }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          setAuthState('AUTHENTICATED');
          return true;
        }
      }
    } catch (err) {
      console.error('Setup password failed:', err);
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setAuthState('ACCESS_DENIED');
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
