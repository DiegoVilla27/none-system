import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useExpenses,
  useExpense,
  useMonthlySummary,
  useUpdateExpense,
  useDeleteExpense,
} from './useExpenses';
import { createTestQueryClient } from '@/test/test-utils';

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('Pruebas de Integración de Hooks Reactivos con MSW (useExpenses.ts)', () => {
  it('useExpenses: obtiene la lista de comprobantes desde el servidor simulado MSW', async () => {
    const { result } = renderHook(() => useExpenses(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.length).toBe(2);
    expect(result.current.data?.[0].comercio).toBe('ALKOMPRAR ARMENIA');
    expect(result.current.data?.[1].comercio).toBe('FUNERARIA SAN VICENT');
  });

  it('useExpense: obtiene el detalle de un comprobante específico por su ID', async () => {
    const { result } = renderHook(() => useExpense('exp-test-01'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.id).toBe('exp-test-01');
    expect(result.current.data?.total).toBe(4798950);
    expect(result.current.data?.moneda).toBe('COP');
  });

  it('useExpense: gestiona el error 404 si el ID no existe', async () => {
    const { result } = renderHook(() => useExpense('id-inexistente'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/no encontrado/i);
  });

  it('useMonthlySummary: obtiene el resumen contable mensual', async () => {
    const { result } = renderHook(() => useMonthlySummary(2026, 10), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.totalGastado).toBe(4848950);
    expect(result.current.data?.numGastos).toBe(2);
    expect(result.current.data?.categorias).toHaveLength(2);
  });

  it('useUpdateExpense: actualiza un comprobante y sincroniza el caché', async () => {
    const wrapper = createWrapper();
    const { result: updateMutation } = renderHook(() => useUpdateExpense(), { wrapper });

    await updateMutation.current.mutateAsync({
      id: 'exp-test-01',
      updates: { comercio: 'ALKOMPRAR PRINCIPAL' },
    });

    await waitFor(() => expect(updateMutation.current.isSuccess).toBe(true));

    // Verificar que el hook useExpense lee el valor actualizado
    const { result: expenseQuery } = renderHook(() => useExpense('exp-test-01'), { wrapper });
    await waitFor(() => expect(expenseQuery.current.data?.comercio).toBe('ALKOMPRAR PRINCIPAL'));
  });

  it('useDeleteExpense: elimina un comprobante del servidor MSW', async () => {
    const wrapper = createWrapper();
    const { result: deleteMutation } = renderHook(() => useDeleteExpense(), { wrapper });

    await deleteMutation.current.mutateAsync('exp-test-02');

    await waitFor(() => expect(deleteMutation.current.isSuccess).toBe(true));

    // Verificar que ya no existe
    const { result: expenseQuery } = renderHook(() => useExpense('exp-test-02'), { wrapper });
    await waitFor(() => expect(expenseQuery.current.isError).toBe(true));
  });
});
