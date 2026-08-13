import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { wsService } from '../services/websocket';

export interface UserProfile {
  user_id: string;
  name: string;
  phone: string;
  email?: string;
  role: 'REQUESTER' | 'DISASTER_MGMT_TEAM' | 'AUTHORITY';
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isWsConnected: boolean;
  login: (phone: string) => Promise<void>;
  register: (data: { name: string; phone: string; email?: string }) => Promise<void>;
  logout: () => void;
  guestPhone: string;
  guestName: string;
  setGuestDetails: (name: string, phone: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const storedUser = localStorage.getItem('resqnet_user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [guestName, setGuestName] = useState<string>(() => localStorage.getItem('resqnet_guest_name') || '');
  const [guestPhone, setGuestPhone] = useState<string>(() => localStorage.getItem('resqnet_guest_phone') || '');
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);

  useEffect(() => {
    // Listen for WebSocket connection updates
    const unsub = wsService.subscribe('connection.status', (msg) => {
      setIsWsConnected(msg.payload.connected);
    });
    return unsub;
  }, []);

  const login = async (phone: string) => {
    const res = await apiService.login({ phone });
    setUser(res.user);
  };

  const register = async (data: { name: string; phone: string; email?: string }) => {
    const res = await apiService.register(data);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('resqnet_token');
    localStorage.removeItem('resqnet_user');
    setUser(null);
  };

  const setGuestDetails = (name: string, phone: string) => {
    setGuestName(name);
    setGuestPhone(phone);
    localStorage.setItem('resqnet_guest_name', name);
    localStorage.setItem('resqnet_guest_phone', phone);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isWsConnected,
        login,
        register,
        logout,
        guestName,
        guestPhone,
        setGuestDetails,
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
