'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/templates/DashboardLayout/DashboardLayout';
import { SideBySideViewer } from '@/components/organisms/SideBySideViewer/SideBySideViewer';
import { Heading, Text } from '@/components/atoms/Typography/Typography';
import { Button } from '@/components/atoms/Button/Button';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Expense, DOCUMENT_TYPE_LABELS } from '@/types/expense.types';
import { useExpense, useUpdateExpense, useDeleteExpense } from '@/hooks/useExpenses';
import { ArrowLeft, Trash2, AlertCircle, RefreshCw, FileText } from 'lucide-react';

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { data: expense, isLoading, error: queryError, refetch } = useExpense(id);
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();

  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const error = queryError instanceof Error ? queryError.message : null;

  const handleSave = async (updated: Expense) => {
    try {
      setSaveSuccessMsg(null);
      await updateMutation.mutateAsync({ id, updates: updated });
      setSaveSuccessMsg('¡Comprobante actualizado correctamente!');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar los cambios');
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      '¿Estás seguro de que deseas eliminar este comprobante contable? Esta acción no se puede deshacer.'
    );
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(id);
      router.push('/expenses');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar el gasto');
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Barra Superior con Navegación y Acciones */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/expenses')}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Volver al Listado
            </Button>
            <div className="h-4 w-px bg-surface-border hidden sm:block" />
            <Text variant="muted" className="text-xs font-mono text-slate-400 hidden sm:inline">
              ID: {id}
            </Text>
          </div>

          {expense && (
            <div className="flex items-center gap-3">
              <Badge variant={expense.tipoDocumento}>
                {DOCUMENT_TYPE_LABELS[expense.tipoDocumento]}
              </Badge>

              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                isLoading={deleteMutation.isPending}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Eliminar
              </Button>
            </div>
          )}
        </div>

        {/* Notificación de Guardado */}
        {saveSuccessMsg && (
          <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Estado de Carga */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-brand-400 animate-spin" />
            <Text variant="body" className="text-slate-400">
              Cargando comprobante contable...
            </Text>
          </div>
        )}

        {/* Estado de Error / 404 */}
        {!isLoading && error && (
          <div className="p-8 rounded-xl bg-surface-card border border-rose-500/30 flex flex-col items-center text-center gap-4 max-w-md mx-auto my-12">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <Heading level={3} className="text-rose-200">
                Comprobante no encontrado
              </Heading>
              <Text variant="body" className="text-slate-400 text-xs mt-1">
                {error}
              </Text>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => refetch()}>
                Reintentar
              </Button>
              <Button variant="primary" size="sm" onClick={() => router.push('/expenses')}>
                Ir al Listado
              </Button>
            </div>
          </div>
        )}

        {/* Visor Lado a Lado cuando está cargado */}
        {!isLoading && expense && (
          <SideBySideViewer
            initialExpense={expense}
            onSave={handleSave}
            onCancel={() => router.push('/expenses')}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
