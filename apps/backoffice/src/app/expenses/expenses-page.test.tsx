import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import ExpensesPage from './page';
import { renderWithProviders } from '@/test/test-utils';
import { mockPush } from '@/test/setup';

describe('Página de Historial de Gastos (Prueba de Integración con MSW)', () => {
  it('carga la lista de comprobantes desde el servidor y los muestra en la tabla', async () => {
    renderWithProviders(<ExpensesPage />);

    // Esperar a que la tabla renderice los datos mockeados en MSW
    await waitFor(() => {
      expect(screen.getByText('ALKOMPRAR ARMENIA')).toBeInTheDocument();
      expect(screen.getByText('FUNERARIA SAN VICENT')).toBeInTheDocument();
    });

    expect(screen.getByText(/\$ 4\.798\.950/)).toBeInTheDocument();
    expect(screen.getByText(/\$ 50\.000/)).toBeInTheDocument();
  });

  it('permite filtrar por pestaña: Facturas vs Transferencias sin saltos', async () => {
    renderWithProviders(<ExpensesPage />);

    await waitFor(() => {
      expect(screen.getByText('ALKOMPRAR ARMENIA')).toBeInTheDocument();
    });

    // Clic en pestaña Facturas
    const facturasTab = screen.getByRole('button', { name: /^Facturas$/i });
    fireEvent.click(facturasTab);

    expect(screen.getByText('ALKOMPRAR ARMENIA')).toBeInTheDocument();
    expect(screen.queryByText('FUNERARIA SAN VICENT')).not.toBeInTheDocument();

    // Clic en pestaña Transferencias
    const transTab = screen.getByRole('button', { name: /^Transferencias$/i });
    fireEvent.click(transTab);

    expect(screen.getByText('FUNERARIA SAN VICENT')).toBeInTheDocument();
    expect(screen.queryByText('ALKOMPRAR ARMENIA')).not.toBeInTheDocument();
  });

  it('filtra por texto en el input de búsqueda', async () => {
    renderWithProviders(<ExpensesPage />);

    await waitFor(() => {
      expect(screen.getByText('ALKOMPRAR ARMENIA')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por comercio, NIT o ref/i);
    fireEvent.change(searchInput, { target: { value: 'Funeraria' } });

    expect(screen.getByText('FUNERARIA SAN VICENT')).toBeInTheDocument();
    expect(screen.queryByText('ALKOMPRAR ARMENIA')).not.toBeInTheDocument();
  });

  it('filtra por categoría contable usando el selector avanzado', async () => {
    renderWithProviders(<ExpensesPage />);

    await waitFor(() => {
      expect(screen.getByText('ALKOMPRAR ARMENIA')).toBeInTheDocument();
    });

    const categorySelect = screen.getByLabelText(/Filtrar por categoría contable/i);
    fireEvent.change(categorySelect, { target: { value: 'Tecnología' } });

    expect(screen.getByText('ALKOMPRAR ARMENIA')).toBeInTheDocument();
    expect(screen.queryByText('FUNERARIA SAN VICENT')).not.toBeInTheDocument();

    // Limpiar filtros
    const clearBtn = screen.getByRole('button', { name: /Limpiar filtros/i });
    fireEvent.click(clearBtn);

    expect(screen.getByText('ALKOMPRAR ARMENIA')).toBeInTheDocument();
    expect(screen.getByText('FUNERARIA SAN VICENT')).toBeInTheDocument();
  });

  it('permite exportar comprobantes filtrados a Excel activando la descarga', async () => {
    renderWithProviders(<ExpensesPage />);

    await waitFor(() => {
      expect(screen.getByText('ALKOMPRAR ARMENIA')).toBeInTheDocument();
    });

    const exportBtn = screen.getByRole('button', { name: /Exportar a Excel \(2\)/i });
    expect(exportBtn).toBeInTheDocument();

    fireEvent.click(exportBtn);

    // Debe llamar a URL.createObjectURL para crear el blob de descarga
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  it('navega a /expenses/:id al hacer clic en un registro de la tabla', async () => {
    renderWithProviders(<ExpensesPage />);

    await waitFor(() => {
      expect(screen.getByText('ALKOMPRAR ARMENIA')).toBeInTheDocument();
    });

    const row = screen.getByText('ALKOMPRAR ARMENIA').closest('tr');
    if (row) fireEvent.click(row);

    expect(mockPush).toHaveBeenCalledWith('/expenses/exp-test-01');
  });
});
