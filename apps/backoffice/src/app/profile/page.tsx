'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/templates/DashboardLayout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { changePassword } from '@/lib/api';
import {
  User,
  ShieldCheck,
  Lock,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Sparkles,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, subscription, refreshUser } = useAuth();

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
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        Pendiente
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 flex items-center gap-1.5 mb-1">
                    <Phone className="h-3.5 w-3.5 text-emerald-400" /> WhatsApp Vinculado
                  </div>
                  <div className="text-sm font-semibold text-emerald-300 font-mono">
                    +{user?.phoneNumber || '573001234567'}
                  </div>
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
                    {subscription?.plan || 'Plan Gratuito'}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Consumo Mensual:</span>
                    <span className="font-semibold text-brand-300">
                      {subscription?.currentUsage || 0} / {subscription?.monthlyLimit || 10} comprobantes
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface-base overflow-hidden border border-surface-border">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 to-teal-400"
                      style={{
                        width: `${Math.min(
                          100,
                          (((subscription?.currentUsage || 0) / (subscription?.monthlyLimit || 10)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-brand-500/20 bg-brand-950/20 p-3 text-[11px] text-slate-300">
                  <div className="font-semibold text-brand-300 flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Habeas Data (Ley 1581 de 2012)
                  </div>
                  <div>Consentimiento aceptado: {user?.habeasDataConsent?.version || 'Ley-1581-2012'}.</div>
                  <div className="text-slate-400 mt-0.5">Almacenamiento fiscal con cifrado bancario AES-256.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="rounded-2xl border border-surface-border bg-surface-card p-6 sm:p-8">
          <div className="pb-4 border-b border-surface-border mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-brand-400" /> Cambiar Contraseña
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Actualiza tu clave de acceso. Se cifrará inmediatamente con algoritmo seguro en el servidor.
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
                  placeholder="Mínimo 8 caracteres"
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
      </div>
    </DashboardLayout>
  );
}
