import React from 'react';
import { Navbar } from '@/components/organisms/Navbar/Navbar';

export interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Plantilla Template DashboardLayout que estructura la cuadrícula general,
 * la barra superior fija, el resplandor de fondo ambiental y el contenedor principal.
 */
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
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
