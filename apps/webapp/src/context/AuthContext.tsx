import React, { createContext, useContext, useEffect, useState } from 'react';

export interface AuthUser {
  id: string;
  telegramId?: string;
  name: string;
  role: 'SUPER_ADMIN' | 'MODERATOR_FULL' | 'MODERATOR_VIEWER' | 'USER';
  cityId: string;
  cityName: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithPassword: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Attempt Telegram initData auto-login or session restore
    const initAuth = async () => {
      try {
        const tgData = window.Telegram?.WebApp?.initData;
        
        if (tgData) {
          // Send initData to Fastify API server for HMAC verification
          const res = await fetch('/api/auth/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tgData }),
          });

          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            setIsLoading(false);
            return;
          }
        }

        // Fallback: check stored token/session
        const storedUser = localStorage.getItem('kimbor_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          // Default mock session for development preview
          setUser({
            id: 'demo-user-1',
            name: 'Bobur (Olmaliq Admin)',
            role: 'SUPER_ADMIN',
            cityId: 'olmaliq-city-id',
            cityName: 'Olmaliq',
          });
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const loginWithPassword = async (username: string, pass: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: pass }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem('kimbor_user', JSON.stringify(data.user));
        return true;
      }
    } catch (err) {
      console.error('Login failed:', err);
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('kimbor_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, loginWithPassword, logout }}>
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
