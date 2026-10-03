'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/templates/DashboardLayout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import {
  changePassword,
  sendPhoneVerificationCode,
  confirmPhoneVerification,
  deleteAccount,
  getExpenses,
  resendEmailVerification,
  logoutEverywhere,
} from '@/lib/api';
import { PRIVACY_POLICY_URL } from '@/lib/links';
import {
  User,
  ShieldCheck,
  Lock,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Download,
} from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, subscription, refreshUser, logout } = useAuth();

  // Verificación de número (cuentas creadas antes de la verificación obligatoria)
  const [phoneCodeSent, setPhoneCodeSent] = useState<{ phoneHint: string; devCode?: string } | null>(null);
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState<string | null>(null);

  // Eliminación de cuenta (derecho de supresión, Ley 1581)
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSendPhoneCode = async () => {
    setPhoneMsg(null);
    setPhoneLoading(true);
    try {
      const res = await sendPhoneVerificationCode();
      setPhoneCodeSent(res);
      if (res.devCode) setPhoneCode(res.devCode);
    } catch (err: any) {
      setPhoneMsg(err.message);
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleConfirmPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneMsg(null);
    setPhoneLoading(true);
    try {
      await confirmPhoneVerification(phoneCode.trim());
      await refreshUser();
      setPhoneCodeSent(null);
      setPhoneMsg('¡Número verificado!');
    } catch (err: any) {
      setPhoneMsg(err.message);
    } finally {
      setPhoneLoading(false);
    }
  };

  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const handleResendEmail = async () => {
    setEmailMsg(null);
    try {
      const res = await resendEmailVerification();
      setEmailMsg(
        res.devEmailVerificationToken
          ? `Modo desarrollo: abre /verify-email?token=${res.devEmailVerificationToken}`
          : res.message
      );
    } catch (err: any) {
      setEmailMsg(err.message);
    }
  };

  const [closingSessions, setClosingSessions] = useState(false);
  const handleLogoutEverywhere = async () => {
    setClosingSessions(true);
    try {
      await logoutEverywhere();
    } finally {
      window.location.href = '/login';
    }
  };

  // Derecho de acceso: descarga gratuita de todos los datos personales (independiente del plan)
  const [exporting, setExporting] = useState(false);
  const handleDownloadData = async () => {
    setExporting(true);
    try {
      const expenses = await getExpenses();
      const payload = {
        generadoEl: new Date().toISOString(),
        usuario: user,
        suscripcion: subscription,
        gastos: expenses,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mis-datos-none-system-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      await deleteAccount(deletePassword);
      logout();
    } catch (err: any) {
      setDeleteError(err.message || 'No pudimos eliminar la cuenta.');
      setDeleteLoading(false);
    }
  };

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      const res = await changePassword(currentPassword, newPassword);
      setSuccessMsg(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <User className="h-6 w-6 text-brand-400" />
            Perfil y Configuración de Seguridad
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Administra tus credenciales, estado de suscripción y datos protegidos bajo la Ley 1581 de 2012.
          </p>
        </div>

        {/* User Profile & Subscription Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Identity Card */}
          <div className="rounded-2xl border border-surface-border bg-surface-card p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-surface-border">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Datos de Usuario
                </span>
                <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-brand-300 border border-brand-500/20 uppercase">
                  {user?.role || 'Usuario'}
                </span>
              </div>

              <div className="space-y-4 pt-4 text-xs">
                <div>
                  <div className="text-slate-400 flex items-center gap-1.5 mb-1">
                    <User className="h-3.5 w-3.5 text-brand-400" /> Nombre Completo
                  </div>
                  <div className="text-sm font-semibold text-white">{user?.name || 'Usuario'}</div>
                </div>

                <div>
                  <div className="text-slate-400 flex items-center gap-1.5 mb-1">
                    <Mail className="h-3.5 w-3.5 text-brand-400" /> Correo Electrónico
                  </div>
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>{user?.email || 'N/A'}</span>
                    {user?.emailVerified ? (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" /> Verificado
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendEmail}
                        className="text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 hover:bg-amber-500/20"
                      >
                        Pendiente · reenviar enlace
                      </button>
                    )}
                  </div>
                  {emailMsg && <p className="mt-1 text-[11px] text-slate-300 break-all">{emailMsg}</p>}
                </div>

                <div>
                  <div className="text-slate-400 flex items-center gap-1.5 mb-1">
                    <Phone className="h-3.5 w-3.5 text-emerald-400" /> WhatsApp Vinculado
                  </div>
                  <div className="text-sm font-semibold text-emerald-300 font-mono flex items-center gap-2">
                    <span>+{user?.phoneNumber}</span>
                    {user?.phoneVerified ? (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400 border border-emerald-500/20 font-sans">
                        <CheckCircle2 className="h-3 w-3" /> Verificado
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-sans">
                        Sin verificar
                      </span>
                    )}
                  </div>
                  {user && !user.phoneVerified && (
                    <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                      <p className="text-[11px] text-amber-100">
                        Verifica tu número para usar tu cupo, el bot de WhatsApp y los planes. Te enviaremos un código por WhatsApp.
                      </p>
                      {!phoneCodeSent ? (
                        <button
                          type="button"
                          onClick={handleSendPhoneCode}
                          disabled={phoneLoading}
                          className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-[11px] font-semibold text-amber-100 hover:bg-amber-500/30 disabled:opacity-50"
                        >
                          {phoneLoading ? 'Enviando...' : 'Enviar código'}
                        </button>
                      ) : (
                        <form onSubmit={handleConfirmPhone} className="flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            placeholder="123456"
                            value={phoneCode}
                            onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ''))}
                            className="w-28 rounded-lg border border-surface-border bg-surface-base px-2 py-1.5 text-center font-mono text-sm text-white"
                          />
                          <button
                            type="submit"
                            disabled={phoneLoading || phoneCode.length !== 6}
                            className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-50"
                          >
                            Verificar
                          </button>
                        </form>
                      )}
                      {phoneCodeSent?.devCode && (
                        <p className="text-[10px] text-amber-200 font-mono">Modo desarrollo · código: {phoneCodeSent.devCode}</p>
                      )}
                    </div>
                  )}
                  {phoneMsg && <p className="mt-2 text-[11px] text-slate-300">{phoneMsg}</p>}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-surface-border text-[11px] text-slate-500">
              Registrado el:{' '}
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es-CO') : 'Reciente'}
            </div>
          </div>

          {/* Subscription & Habeas Data Card */}
          <div className="rounded-2xl border border-surface-border bg-surface-card p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-surface-border">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Suscripción & Cupo
                </span>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20 uppercase">
                  {subscription?.status || 'Activo'}
                </span>
              </div>

              <div className="space-y-4 pt-4 text-xs">
                <div>
                  <div className="text-slate-400">Plan Actual:</div>
                  <div className="text-lg font-black text-white capitalize">
                    {subscription?.plan || 'Sin plan (verifica tu número)'}
                  </div>
                  <Link href="/billing" className="text-[11px] text-brand-300 underline">
                    Ver planes
                  </Link>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Comprobantes con foto o PDF:</span>
                    <span className="font-semibold text-brand-300">
                      {subscription?.currentUsage || 0} / {subscription?.monthlyLimit || 5}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface-base overflow-hidden border border-surface-border">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 to-teal-400"
                      style={{
                        width: `${Math.min(
                          100,
                          (((subscription?.currentUsage || 0) / (subscription?.monthlyLimit || 5)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-slate-400 mt-2">
                    <span>Gastos escritos:</span>
                    <span className="font-semibold text-amber-300">
                      {subscription?.manualUsage ?? 0}
                      {subscription?.manualMonthlyLimit == null ? ' (ilimitados)' : ` / ${subscription.manualMonthlyLimit}`}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-brand-500/20 bg-brand-950/20 p-3 text-[11px] text-slate-300">
                  <div className="font-semibold text-brand-300 flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Habeas Data (Ley 1581 de 2012)
                  </div>
                  <div>
                    Autorización otorgada
                    {user?.habeasDataConsent?.acceptedAt
                      ? ` el ${new Date(user.habeasDataConsent.acceptedAt).toLocaleDateString('es-CO')}`
                      : ''}
                    {user?.habeasDataConsent?.channel ? ` vía ${user.habeasDataConsent.channel === 'web' ? 'web' : 'WhatsApp'}` : ''}.
                  </div>
                  <div className="text-slate-400 mt-0.5">Tus soportes (imágenes y PDF) se guardan cifrados con AES-256-GCM.</div>
                  <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-brand-300 underline">
                    Política de tratamiento de datos
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="rounded-2xl border border-surface-border bg-surface-card p-6 sm:p-8">
          <div className="pb-4 border-b border-surface-border mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-brand-400" /> Contraseña y sesiones
              </h3>
              <button
                type="button"
                onClick={handleLogoutEverywhere}
                disabled={closingSessions}
                className="rounded-lg border border-surface-border px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:text-white hover:border-red-500/40 disabled:opacity-50"
              >
                Cerrar sesión en todos los dispositivos
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Actualiza tu clave de acceso (se guarda con hash bcrypt). Al cambiarla cerramos tus sesiones en otros dispositivos.
            </p>
          </div>

          {successMsg && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Contraseña Actual
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface-base px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="8+ caracteres, letras y números"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-surface-border bg-surface-base px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Confirmar Nueva
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Repite la nueva clave"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-surface-border bg-surface-base px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-teal-500 px-6 py-2.5 text-xs font-bold text-white shadow-glow hover:from-brand-400 hover:to-teal-400 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Actualizando...</span>
                </>
              ) : (
                <span>Guardar Nueva Contraseña</span>
              )}
            </button>
          </form>
        </div>

        {/* Derechos del titular (Ley 1581 de 2012) */}
        <div className="rounded-2xl border border-red-500/20 bg-surface-card p-6 sm:p-8">
          <div className="pb-4 border-b border-surface-border mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brand-400" /> Tus datos y derechos
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Puedes conocer, actualizar, rectificar y suprimir tus datos, y revocar la autorización en cualquier momento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300">
            <div className="space-y-2">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <Download className="h-4 w-4 text-brand-400" /> Descargar tus datos
              </div>
              <p className="text-slate-400">
                Descarga gratis una copia de tu perfil, tu plan y todos tus gastos (formato JSON). Las imágenes se pueden
                abrir desde el detalle de cada gasto en el{' '}
                <Link href="/expenses" className="underline text-brand-300">Historial</Link>.
              </p>
              <button
                type="button"
                onClick={handleDownloadData}
                disabled={exporting}
                className="flex items-center gap-2 rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-2 text-xs font-semibold text-brand-200 hover:bg-brand-500/20 disabled:opacity-50"
              >
                {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Descargar mis datos
              </button>
            </div>

            <form onSubmit={handleDeleteAccount} className="space-y-3">
              <div className="font-semibold text-red-300 flex items-center gap-1.5">
                <Trash2 className="h-4 w-4" /> Eliminar mi cuenta
              </div>
              <p className="text-slate-400">
                Se borrarán de forma permanente tus comprobantes, imágenes, gastos y tu plan. No se puede deshacer.
              </p>
              {deleteError && <p className="text-red-300">{deleteError}</p>}
              <input
                type="password"
                required
                placeholder="Tu contraseña"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface-base px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-red-400 focus:outline-none"
              />
              <input
                type="text"
                required
                placeholder='Escribe "ELIMINAR" para confirmar'
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface-base px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-red-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={deleteLoading || deleteConfirmText.trim().toUpperCase() !== 'ELIMINAR' || !deletePassword}
                className="flex items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-2.5 text-xs font-bold text-red-200 hover:bg-red-500/20 disabled:opacity-40"
              >
                {deleteLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>Eliminar definitivamente</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
