import Link from 'next/link';
import { DashboardLayout } from '@/components/templates/DashboardLayout/DashboardLayout';
import { StatCard } from '@/components/molecules/StatCard/StatCard';
import { ExpenseTable } from '@/components/organisms/ExpenseTable/ExpenseTable';
import { MonthlySummaryCard } from '@/components/organisms/MonthlySummaryCard/MonthlySummaryCard';
import { Button } from '@/components/atoms/Button/Button';
import { Heading, Text } from '@/components/atoms/Typography/Typography';
import { MOCK_EXPENSES, MOCK_MONTHLY_SUMMARY } from '@/mocks/expense.mocks';
import { formatCOP } from '@/lib/utils';
import {
  Wallet,
  FileText,
  ArrowRightLeft,
  Scan,
  Calculator,
} from 'lucide-react';

export default function HomePage() {
  const facturas = MOCK_EXPENSES.filter((e) => e.tipoDocumento === 'factura');
  const transferencias = MOCK_EXPENSES.filter((e) => e.tipoDocumento === 'transferencia');

  const totalFacturas = facturas.reduce((acc, curr) => acc + curr.total, 0);
  const totalTransferencias = transferencias.reduce((acc, curr) => acc + curr.total, 0);
  const promedio = MOCK_EXPENSES.length > 0 ? MOCK_MONTHLY_SUMMARY.totalGastado / MOCK_EXPENSES.length : 0;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        {/* Cabecera / Bienvenida */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-surface-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Text variant="small" className="text-brand-300 font-mono tracking-wider uppercase font-semibold">
                Control Contable en Vivo · Colombia (COP)
              </Text>
            </div>
            <Heading level={1}>Panel de Control Financiero</Heading>
            <Text variant="body" className="text-slate-400 mt-1">
              Auditoría y control de facturas comerciales y comprobantes de transferencia procesados por IA.
            </Text>
          </div>

          <Link href="/scan">
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Scan className="w-4 h-4" />}
            >
              Escanear Nuevo Documento
            </Button>
          </Link>
        </div>

        {/* ================= FILA 1: 4 CARDS (8/12) + TARJETA RESUMEN (4/12) ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Cuadrícula 2x2 de métricas ocupando 8 de 12 columnas */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              title="Total Gastado (Mes)"
              value={formatCOP(MOCK_MONTHLY_SUMMARY.totalGastado)}
              icon={<Wallet className="w-5 h-5 text-brand-400" />}
              subtext="Consolidado de 4 soportes auditados"
              badge={
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 whitespace-nowrap shrink-0">
                  Sep 2026
                </span>
              }
            />

            <StatCard
              title="Facturas Comerciales"
              value={`${facturas.length} Facturas`}
              icon={<FileText className="w-5 h-5 text-cyan-400" />}
              subtext={`Total: ${formatCOP(totalFacturas)} en compras`}
              badge={
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 whitespace-nowrap shrink-0">
                  Comercial
                </span>
              }
            />

            <StatCard
              title="Transferencias / Recaudos"
              value={`${transferencias.length} Comprobante`}
              icon={<ArrowRightLeft className="w-5 h-5 text-indigo-400" />}
              subtext={`Total: ${formatCOP(totalTransferencias)} bancarios`}
              badge={
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 whitespace-nowrap shrink-0">
                  Bancario
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
          </div>

          {/* Tarjeta de Resumen ocupando las 4 columnas restantes */}
          <div className="lg:col-span-4 h-full">
            <MonthlySummaryCard summary={MOCK_MONTHLY_SUMMARY} />
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

          <ExpenseTable expenses={MOCK_EXPENSES} />
        </div>
      </div>
    </DashboardLayout>
  );
}
