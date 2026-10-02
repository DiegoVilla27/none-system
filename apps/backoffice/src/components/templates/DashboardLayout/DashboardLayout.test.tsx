import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardLayout } from './DashboardLayout';
import * as AuthContextModule from '@/context/AuthContext';

const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
  usePathname: () => '/expenses',
}));

describe('DashboardLayout AuthGuard (Control de Acceso y Protección de Rutas)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el loader de seguridad bancaria mientras se verifica la sesión', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      subscription: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(
      <DashboardLayout>
        <div>Contenido Privado Confidencial</div>
      </DashboardLayout>
    );

    expect(screen.getByText('Verificando sesión segura')).toBeInTheDocument();
    expect(screen.queryByText('Contenido Privado Confidencial')).not.toBeInTheDocument();
  });

  it('bloquea el render y redirige a /login cuando el usuario NO está autenticado', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      subscription: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(
      <DashboardLayout>
        <div>Contenido Privado Confidencial</div>
      </DashboardLayout>
    );

    expect(screen.getByText('Acceso Restringido')).toBeInTheDocument();
    expect(screen.queryByText('Contenido Privado Confidencial')).not.toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith('/login?from=%2Fexpenses');
  });

  it('permite el acceso y renderiza los componentes hijos cuando el usuario está autenticado', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 'usr-123',
        name: 'Carlos Contador',
        email: 'carlos@empresa.com',
        phoneNumber: '573001234567',
        role: 'user',
        emailVerified: true,
        habeasDataConsent: {
          accepted: true,
          acceptedAt: new Date().toISOString(),
          version: 'Ley-1581-2012',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      subscription: {
        phoneNumber: '573001234567',
        plan: 'pro',
        monthlyLimit: 200,
        currentUsage: 5,
        billingCycleMonth: '2026-10',
        status: 'activo',
      },
      token: 'valid-jwt-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(
      <DashboardLayout>
        <div>Contenido Privado Confidencial</div>
      </DashboardLayout>
    );

    expect(screen.getByText('Contenido Privado Confidencial')).toBeInTheDocument();
    expect(screen.queryByText('Acceso Restringido')).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
