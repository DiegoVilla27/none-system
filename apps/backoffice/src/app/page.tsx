'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/templates/DashboardLayout/DashboardLayout';
import { StatCard } from '@/components/molecules/StatCard/StatCard';
import { ExpenseTable } from '@/components/organisms/ExpenseTable/ExpenseTable';
import { MonthlySummaryCard } from '@/components/organisms/MonthlySummaryCard/MonthlySummaryCard';
import { Button } from '@/components/atoms/Button/Button';
import { Heading, Text } from '@/components/atoms/Typography/Typography';
import { Expense, MonthlySummary } from '@/types/expense.types';
import { useExpenses, useMonthlySummary } from '@/hooks/useExpenses';
import { formatCOP } from '@/lib/utils';
import {
  Wallet,
  FileText,
  ArrowRightLeft,
  Scan,
  Calculator,
  RefreshCw,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const {
    data: expenses = [],
    isLoading: isLoadingExpenses,
    refetch: refetchExpenses,
    isFetching: isFetchingExpenses,
  } = useExpenses();

  const {
    data: summaryData,
    isLoading: isLoadingSummary,
    refetch: refetchSummary,
    isFetching: isFetchingSummary,
  } = useMonthlySummary();

  const isLoading = isLoadingExpenses || isLoadingSummary;
  const isFetching = isFetchingExpenses || isFetchingSummary;

  const summary: MonthlySummary = summaryData || {
    year: 2026,
    month: 10,
    totalGastado: 0,
    totalFacturas: 0,
    totalTransferencias: 0,
    numFacturas: 0,
    numTransferencias: 0,
    numGastos: 0,
    categorias: [],
  };

  const handleRefresh = () => {
    refetchExpenses();
    refetchSummary();
  };

  const facturas = expenses.filter((e) => e.tipoDocumento === 'factura');
  const transferencias = expenses.filter((e) => e.tipoDocumento === 'transferencia');

  const totalFacturas = facturas.reduce((acc, curr) => acc + curr.total, 0);
  const totalTransferencias = transferencias.reduce((acc, curr) => acc + curr.total, 0);
  const totalGeneral = expenses.reduce((acc, curr) => acc + curr.total, 0);
  const promedio = expenses.length > 0 ? totalGeneral / expenses.length : 0;

  // Mes dinámico para la píldora
  const monthNames = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];
  const currentMonthBadge = `${monthNames[(summary.month || 10) - 1]} ${summary.year || 2026}`;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        {/* Cabecera / Bienvenida */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-surface-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Text variant="small" className="text-brand-300 font-mono tracking-wider uppercase font-semibold">
                Control Contable en Vivo
              </Text>
            </div>
            <Heading level={1}>Panel de Control Financiero</Heading>
            <Text variant="body" className="text-slate-400 mt-1">
              Auditoría y control de facturas comerciales y comprobantes de transferencia procesados por IA.
            </Text>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={handleRefresh}
              isLoading={isFetching}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Refrescar
            </Button>

            <Link href="/scan">
              <Button
                variant="primary"
                size="md"
                leftIcon={<Scan className="w-4 h-4" />}
              >
                Escanear Nuevo Documento
              </Button>
            </Link>
          </div>
        </div>

        {/* ================= FILA 1: 4 CARDS (8/12) + TARJETA RESUMEN (4/12) ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Cuadrícula 2x2 de métricas ocupando 8 de 12 columnas */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              title="Total Gastado (Mes)"
              value={formatCOP(summary.totalGastado || totalGeneral)}
              icon={<Wallet className="w-5 h-5 text-brand-400" />}
              subtext={`Consolidado de ${summary.numGastos || expenses.length} soportes auditados`}
              badge={
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 whitespace-nowrap shrink-0">
                  {currentMonthBadge}
                </span>
              }
            />

            <StatCard
              title="Promedio por Soporte"
              value={formatCOP(promedio)}
              icon={<Calculator className="w-5 h-5 text-emerald-400" />}
              subtext="Monto promedio por transacción"
              badge={
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 whitespace-nowrap shrink-0">
                  Promedio
                </span>
              }
            />

            <StatCard
              title="Transferencias / Recaudos"
              value={`${summary.numTransferencias || transferencias.length} Comprobantes`}
              icon={<ArrowRightLeft className="w-5 h-5 text-indigo-400" />}
              subtext={`Total: ${formatCOP(summary.totalTransferencias || totalTransferencias)} bancarios`}
              badge={
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 whitespace-nowrap shrink-0">
                  Bancario
                </span>
              }
            />

            <StatCard
              title="Facturas Comerciales"
              value={`${summary.numFacturas || facturas.length} Facturas`}
              icon={<FileText className="w-5 h-5 text-cyan-400" />}
              subtext={`Total: ${formatCOP(summary.totalFacturas || totalFacturas)} en compras`}
              badge={
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 whitespace-nowrap shrink-0">
                  Comercial
                </span>
              }
            />
          </div>

          {/* Tarjeta de Resumen ocupando las 4 columnas restantes */}
          <div className="lg:col-span-4 h-full">
            <MonthlySummaryCard summary={summary} expenses={expenses} />
          </div>
        </div>

        {/* ================= FILA 2: TABLA DE GASTOS COMPLETA (12/12) ================= */}
        <div className="w-full flex flex-col gap-4 border-t border-surface-border pt-8">
          <div className="flex items-center justify-between">
            <div>
              <Heading level={3}>Historial de Comprobantes Recientes</Heading>
              <Text variant="small" className="text-slate-400">
                Detalle cronológico de facturas de compra y transferencias bancarias en Colombia.
              </Text>
            </div>

            <Link href="/expenses">
              <Button variant="ghost" size="sm" className="text-xs">
                Ver Historial Completo →
              </Button>
            </Link>
          </div>

          <ExpenseTable
            expenses={expenses}
            onViewExpense={(exp) => router.push(`/expenses/${exp.id}`)}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
