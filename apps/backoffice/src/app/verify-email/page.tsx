'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Sparkles, CheckCircle2, AlertCircle, Loader2, ArrowRight, MailCheck } from 'lucide-react';
import { verifyEmail } from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!token) {
      setErrorMsg('No se proporcionó un token de verificación en el enlace.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await verifyEmail(token);
      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al verificar el correo electrónico.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      handleVerify();
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-surface-base flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[450px] w-[700px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[130px]" />

      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-6 group">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-card border border-brand-500/30 text-brand-400 shadow-glow">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white flex items-center gap-1">
            none<span className="text-brand-400 font-black">.system</span>
          </span>
        </Link>

        <div className="rounded-3xl border border-surface-border bg-surface-card/90 p-8 shadow-2xl backdrop-blur-md">
          {loading && (
            <div className="py-6 space-y-3">
              <Loader2 className="h-10 w-10 text-brand-400 animate-spin mx-auto" />
              <h3 className="text-base font-bold text-white">Validando verificación de correo...</h3>
              <p className="text-xs text-slate-400">Por favor espera un instante mientras validamos tu token.</p>
            </div>
          )}

          {success && (
            <div className="py-4 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-glowGreen">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-white">¡Correo Verificado con Éxito!</h3>
              <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                Tu dirección de correo ha sido validada. Tu cuenta ya cuenta con respaldo total de seguridad.
              </p>
              <Link
                href="/expenses"
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-teal-500 py-3 text-xs font-bold text-white shadow-glow hover:scale-[1.02] transition-all mt-4"
              >
                <span>Acceder al Panel de Comprobantes</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {errorMsg && !loading && (
            <div className="py-4 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-white">No se pudo verificar</h3>
              <p className="text-xs text-red-300 max-w-xs mx-auto leading-relaxed">{errorMsg}</p>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-elevated py-2.5 text-xs font-semibold text-slate-300 hover:text-white mt-4"
              >
                <span>Volver al Inicio de Sesión</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-base flex items-center justify-center text-slate-400">Cargando...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
