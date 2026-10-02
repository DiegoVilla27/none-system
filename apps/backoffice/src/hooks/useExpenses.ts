'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getExpenses,
  getExpenseById,
  getMonthlySummary,
  scanExpense,
  updateExpense,
  deleteExpense,
} from '@/lib/api';
import { DocumentType, Expense } from '@/types/expense.types';

export const EXPENSES_QUERY_KEY = ['expenses'] as const;
export const MONTHLY_SUMMARY_QUERY_KEY = ['monthly-summary'] as const;

/**
 * Hook para obtener la lista de comprobantes con deduplicación y caché.
 */
export function useExpenses(filter?: {
  tipoDocumento?: DocumentType;
  categoria?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: [...EXPENSES_QUERY_KEY, filter],
    queryFn: () => getExpenses(filter),
  });
}

/**
 * Hook para obtener el detalle de un comprobante por ID.
 */
export function useExpense(id: string) {
  return useQuery({
    queryKey: ['expense', id],
    queryFn: () => getExpenseById(id),
    enabled: Boolean(id),
  });
}

/**
 * Hook para obtener el resumen mensual con deduplicación y caché.
 */
export function useMonthlySummary(year?: number, month?: number) {
  return useQuery({
    queryKey: [...MONTHLY_SUMMARY_QUERY_KEY, { year, month }],
    queryFn: () => getMonthlySummary(year, month),
  });
}

/**
 * Hook de mutación para escanear un comprobante con IA.
 */
export function useScanExpense() {
  return useMutation({
    mutationFn: ({ file, tipo }: { file: File; tipo: DocumentType }) =>
      scanExpense(file, tipo),
  });
}

/**
 * Hook de mutación para confirmar o actualizar un comprobante.
 */
export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Expense> }) =>
      updateExpense(id, updates),
    onSuccess: (updated) => {
      // Invalidar y refrescar automáticamente listas y resúmenes
      queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MONTHLY_SUMMARY_QUERY_KEY });
      queryClient.setQueryData(['expense', updated.id], updated);
    },
  });
}

/**
 * Hook de mutación para eliminar un comprobante.
 */
export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MONTHLY_SUMMARY_QUERY_KEY });
      queryClient.removeQueries({ queryKey: ['expense', id] });
    },
  });
}
