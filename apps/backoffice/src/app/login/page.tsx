'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, Mail, Lock, AlertCircle, ArrowRight, Loader2, ShieldCheck, KeyRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Solo rutas internas: evita redirecciones abiertas hacia sitios externos
  const rawFrom = searchParams?.get('from') || '';
  const from = rawFrom.startsWith('/') && !rawFrom.startsWith('//') && !rawFrom.includes('\\') ? rawFrom : '/expenses';
  const { login, isAuthenticated, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Guest Guard: Si el usuario ya está autenticado, no debe ver la pantalla de login
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(from);
    }
  }, [isLoading, isAuthenticated, router, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      await login(email, password);
      router.push(from);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('admin@none-system.com');
    setPassword('Admin123*');
  };

  return (
    <div className="w-full max-w-md">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-3 group">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-card border border-brand-500/30 text-brand-400 shadow-glow group-hover:scale-105 transition-all">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white flex items-center gap-1">
            none<span className="text-brand-400 font-black">.system</span>
            <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold text-brand-300 border border-brand-500/20">
              Backoffice
            </span>
          </span>
        </Link>
        <h2 className="text-xl font-bold text-white">Ingreso al Panel Contable</h2>
        <p className="text-xs text-slate-400 mt-1">
          Gestiona tus comprobantes, conciliación DIAN y exportaciones a Excel.
        </p>
      </div>

      {/* Login Card */}
      <div className="rounded-3xl border border-surface-border bg-surface-card/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {errorMsg && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                placeholder="contador@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface-base pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Contraseña
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface-base pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-teal-500 py-3 text-sm font-bold text-white shadow-glow transition-all hover:from-brand-400 hover:to-teal-400 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verificando credenciales...</span>
              </>
            ) : (
              <>
                <span>Entrar al Backoffice</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Botón de demo: solo en desarrollo (nunca publicar credenciales de administrador) */}
        {process.env.NODE_ENV !== 'production' && (
        <div className="mt-6 pt-5 border-t border-surface-border">
          <button
            type="button"
            onClick={handleFillDemo}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand-500/40 bg-brand-500/5 py-2 text-xs font-medium text-brand-300 hover:bg-brand-500/10 transition-colors"
          >
            <KeyRound className="h-3.5 w-3.5 text-brand-400" />
            <span>Autocompletar con usuario Demo (solo desarrollo)</span>
          </button>
        </div>
        )}

        {/* Register Link */}
        <div className="mt-6 text-center text-xs text-slate-400">
          ¿No tienes cuenta aún?{' '}
          <Link href="/register" className="font-semibold text-brand-400 hover:text-brand-300">
            Regístrate gratis
          </Link>
        </div>
      </div>

      {/* Habeas Data & Security Note */}
      <div className="mt-6 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-brand-400" />
        <span>Protección de datos bajo la Ley 1581 de 2012 y cifrado AES-256.</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-surface-base flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[450px] w-[700px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[130px]" />

      <Suspense fallback={<div className="text-sm text-slate-400">Cargando formulario...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
