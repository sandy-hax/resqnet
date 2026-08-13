import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api, setAuthToken } from '@/lib/api';
import type { LoginResponse } from '@/types';

interface AuthContextType {
  token: string | null;
  user: LoginResponse | null;
  isAuthenticated: boolean;
  login: (session: LoginResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'raksha_authority_session';

function loadStored(): LoginResponse | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LoginResponse) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoginResponse | null>(() => loadStored());
  const token = user?.access_token ?? null;

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  // Register a single 401 handler for the app lifetime so expired/invalid
  // authority tokens bounce the user back to the login screen.
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (res) => res,
      (error) => {
        if (error?.response?.status === 401) {
          localStorage.removeItem(STORAGE_KEY);
          setUser(null);
        }
        return Promise.reject(error);
      },
    );
    return () => api.interceptors.response.eject(interceptor);
  }, []);

  function login(session: LoginResponse) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setUser(session);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated: Boolean(token), login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
