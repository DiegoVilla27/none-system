'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/templates/DashboardLayout/DashboardLayout';
import { ExpenseTable } from '@/components/organisms/ExpenseTable/ExpenseTable';
import { UpgradeModal } from '@/components/molecules/UpgradeModal/UpgradeModal';
import { Heading, Text } from '@/components/atoms/Typography/Typography';
import { Button } from '@/components/atoms/Button/Button';
import { useExpenses } from '@/hooks/useExpenses';
import { useAuth } from '@/context/AuthContext';
import { exportExpensesToCSV } from '@/lib/export-excel';
import { ReceiptText, Plus, RefreshCw, Download, Lock } from 'lucide-react';

export default function ExpensesPage() {
  const router = useRouter();
  const { subscription } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const {
    data: expenses = [],
    isLoading,
    error: queryError,
    refetch,
    isFetching,
  } = useExpenses();

  const errorMessage = queryError instanceof Error ? queryError.message : null;
  const isFreePlan = !subscription || subscription.plan === 'gratuito';

  const handleExportAll = () => {
    if (isFreePlan) {
      setShowUpgradeModal(true);
      return;
    }

    exportExpensesToCSV(
      expenses,
      `Libro_Comprobantes_${new Date().toISOString().slice(0, 10)}`
    );
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-surface-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ReceiptText className="w-4 h-4 text-brand-400" />
              <Text variant="small" className="text-brand-300 font-mono tracking-wider uppercase font-semibold">
                Historial Contable
              </Text>
            </div>
            <Heading level={1}>Libro de Comprobantes & Gastos</Heading>
            <Text variant="body" className="text-slate-400 mt-1">
              Registro histórico consolidado de todas tus facturas electrónicas y comprobantes bancarios.
            </Text>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={handleExportAll}
              leftIcon={
                isFreePlan ? (
                  <Lock className="w-4 h-4 text-amber-400" />
                ) : (
                  <Download className="w-4 h-4 text-emerald-400" />
                )
              }
              title={isFreePlan ? 'Función disponible en planes de pago' : 'Exportar a Excel'}
            >
              Exportar Excel {isFreePlan && <span className="ml-1 text-[10px] text-amber-400 font-bold">(PRO)</span>}
            </Button>

            <Button
              variant="outline"
              size="md"
              onClick={() => refetch()}
              isLoading={isFetching}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Refrescar
            </Button>

            <Link href="/scan">
              <Button
                variant="primary"
                size="md"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Nuevo Escaneo
              </Button>
            </Link>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Listado Principal de la Tabla con Filtros Avanzados */}
        <div className="flex flex-col gap-4">
          <ExpenseTable
            expenses={expenses}
            showAdvancedFilters={true}
            onViewExpense={(exp) => router.push(`/expenses/${exp.id}`)}
          />
        </div>
      </div>

      {/* Modal de Actualización si el usuario gratuito intenta exportar */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="Exportación a Excel / CSV"
      />
    </DashboardLayout>
  );
}
