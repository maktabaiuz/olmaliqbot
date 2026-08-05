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
    // ----------------------------------------------------
    // STRICT SECURITY RULE:
    // No mock session fallback!
    // No role or cityId from localStorage!
    // Must be HMAC verified via Telegram initData or API session header.
    // ----------------------------------------------------
    const initAuth = async () => {
      try {
        const tgData = window.Telegram?.WebApp?.initData;

        if (!tgData) {
          // Unauthenticated or opened in standard browser without Telegram initData
          setUser(null);
          setAuthState('ACCESS_DENIED');
          setIsLoading(false);
          return;
        }

        // Send initData to Fastify API server for HMAC-SHA256 signature verification
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
