import React, { createContext, useContext, useEffect, useState } from 'react';

export interface AuthUser {
  id: string;
  telegramId?: string;
  name: string;
  role: 'SUPER_ADMIN' | 'MODERATOR_FULL' | 'MODERATOR_VIEWER' | 'USER';
  cityId: string;
  cityName: string;
}

export type AuthState = 'CHECKING' | 'AUTHENTICATED' | 'ACCESS_DENIED' | 'REQUIRES_PASSWORD' | 'REQUIRES_SETUP';

interface AuthContextType {
  user: AuthUser | null;
  authState: AuthState;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithPassword: (password: string) => Promise<boolean>;
  setupPassword: (oneTimePass: string, newPass: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authState, setAuthState] = useState<AuthState>('CHECKING');
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
          // Real city ma'lumotini production API dan olamiz (proxy orqali)
          try {
            const cityRes = await fetch('/api/cities');
            const cities = cityRes.ok ? await cityRes.json() : [];
            const firstCity = Array.isArray(cities) && cities.length > 0 ? cities[0] : null;
            setUser({
              id: 'local-dev-superadmin',
              telegramId: '6355516451',
              name: 'Bobur (Dev)',
              role: 'SUPER_ADMIN',
              cityId: firstCity?.id || 'olmaliq',
              cityName: firstCity?.name || 'Olmaliq',
            });
            setAuthState('AUTHENTICATED');
          } catch {
            // City fetch muvaffaqiyatsiz bo'lsa ham kiraveramiz
            setUser({
              id: 'local-dev-superadmin',
              telegramId: '6355516451',
              name: 'Bobur (Dev)',
              role: 'SUPER_ADMIN',
              cityId: 'olmaliq',
              cityName: 'Olmaliq',
            });
            setAuthState('AUTHENTICATED');
          }
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
          if (data.success && data.user) {
            setUser(data.user);
            setAuthState('AUTHENTICATED');
          } else if (data.requiresPassword) {
            setAuthState('REQUIRES_PASSWORD');
          } else if (data.requiresSetup) {
            setAuthState('REQUIRES_SETUP');
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

  const loginWithPassword = async (password: string): Promise<boolean> => {
    try {
      const tgData = window.Telegram?.WebApp?.initData;
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tgData, password }),
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
      console.error('Password login failed:', err);
    }
    return false;
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
