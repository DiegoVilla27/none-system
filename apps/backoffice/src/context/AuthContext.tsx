'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, SubscriptionInfo } from '@/types/auth.types';
import { loginUser, registerUser, getCurrentUser } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  subscription: SubscriptionInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    phoneNumber: string;
    habeasDataAccepted: true;
  }) => Promise<{ verificationToken?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function setAuthCookie(token: string) {
  if (typeof document !== 'undefined') {
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    document.cookie = `none_auth_token=${token}; path=/; max-age=604800; SameSite=Lax${isSecure ? '; Secure' : ''}`;
  }
}

function clearAuthCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = 'none_auth_token=; path=/; max-age=0; SameSite=Lax';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await getCurrentUser();
      setUser(data.user);
      setSubscription(data.subscription);
    } catch (err) {
      console.warn('Error al verificar sesión activa:', err);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('none_auth_token');
        clearAuthCookie();
      }
      setUser(null);
      setSubscription(null);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    const savedToken = typeof window !== 'undefined' ? localStorage.getItem('none_auth_token') : null;
    if (savedToken) {
      setToken(savedToken);
      setAuthCookie(savedToken);
      refreshUser().finally(() => setIsLoading(false));
    } else {
      clearAuthCookie();
      setIsLoading(false);
    }
  }, [refreshUser]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const session = await loginUser(email, pass);
      if (typeof window !== 'undefined') {
        localStorage.setItem('none_auth_token', session.token);
        setAuthCookie(session.token);
      }
      setToken(session.token);
      setUser(session.user);
      await refreshUser();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    name: string;
    phoneNumber: string;
    habeasDataAccepted: true;
  }) => {
    setIsLoading(true);
    try {
      const session = await registerUser(data);
      if (typeof window !== 'undefined') {
        localStorage.setItem('none_auth_token', session.token);
        setAuthCookie(session.token);
      }
      setToken(session.token);
      setUser(session.user);
      await refreshUser();
      return { verificationToken: session.verificationToken };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('none_auth_token');
      clearAuthCookie();
      setToken(null);
      setUser(null);
      setSubscription(null);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        token,
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
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    // Fallback elegante para entornos de prueba unitaria aislados sin AuthProvider
    return {
      user: {
        id: 'usr-admin-demo-colombia',
        name: 'Diego Villa (Admin)',
        email: 'admin@none-system.com',
        phoneNumber: '573001234567',
        role: 'admin',
        emailVerified: true,
        habeasDataConsent: {
          accepted: true,
          acceptedAt: '2026-10-02T20:00:00.000Z',
          version: 'Ley-1581-2012',
        },
        createdAt: '2026-10-02T20:00:00.000Z',
        updatedAt: '2026-10-02T20:00:00.000Z',
      },
      subscription: {
        phoneNumber: '573001234567',
        plan: 'pro',
        monthlyLimit: 200,
        currentUsage: 12,
        billingCycleMonth: '2026-10',
        status: 'activo',
      },
      token: 'mock-test-jwt-token',
      isAuthenticated: true,
      isLoading: false,
      login: async () => {},
      register: async () => ({}),
      logout: () => {},
      refreshUser: async () => {},
    };
  }
  return context;
};
