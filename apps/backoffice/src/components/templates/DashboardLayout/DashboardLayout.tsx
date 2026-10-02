'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Navbar } from '@/components/organisms/Navbar/Navbar';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, Loader2, Lock } from 'lucide-react';

export interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Plantilla Template DashboardLayout:
 * 1. Estructura la cuadrícula general y Navbar del backoffice.
 * 2. AuthGuard Client-Side: Verifica el estado de autenticación y bloquea el acceso si no hay sesión activa.
 */
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const redirectUrl = pathname && pathname !== '/' ? `/login?from=${encodeURIComponent(pathname)}` : '/login';
      router.replace(redirectUrl);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  // Pantalla de carga mientras se verifica el token JWT y permisos
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-base text-slate-100 flex flex-col items-center justify-center relative p-4">
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-brand-500/15 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-surface-card border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-glow">
              <ShieldCheck className="w-7 h-7 text-brand-400 animate-pulse" />
            </div>
            <Loader2 className="w-6 h-6 animate-spin text-brand-300 absolute -bottom-1 -right-1" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Verificando sesión segura</h3>
            <p className="text-xs text-slate-400 mt-1">Comprobando permisos y encriptación bancaria...</p>
          </div>
        </div>
      </div>
    );
  }

  // Si no está autenticado y terminó de cargar, bloquear render para evitar cualquier flash de datos privados
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-surface-base text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">Acceso Restringido</h3>
          <p className="text-xs text-slate-400">Redirigiendo a inicio de sesión seguro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-base text-slate-100 flex flex-col relative selection:bg-brand-500/30 selection:text-brand-200">
      {/* Resplandor superior ambiental sutil (Azul eléctrico suave no invasivo) */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-brand-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Barra de navegación superior */}
      <Navbar />

      {/* Contenedor de contenido de página */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Pie de página minimalista */}
      <footer className="w-full border-t border-surface-border py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            © {new Date().getFullYear()} <strong>none-system</strong> · Control Contable & Financiero IA
          </span>
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
            <span>Optimizado para Colombia</span>
            <span className="w-1 h-1 rounded-full bg-brand-400" />
            <span>Moneda: COP ($)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
