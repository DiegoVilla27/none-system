'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sparkles, Scan, LayoutDashboard, ReceiptText, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/atoms/Button/Button';

import { useAuth } from '@/context/AuthContext';
import { User, LogOut } from 'lucide-react';

export interface NavbarProps {
  className?: string;
}

/**
 * Componente organismo Navbar con estética minimalista, fondo translúcido y enlaces principales.
 */
export const Navbar: React.FC<NavbarProps> = ({ className }) => {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();

  const navLinks = [
    { label: 'Dashboard', href: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Escanear', href: '/scan', icon: <Scan className="w-4 h-4" /> },
    { label: 'Historial de Gastos', href: '/expenses', icon: <ReceiptText className="w-4 h-4" /> },
    { label: 'Seguridad / Perfil', href: '/profile', icon: <User className="w-4 h-4" /> },
  ];

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b border-surface-border bg-surface-base/80 backdrop-blur-md',
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo de la marca */}
        <Link href="/" className="flex items-center gap-2.5 group select-none">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-teal-500/30 border border-brand-500/40 flex items-center justify-center text-brand-400 group-hover:shadow-glow transition-all">
            <Sparkles className="w-5 h-5 text-brand-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-slate-100 flex items-center gap-1.5">
              none<span className="text-brand-400 font-mono font-medium">system</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest -mt-1">
              Control Contable IA
            </span>
          </div>
        </Link>

        {/* Enlaces de Navegación */}
        <nav className="hidden md:flex items-center gap-1 bg-surface-card/60 p-1 rounded-xl border border-surface-border">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all select-none',
                  isActive
                    ? 'bg-surface-elevated text-brand-300 border border-surface-border shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated/50'
                )}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Acciones derecha */}
        <div className="flex items-center gap-3">
          {/* Indicador de Moneda Colombia */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-card border border-surface-border text-xs text-slate-300 font-mono">
            <span>🇨🇴</span>
            <span className="font-semibold text-brand-300">COP</span>
          </div>

          {/* Botón rápido de Escaneo */}
          <Link href="/scan">
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Scan className="w-3.5 h-3.5" />}
            >
              Nuevo Escaneo
            </Button>
          </Link>

          {/* Auth State Button */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2 pl-2 border-l border-surface-border">
              <Link
                href="/profile"
                className="hidden lg:flex flex-col text-right hover:opacity-80 transition-opacity"
              >
                <span className="text-xs font-semibold text-white leading-tight truncate max-w-[120px]">
                  {user?.name || 'Usuario'}
                </span>
                <span className="text-[10px] text-brand-400 uppercase tracking-wider">
                  {user?.role || 'Admin'}
                </span>
              </Link>
              <button
                onClick={logout}
                title="Cerrar Sesión"
                className="p-2 rounded-lg border border-surface-border bg-surface-card text-slate-400 hover:text-red-400 hover:border-red-500/40 transition-colors"
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-surface-border bg-surface-card"
            >
              Iniciar Sesión
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
