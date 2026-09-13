'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  authApi,
  UserProfile,
  LoginDto,
  RegisterDto,
} from '@/infrastructure/api/auth.api';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await authApi.getMe();
      setUser(profile);
    } catch {
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('finanzia_token');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (dto: LoginDto) => {
    const res = await authApi.login(dto);
    if (res.token && typeof window !== 'undefined') {
      localStorage.setItem('finanzia_token', res.token);
    }
    setUser(res.user);
  };

  const register = async (dto: RegisterDto) => {
    const res = await authApi.register(dto);
    if (res.token && typeof window !== 'undefined') {
      localStorage.setItem('finanzia_token', res.token);
    }
    setUser(res.user);
  };

  const logout = async () => {
    await authApi.logout();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('finanzia_token');
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider');
  }
  return context;
}
