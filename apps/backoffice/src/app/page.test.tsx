import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import HomePage from './page';
import { renderWithProviders } from '@/test/test-utils';

describe('Página Principal / Dashboard (Prueba de Integración con MSW)', () => {
  it('renderiza el resumen financiero mensual y las tarjetas estadísticas en formato COP', async () => {
    renderWithProviders(<HomePage />);

    // Esperar a que TanStack Query y MSW respondan
    await waitFor(() => {
      expect(screen.getByText('ALKOMPRAR ARMENIA')).toBeInTheDocument();
      expect(screen.getByText('FUNERARIA SAN VICENT')).toBeInTheDocument();
    });

    // Validar tarjetas estadísticas de la fila 2x2
    expect(screen.getByText('Total Gastado (Mes)')).toBeInTheDocument();
    expect(screen.getByText('Promedio por Soporte')).toBeInTheDocument();
    expect(screen.getByText('Transferencias / Recaudos')).toBeInTheDocument();
    expect(screen.getByText('Facturas Comerciales')).toBeInTheDocument();

    // Valores en formato COP (aparece en la StatCard y en la MonthlySummaryCard)
    expect(screen.getAllByText(/\$\s*4\.848\.950/).length).toBe(2);
  });

  it('muestra la distribución de gastos por categoría en la tarjeta de resumen', async () => {
    renderWithProviders(<HomePage />);

    await waitFor(() => {
      expect(screen.getAllByText('Tecnología').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Hogar y Servicios').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText('99%')).toBeInTheDocument();
    expect(screen.getByText('1%')).toBeInTheDocument();
  });
});
