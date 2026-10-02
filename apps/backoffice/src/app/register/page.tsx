'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Mail, Lock, User, Phone, AlertCircle, ArrowRight, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [habeasDataAccepted, setHabeasDataAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToken, setSuccessToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    if (!habeasDataAccepted) {
      setErrorMsg('Debes aceptar la autorización de tratamiento de datos según la Ley 1581 de 2012.');
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
      });

      if (res.verificationToken) {
        setSuccessToken(res.verificationToken);
      } else {
        router.push('/expenses');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear la cuenta. Por favor verifica tus datos.');
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
            Empieza con 10 comprobantes gratis y vincula tu número de WhatsApp.
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

          {!successToken ? (
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
                      placeholder="Mínimo 8 caracteres"
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

              {/* Habeas Data Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={habeasDataAccepted}
                    onChange={(e) => setHabeasDataAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 bg-surface-base text-brand-500 focus:ring-brand-400 h-4 w-4"
                  />
                  <span>
                    Autorizo el tratamiento de mis datos personales conforme a la{' '}
                    <strong className="text-white">Ley 1581 de 2012 (Habeas Data de Colombia)</strong> y
                    acepto que mi información tributaria se almacene cifrada con estándar AES-256.
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
                    <span>Creando cuenta segura...</span>
                  </>
                ) : (
                  <>
                    <span>Registrarme y Comenzar Gratis</span>
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
                Tu cuenta ha sido creada y se ha vinculado a tu número de WhatsApp. Para mayor seguridad, verifica tu correo.
              </p>

              <div className="rounded-2xl border border-surface-border bg-surface-base p-4 text-xs font-mono text-slate-300 break-all">
                <div className="text-slate-500 text-[10px] uppercase mb-1">Token de Verificación Generado:</div>
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
