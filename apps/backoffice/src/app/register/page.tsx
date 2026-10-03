'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Mail, Lock, User, Phone, AlertCircle, ArrowRight, Loader2, ShieldCheck, CheckCircle2, MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PRIVACY_POLICY_URL, TERMS_URL } from '@/lib/links';
import type { PendingRegistration } from '@/types/auth.types';

export default function RegisterPage() {
  const router = useRouter();
  const { register, confirmRegistration, isAuthenticated, isLoading } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [habeasDataAccepted, setHabeasDataAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pending, setPending] = useState<PendingRegistration | null>(null);
  const [code, setCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToken, setSuccessToken] = useState<string | null>(null);

  // Guest Guard: Si el usuario ya está autenticado, redirigir al panel
  React.useEffect(() => {
    if (!isLoading && isAuthenticated && !successToken && !pending) {
      router.replace('/expenses');
    }
  }, [isLoading, isAuthenticated, router, successToken, pending]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    if (!habeasDataAccepted || !termsAccepted) {
      setErrorMsg('Debes autorizar el tratamiento de datos personales y aceptar los Términos y Condiciones.');
      return;
    }

    setLoading(true);

    try {
      const res = await register({
        name,
        email,
        phoneNumber,
        password,
        habeasDataAccepted: true,
        termsAccepted: true,
      });
      setPending(res);
      if (res.devCode) setCode(res.devCode);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear la cuenta. Por favor verifica tus datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending) return;
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await confirmRegistration(pending.verificationId, code.trim());
      if (res.devEmailVerificationToken) {
        setSuccessToken(res.devEmailVerificationToken);
      } else {
        router.push('/expenses');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'No pudimos verificar el código.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[450px] w-[700px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[130px]" />

      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-card border border-brand-500/30 text-brand-400 shadow-glow group-hover:scale-105 transition-all">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white flex items-center gap-1">
              none<span className="text-brand-400 font-black">.system</span>
              <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold text-brand-300 border border-brand-500/20">
                Registro
              </span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-white">Crea tu Cuenta Contable</h2>
          <p className="text-xs text-slate-400 mt-1">
            Gratis cada mes: 5 comprobantes con foto o PDF y 30 gastos escritos. Vincula tu WhatsApp.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-surface-border bg-surface-card/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {errorMsg && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {pending && !successToken ? (
            <form onSubmit={handleConfirm} className="space-y-5">
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-xs text-slate-300">
                <MessageCircle className="h-5 w-5 shrink-0 text-emerald-400" />
                <span>
                  Te enviamos un código de 6 dígitos por <strong className="text-white">WhatsApp</strong> al número{' '}
                  <strong className="text-white font-mono">{pending.phoneHint}</strong>. Así confirmamos que el número es tuyo
                  y nadie más puede ver tus comprobantes.
                </span>
              </div>

              {pending.devCode && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-200">
                  Modo desarrollo: el código es <strong className="font-mono">{pending.devCode}</strong>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Código de verificación
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  pattern="\d{6}"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-xl border border-surface-border bg-surface-base px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono text-white placeholder-slate-600 focus:border-brand-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-teal-500 py-3 text-sm font-bold text-white shadow-glow transition-all hover:from-brand-400 hover:to-teal-400 active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                <span>Verificar y crear mi cuenta</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPending(null);
                  setCode('');
                }}
                className="w-full text-xs text-slate-400 hover:text-white"
              >
                Corregir mis datos o pedir otro código
              </button>
            </form>
          ) : !successToken ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Nombre Completo / Razón Social
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Diego Villa"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-surface-border bg-surface-base pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      placeholder="correo@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-surface-border bg-surface-base pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    WhatsApp (+57)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="tel"
                      required
                      placeholder="300 123 4567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full rounded-xl border border-surface-border bg-surface-base pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      placeholder="8+ caracteres, letras y números"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-surface-border bg-surface-base pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Confirmar Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      placeholder="Repite la contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-surface-border bg-surface-base pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Autorización de datos (Ley 1581) y Términos: casillas separadas y sin marcar por defecto */}
              <div className="pt-2 space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={habeasDataAccepted}
                    onChange={(e) => setHabeasDataAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 bg-surface-base text-brand-500 focus:ring-brand-400 h-4 w-4"
                  />
                  <span>
                    Autorizo de manera previa, expresa e informada el tratamiento de mis datos personales y de los
                    comprobantes que cargue, conforme a la{' '}
                    <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-brand-300 underline">
                      Política de Tratamiento de Datos
                    </a>{' '}
                    (Ley 1581 de 2012), incluida su transmisión a proveedores tecnológicos fuera de Colombia (Google
                    Gemini para lectura con IA y Meta para WhatsApp).
                  </span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 bg-surface-base text-brand-500 focus:ring-brand-400 h-4 w-4"
                  />
                  <span>
                    Acepto los{' '}
                    <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="text-brand-300 underline">
                      Términos y Condiciones
                    </a>
                    .
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-teal-500 py-3 text-sm font-bold text-white shadow-glow transition-all hover:from-brand-400 hover:to-teal-400 active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Enviando código...</span>
                  </>
                ) : (
                  <>
                    <span>Continuar: verificar mi WhatsApp</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="mt-6 text-center text-xs text-slate-400">
                ¿Ya tienes una cuenta?{' '}
                <Link href="/login" className="font-semibold text-brand-400 hover:text-brand-300">
                  Inicia sesión aquí
                </Link>
              </div>
            </form>
          ) : (
            /* Registration Success with Email Verification Link */
            <div className="text-center py-4 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-glowGreen">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-white">¡Registro Exitoso!</h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                Tu cuenta fue creada y tu número de WhatsApp quedó verificado. Si ya usabas el bot, tus registros aparecerán en el panel.
              </p>

              <div className="rounded-2xl border border-surface-border bg-surface-base p-4 text-xs font-mono text-slate-300 break-all">
                <div className="text-slate-500 text-[10px] uppercase mb-1">Modo desarrollo · token de verificación de correo:</div>
                <div className="text-brand-300 font-semibold">{successToken}</div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href={`/verify-email?token=${successToken}`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-xs font-bold text-white shadow-glow hover:bg-brand-400"
                >
                  Verificar Correo Ahora
                </Link>
                <Link
                  href="/expenses"
                  className="flex items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-elevated py-2.5 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Ir al Backoffice Directamente
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
