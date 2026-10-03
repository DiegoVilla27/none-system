'use client';

import React from 'react';
import Link from 'next/link';
import { X, ShieldCheck, ArrowRight, UserPlus, LogIn, Info } from 'lucide-react';
import { PRICING_PLANS, SubscriptionPlanId } from '@/lib/plans';
import { formatCOP } from '@/lib/utils';
import { BACKOFFICE_URL } from '@/lib/contact';

interface PaymentModalProps {
  planId: SubscriptionPlanId | null;
  onClose: () => void;
}

/**
 * Inicio de la compra de un plan. La activación se hace desde el panel web con la
 * cuenta del usuario (número de WhatsApp verificado). Esta página nunca solicita
 * ni procesa datos de tarjetas: el cobro lo hará una pasarela de pagos certificada.
 */
export const PaymentModal: React.FC<PaymentModalProps> = ({ planId, onClose }) => {
  if (!planId) return null;

  const plan = PRICING_PLANS.find((p) => p.id === planId) || PRICING_PLANS[1];
  const billingPath = `/billing?plan=${encodeURIComponent(plan.id)}`;
  const loginUrl = `${BACKOFFICE_URL}/login?from=${encodeURIComponent(billingPath)}`;
  const registerUrl = `${BACKOFFICE_URL}/register`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-surface-border bg-surface-card p-6 sm:p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-2 text-slate-400 hover:bg-surface-elevated hover:text-white transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400 mb-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Activación segura desde tu cuenta
          </div>
          <h3 id="checkout-title" className="text-2xl font-black text-white">
            {plan.name}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            <strong className="text-emerald-400">{formatCOP(plan.priceCOP)} COP / mes</strong> · {plan.monthlyLimit}{' '}
            comprobantes con imagen al mes · sin permanencia ni renovación automática.
          </p>
        </div>

        <div className="rounded-2xl border border-surface-border bg-surface-base p-4 text-xs text-slate-300 leading-relaxed mb-6 flex gap-3">
          <Info className="h-4 w-4 shrink-0 text-brand-400 mt-0.5" />
          <span>
            Para proteger tus comprobantes, el plan se activa desde tu cuenta en el panel web, donde verificamos con un código
            que el número de WhatsApp es tuyo. Si ya usas el bot, regístrate con ese mismo número y conservarás tus registros.
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href={registerUrl}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-teal-500 py-3.5 text-sm font-bold text-white shadow-glow transition-all hover:from-brand-400 hover:to-teal-400"
          >
            <UserPlus className="h-4 w-4" />
            <span>Crear mi cuenta</span>
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href={loginUrl}
            className="flex items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-elevated py-3 text-xs font-semibold text-slate-200 hover:text-white hover:border-brand-500 transition-colors"
          >
            <LogIn className="h-4 w-4" />
            <span>Ya tengo cuenta: activar el plan</span>
          </a>
        </div>

        <p className="mt-5 text-[11px] text-slate-500 text-center">
          El pago se procesa en Wompi (Bancolombia); None System nunca ve los datos de tu tarjeta. Al continuar aceptas los{' '}
          <Link href="/terminos" className="underline hover:text-slate-300">
            Términos y Condiciones
          </Link>{' '}
          y la{' '}
          <Link href="/privacidad" className="underline hover:text-slate-300">
            Política de Tratamiento de Datos
          </Link>
          .
        </p>
      </div>
    </div>
  );
};
