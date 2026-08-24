import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { wsService } from '../services/websocket';
import { ensureNotificationPermission, notifyLocal } from '../services/notifications';

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

    // Ask once for OS notification permission.
    void ensureNotificationPermission();

    // Notify the citizen when THEIR sos advances: approved -> assigned -> on the way.
    const isMySos = (sosId?: string | null): boolean => {
      if (!sosId) return false;
      try {
        const mine = JSON.parse(localStorage.getItem('resqnet_my_sos') || '[]');
        return Array.isArray(mine) && mine.some((s: any) => s.sos_id === sosId);
      } catch {
        return false;
      }
    };

    const unsubStatus = wsService.subscribe('sos.status_changed', (msg) => {
      const { sos_id: sosId, status } = msg.payload || {};
      console.log('[ResQNet][status] event received sos_id=', sosId, 'status=', status, 'isMySos=', isMySos(sosId));
      if (!isMySos(sosId)) return;
      if (status === 'VERIFIED') {
        void notifyLocal('SOS Approved', `${sosId} was verified by authorities. Help is being arranged.`);
      } else if (status === 'ASSIGNED') {
        void notifyLocal('Rescue Team Assigned', `A response team has been assigned to ${sosId}.`);
      } else if (status === 'RESPONDER_ON_WAY') {
        void notifyLocal('Rescue Team On The Way', `Responders are heading to your location for ${sosId}.`);
      }
    });

    return () => {
      unsub();
      unsubStatus();
    };
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
