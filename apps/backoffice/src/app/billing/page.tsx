'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/templates/DashboardLayout/DashboardLayout';
import { Heading, Text } from '@/components/atoms/Typography/Typography';
import { Button } from '@/components/atoms/Button/Button';
import { useAuth } from '@/context/AuthContext';
import { checkoutPlan, getPlans, PlanOption } from '@/lib/api';
import { formatCOP, cn } from '@/lib/utils';
import { TERMS_URL } from '@/lib/links';
import { CreditCard, CheckCircle2, AlertCircle, FlaskConical, Info, ShieldCheck } from 'lucide-react';
import type { PaymentMode } from '@/lib/api';

type PaidPlan = Exclude<PlanOption['id'], 'gratuito'>;

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Bogota' });
}

function BillingContent() {
  const searchParams = useSearchParams();
  const highlighted = searchParams.get('plan');
  const { user, subscription, refreshUser } = useAuth();

  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [mode, setMode] = useState<PaymentMode>('disabled');
  const simulated = mode === 'simulated';
  const enabled = mode !== 'disabled';
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlans()
      .then((data) => {
        setPlans(data.plans);
        setMode(data.paymentMode);
      })
      .catch((err) => setError(err.message));
  }, []);

  const handleActivate = async (planId: PaidPlan) => {
    setError(null);
    setMessage(null);
    setLoadingPlan(planId);
    try {
      const res = await checkoutPlan(planId);
      if (res.mode === 'wompi') {
        // Pago en la pasarela segura de Wompi (PSE, tarjetas, Nequi, Bancolombia)
        window.location.href = res.checkoutUrl;
        return;
      }
      await refreshUser();
      setMessage(`Plan activado en modo de prueba (referencia ${res.reference}). No se realizó ningún cobro.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos activar el plan.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="border-b border-surface-border pb-6">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="w-4 h-4 text-brand-400" />
          <Text variant="small" className="text-brand-300 font-mono tracking-wider uppercase font-semibold">
            Planes y cupo
          </Text>
        </div>
        <Heading level={1}>Tu Plan</Heading>
        {subscription ? (
          <Text variant="body" className="text-slate-400 mt-1">
            Usaste {subscription.currentUsage} de {subscription.monthlyLimit} comprobantes con imagen y{' '}
            {subscription.manualMonthlyLimit === null || subscription.manualMonthlyLimit === undefined
              ? `${subscription.manualUsage ?? 0} gastos escritos (ilimitados).`
              : `${subscription.manualUsage ?? 0} de ${subscription.manualMonthlyLimit} gastos escritos.`}{' '}
            {subscription.plan === 'gratuito'
              ? `Tu cupo gratuito se renueva el ${formatDate(subscription.currentPeriodEnd)}.`
              : `Tu plan está activo hasta el ${formatDate(subscription.currentPeriodEnd)}; si no lo renuevas vuelves al Plan Gratuito.`}{' '}
          </Text>
        ) : null}
      </div>

      {simulated && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-100">
          <FlaskConical className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
          <span>
            <strong>Modo de prueba:</strong> la pasarela de pagos aún no está conectada. Activar un plan aquí no realiza ningún cobro
            ni solicita datos de tarjeta.
          </span>
        </div>
      )}

      {mode === 'wompi' && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-100">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-300" />
          <span>
            Pagas en la pasarela segura de <strong>Wompi</strong> (Bancolombia) con PSE, tarjeta, Nequi o Botón Bancolombia.
            None System nunca ve ni guarda los datos de tu tarjeta.
          </span>
        </div>
      )}

      {!enabled && (
        <div className="flex items-start gap-3 rounded-xl border border-brand-500/30 bg-brand-500/10 p-4 text-xs text-slate-200">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-brand-300" />
          <span>Los pagos en línea estarán disponibles muy pronto. Mientras tanto, escríbenos por WhatsApp para activar tu plan.</span>
        </div>
      )}

      {user && !user.phoneVerified && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-xs text-red-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Antes de activar un plan debes{' '}
            <Link href="/profile" className="underline">
              verificar tu número de WhatsApp
            </Link>
            .
          </span>
        </div>
      )}

      {message && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const isCurrent = subscription?.plan === plan.id;
          return (
            <div
              key={plan.id}
              className={cn(
                'flex flex-col gap-3 rounded-2xl border bg-surface-card p-5',
                highlighted === plan.id ? 'border-brand-400 shadow-glow' : 'border-surface-border'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{plan.name}</span>
                {isCurrent && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
                    Actual
                  </span>
                )}
              </div>
              <div className="text-2xl font-black text-brand-300 font-mono">
                {plan.priceCOP === 0 ? 'Gratis' : formatCOP(plan.priceCOP)}
                {plan.priceCOP > 0 && <span className="text-xs text-slate-500 font-normal"> / mes</span>}
              </div>
              <p className="text-xs text-slate-400 flex-1">{plan.description}</p>
              {plan.id !== 'gratuito' && (
                <Button
                  variant={isCurrent ? 'outline' : 'primary'}
                  size="sm"
                  disabled={!enabled || !user?.phoneVerified || loadingPlan !== null}
                  isLoading={loadingPlan === plan.id}
                  onClick={() => handleActivate(plan.id as PaidPlan)}
                >
                  {isCurrent ? 'Renovar' : 'Activar'}
                  {simulated ? ' (prueba)' : ''}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <Text variant="small" className="text-slate-500">
        Planes mensuales sin renovación automática: al terminar el periodo vuelves al Plan Gratuito sin cargos adicionales. Consulta los{' '}
        <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="underline">
          Términos y Condiciones
        </a>
        .
      </Text>
    </div>
  );
}

export default function BillingPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={null}>
        <BillingContent />
      </Suspense>
    </DashboardLayout>
  );
}
