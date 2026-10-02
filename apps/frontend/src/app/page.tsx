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
  PieChart,
  FileText,
  ArrowRightLeft,
  Scan,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

export default function HomePage() {
  const facturasCount = MOCK_EXPENSES.filter((e) => e.tipoDocumento === 'factura').length;
  const transferenciasCount = MOCK_EXPENSES.filter((e) => e.tipoDocumento === 'transferencia').length;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        {/* Cabecera / Bienvenida */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-surface-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Text variant="small" className="text-brand-300 font-mono tracking-wider uppercase font-semibold">
                Contabilidad en Vivo · Colombia (COP)
              </Text>
            </div>
            <Heading level={1}>Panel de Control Financiero</Heading>
            <Text variant="body" className="text-slate-400 mt-1">
              Resumen consolidado de facturas comerciales y comprobantes bancarios procesados por IA.
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

        {/* Cuadrícula de Métricas Principales (KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Gastado (Mes)"
            value={formatCOP(MOCK_MONTHLY_SUMMARY.totalGastado)}
            icon={<Wallet className="w-5 h-5" />}
            subtext="4 comprobantes auditados"
            badge={
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Septiembre 2026
              </span>
            }
          />

          <StatCard
            title="Presupuesto Restante"
            value={formatCOP((MOCK_MONTHLY_SUMMARY.presupuesto || 0) - MOCK_MONTHLY_SUMMARY.totalGastado)}
            icon={<PieChart className="w-5 h-5" />}
            subtext={`${MOCK_MONTHLY_SUMMARY.porcentajePresupuesto}% consumido del cupo`}
            badge={
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                En Meta
              </span>
            }
          />

          <StatCard
            title="Facturas Comerciales"
            value={`${facturasCount} Facturas`}
            icon={<FileText className="w-5 h-5 text-cyan-400" />}
            subtext="Alkomprar, Éxito, Terpel"
          />

          <StatCard
            title="Transferencias / Recaudos"
            value={`${transferenciasCount} Comprobante`}
            icon={<ArrowRightLeft className="w-5 h-5 text-indigo-400" />}
            subtext="Wompi / Bancolombia"
          />
        </div>

        {/* Sección Principal en 2 Columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Columna Izquierda: Tabla de Comprobantes Recientes */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <Heading level={3}>Comprobantes Recientes</Heading>
                <Text variant="small" className="text-slate-400">
                  Explora y filtra tus gastos por factura comercial o transferencia bancaria.
                </Text>
              </div>

              <Link href="/expenses">
                <Button variant="ghost" size="sm" className="text-xs">
                  Ver Todo el Historial →
                </Button>
              </Link>
            </div>

            <ExpenseTable expenses={MOCK_EXPENSES} />
          </div>

          {/* Columna Derecha: Tarjeta de Resumen Mensual para WhatsApp */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <MonthlySummaryCard summary={MOCK_MONTHLY_SUMMARY} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
