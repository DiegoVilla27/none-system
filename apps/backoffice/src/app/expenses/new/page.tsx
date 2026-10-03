'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/templates/DashboardLayout/DashboardLayout';
import { Heading, Text } from '@/components/atoms/Typography/Typography';
import { Input } from '@/components/atoms/Input/Input';
import { Button } from '@/components/atoms/Button/Button';
import { useCreateManualExpense } from '@/hooks/useExpenses';
import { EXPENSE_CATEGORIES, ExpenseCategory } from '@/types/expense.types';
import { PenLine, AlertCircle, ShieldAlert, Scan, Calendar, MessageCircle } from 'lucide-react';

/** Fecha de hoy en Colombia (YYYY-MM-DD). */
function todayInBogota(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export default function NewManualExpensePage() {
  const router = useRouter();
  const createManual = useCreateManualExpense();
  const today = todayInBogota();

  const [descripcion, setDescripcion] = useState('');
  const [total, setTotal] = useState('');
  const [fecha, setFecha] = useState(today);
  const [categoria, setCategoria] = useState<ExpenseCategory | ''>('');
  const [comercio, setComercio] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = Number(total.replace(/\./g, '').replace(',', '.'));
    if (!descripcion.trim()) {
      setError('Describe el gasto (ej: Arroz).');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Ingresa un valor mayor a 0.');
      return;
    }
    if (fecha > today) {
      setError('La fecha no puede ser futura.');
      return;
    }

    try {
      const created = await createManual.mutateAsync({
        descripcion: descripcion.trim(),
        total: amount,
        fecha,
        categoria: categoria || undefined,
        comercio: comercio.trim() || null,
        notas: notas.trim() || null,
      });
      router.push(`/expenses/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el gasto.');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <div className="border-b border-surface-border pb-6">
          <div className="flex items-center gap-2 mb-1">
            <PenLine className="w-4 h-4 text-amber-300" />
            <Text variant="small" className="text-amber-300 font-mono tracking-wider uppercase font-semibold">
              Gasto sin recibo
            </Text>
          </div>
          <Heading level={1}>Registrar Gasto Manual</Heading>
          <Text variant="body" className="text-slate-400 mt-1">
            Para compras sin factura ni comprobante, por ejemplo: <em>Arroz $5.000</em>. No consume tus comprobantes con foto:
            el Plan Gratuito incluye 30 gastos escritos al mes y los planes pagos, ilimitados.
          </Text>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-100">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
          <span>
            Un gasto manual sirve para tu control personal, pero <strong>no es soporte contable ni deducible ante la DIAN</strong>.
            Si tienes la factura o el comprobante,{' '}
            <Link href="/scan" className="underline text-amber-200">
              escanéalo
            </Link>{' '}
            para tener el respaldo.
          </span>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 p-6 rounded-xl bg-surface-card border border-surface-border shadow-subtle"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="¿En qué gastaste? *"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Arroz, almuerzo, taxi..."
              maxLength={200}
              required
            />
            <Input
              label="Valor (COP) *"
              inputMode="decimal"
              value={total}
              onChange={(e) => setTotal(e.target.value.replace(/[^\d.,]/g, ''))}
              placeholder="5.000"
              prefix={<span className="text-slate-400 text-sm">$</span>}
              required
            />
            <Input
              type="date"
              label="Fecha"
              value={fecha}
              max={today}
              onChange={(e) => setFecha(e.target.value)}
              prefix={<Calendar className="w-4 h-4 text-slate-400" />}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-300 tracking-wide">Categoría</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as ExpenseCategory | '')}
                className="w-full rounded-lg bg-surface-elevated border border-surface-border px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="">Automática según el concepto</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Lugar (opcional)"
              value={comercio}
              onChange={(e) => setComercio(e.target.value)}
              placeholder="Tienda de la esquina"
              maxLength={200}
            />
            <Input
              label="Notas (opcional)"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              maxLength={1000}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-surface-border">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>
                También puedes escribirlo al bot de WhatsApp: <strong className="text-slate-200">arroz 5000</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/scan">
                <Button type="button" variant="ghost" size="md" leftIcon={<Scan className="w-4 h-4" />}>
                  Tengo el recibo
                </Button>
              </Link>
              <Button type="submit" variant="primary" size="md" isLoading={createManual.isPending}>
                Guardar gasto
              </Button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
