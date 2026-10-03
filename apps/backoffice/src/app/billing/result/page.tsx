'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/templates/DashboardLayout/DashboardLayout';
import { Heading, Text } from '@/components/atoms/Typography/Typography';
import { Button } from '@/components/atoms/Button/Button';
import { useAuth } from '@/context/AuthContext';
import { confirmWompiPayment, PaymentInfo } from '@/lib/api';
import { formatCOP } from '@/lib/utils';
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 15;

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const transactionId = searchParams.get('id');
  const { refreshUser } = useAuth();
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!transactionId) {
      setError('No recibimos la referencia de la transacción.');
      return;
    }
    let cancelled = false;
    let polls = 0;

    // Wompi puede tardar unos segundos en confirmar (PSE, Nequi): se consulta hasta tener estado final
    const check = async () => {
      try {
        const result = await confirmWompiPayment(transactionId);
        if (cancelled) return;
        setPayment(result);
        if (result.status === 'APPROVED') await refreshUser();
        if (result.status === 'PENDING' && ++polls < MAX_POLLS) setTimeout(check, POLL_INTERVAL_MS);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No pudimos confirmar el pago.');
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [transactionId, refreshUser]);

  const status = payment?.status;

  return (
    <div className="max-w-lg mx-auto flex flex-col items-center text-center gap-5 py-12">
      {error ? (
        <>
          <XCircle className="w-14 h-14 text-red-400" />
          <Heading level={2}>No pudimos confirmar el pago</Heading>
          <Text className="text-slate-400">{error}</Text>
        </>
      ) : !payment || status === 'PENDING' ? (
        <>
          {payment ? <Clock className="w-14 h-14 text-amber-300" /> : <Loader2 className="w-14 h-14 text-brand-400 animate-spin" />}
          <Heading level={2}>{payment ? 'Pago en proceso' : 'Confirmando tu pago...'}</Heading>
          <Text className="text-slate-400">
            Estamos esperando la confirmación de tu banco. Puedes cerrar esta página: te avisaremos por WhatsApp cuando se apruebe.
          </Text>
        </>
      ) : status === 'APPROVED' ? (
        <>
          <CheckCircle2 className="w-14 h-14 text-emerald-400" />
          <Heading level={2}>¡Pago aprobado!</Heading>
          <Text className="text-slate-400">
            Recibimos {formatCOP(payment.amountCop)}. Tu plan ya está activo. Referencia: <span className="font-mono">{payment.reference}</span>
          </Text>
        </>
      ) : (
        <>
          <XCircle className="w-14 h-14 text-red-400" />
          <Heading level={2}>El pago no se completó</Heading>
          <Text className="text-slate-400">
            Estado: {status === 'DECLINED' ? 'rechazado por la entidad' : status === 'VOIDED' ? 'anulado' : 'con error'}. No se activó
            ningún plan ni se realizó ningún cobro adicional.
          </Text>
        </>
      )}

      <Link href="/billing">
        <Button variant="primary" size="md">
          Volver a mi plan
        </Button>
      </Link>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={null}>
        <PaymentResultContent />
      </Suspense>
    </DashboardLayout>
  );
}
