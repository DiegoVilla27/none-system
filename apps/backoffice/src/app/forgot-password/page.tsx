'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Mail, AlertCircle, CheckCircle2, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import { requestPasswordReset } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await requestPasswordReset(email);
      setMessage(res.message);
      setDevCode(res.devCode ?? null);
      setSent(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al solicitar restablecimiento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[450px] w-[700px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[130px]" />

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-card border border-brand-500/30 text-brand-400 shadow-glow">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white flex items-center gap-1">
              none<span className="text-brand-400 font-black">.system</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-white">Recuperar Contraseña</h2>
          <p className="text-xs text-slate-400 mt-1">
            Ingresa tu correo y te enviaremos un código al WhatsApp verificado de tu cuenta.
          </p>
        </div>

        <div className="rounded-3xl border border-surface-border bg-surface-card/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {errorMsg && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!sent ? (
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
                    placeholder="correo@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-surface-border bg-surface-base pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none"
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
                    <span>Enviando código...</span>
                  </>
                ) : (
                  <>
                    <span>Enviar Código por WhatsApp</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="mt-6 text-center text-xs text-slate-400">
                <Link href="/login" className="inline-flex items-center gap-1.5 font-semibold text-brand-400 hover:text-brand-300">
                  <ArrowLeft className="h-3.5 w-3.5" /> Volver al Inicio de Sesión
                </Link>
              </div>
            </form>
          ) : (
            <div className="text-center py-4 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-glowGreen">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Revisa tu WhatsApp</h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                {message}
              </p>

              {devCode && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs font-mono text-amber-200">
                  Modo desarrollo · código: <strong>{devCode}</strong>
                </div>
              )}

              <Link
                href={`/reset-password?email=${encodeURIComponent(email)}`}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-teal-500 py-3 text-xs font-bold text-white shadow-glow hover:scale-[1.02] transition-all"
              >
                <span>Ingresar el Código</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
