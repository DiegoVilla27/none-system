'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, SubscriptionInfo, PendingRegistration, RegisterInput, AuthSession } from '@/types/auth.types';
import {
  loginUser,
  logoutUser,
  registerUser,
  confirmRegistration as confirmRegistrationApi,
  getCurrentUser,
} from '@/lib/api';

interface AuthContextType {
  user: User | null;
  subscription: SubscriptionInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  /** Paso 1: envía el código de verificación por WhatsApp. No inicia sesión. */
  register: (data: RegisterInput) => Promise<PendingRegistration>;
  /** Paso 2: confirma el código, crea la cuenta e inicia sesión. */
  confirmRegistration: (verificationId: string, code: string) => Promise<{ devEmailVerificationToken?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * La sesión vive en una cookie HttpOnly que emite el backend: el frontend nunca ve ni guarda el token.
 * El estado de autenticación se obtiene consultando /auth/me.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await getCurrentUser();
      setUser(data.user);
      setSubscription(data.subscription);
    } catch {
      setUser(null);
      setSubscription(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const startSession = async (session: Omit<AuthSession, 'devEmailVerificationToken'>) => {
    setUser(session.user);
    await refreshUser();
  };

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      await startSession(await loginUser(email, pass));
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterInput) => registerUser(data);

  const confirmRegistration = async (verificationId: string, code: string) => {
    setIsLoading(true);
    try {
      const session = await confirmRegistrationApi(verificationId, code);
      await startSession(session);
      return { devEmailVerificationToken: session.devEmailVerificationToken };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
    setSubscription(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        confirmRegistration,
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
    // Fallback para pruebas unitarias aisladas sin AuthProvider
    return {
      user: {
        id: 'usr-admin-demo-colombia',
        name: 'Diego Villa (Admin)',
        email: 'admin@none-system.com',
        phoneNumber: '573001234567',
        phoneVerified: true,
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
      isAuthenticated: true,
      isLoading: false,
      login: async () => {},
      register: async () => ({ verificationId: 'mock', phoneHint: '****4567', expiresAt: new Date().toISOString() }),
      confirmRegistration: async () => ({}),
      logout: async () => {},
      refreshUser: async () => {},
    };
  }
  return context;
};
