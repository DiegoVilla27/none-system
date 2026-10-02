import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import ExpenseDetailPage from './page';
import { renderWithProviders } from '@/test/test-utils';
import { mockPush } from '@/test/setup';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('Página de Detalle de Gasto /expenses/[id] (Prueba de Integración con MSW)', () => {
  it('carga y muestra los detalles del comprobante contable', async () => {
    renderWithProviders(<ExpenseDetailPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('ALKOMPRAR ARMENIA')).toBeInTheDocument();
      expect(screen.getByDisplayValue('4798950')).toBeInTheDocument();
    });

    expect(screen.getByText('ID: exp-test-01')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Eliminar/i })).toBeInTheDocument();
  });

  it('permite guardar modificaciones y muestra mensaje de éxito', async () => {
    renderWithProviders(<ExpenseDetailPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('ALKOMPRAR ARMENIA')).toBeInTheDocument();
    });

    const comercioInput = screen.getByDisplayValue('ALKOMPRAR ARMENIA');
    fireEvent.change(comercioInput, { target: { value: 'ALKOMPRAR PEREIRA' } });

    const saveButton = screen.getByRole('button', { name: /Confirmar y Guardar Gasto/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText('¡Comprobante actualizado correctamente!')
      ).toBeInTheDocument();
    });
  });

  it('permite eliminar el comprobante tras confirmación y redirige a /expenses', async () => {
    renderWithProviders(<ExpenseDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Eliminar/i })).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /Eliminar/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/expenses');
    });
  });

  it('muestra estado de error cuando el comprobante no existe', async () => {
    // Simular que el endpoint devuelve 404
    server.use(
      http.get('*/api/v1/expenses/:id', () => {
        return HttpResponse.json(
          { success: false, error: { message: 'Gasto no encontrado' } },
          { status: 404 }
        );
      })
    );

    renderWithProviders(<ExpenseDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Comprobante no encontrado')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Ir al Listado/i })).toBeInTheDocument();
  });
});
