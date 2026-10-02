import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from './StatCard';
import { Wallet } from 'lucide-react';

describe('Componente Molecular StatCard', () => {
  it('renderiza título, valor formateado y subtítulo', () => {
    render(
      <StatCard
        title="Total Gastado"
        value="$ 4.798.950 COP"
        subtext="1 comprobante auditado"
        icon={<Wallet data-testid="wallet-icon" />}
      />
    );

    expect(screen.getByText('Total Gastado')).toBeInTheDocument();
    expect(screen.getByText('$ 4.798.950 COP')).toBeInTheDocument();
    expect(screen.getByText('1 comprobante auditado')).toBeInTheDocument();
    expect(screen.getByTestId('wallet-icon')).toBeInTheDocument();
  });

  it('renderiza el badge opcional sin recortarse', () => {
    render(
      <StatCard
        title="Facturas Comerciales"
        value="3 Facturas"
        icon={<Wallet data-testid="wallet-icon-2" />}
        badge={<span data-testid="month-badge">Oct 2026</span>}
      />
    );

    expect(screen.getByTestId('month-badge')).toBeInTheDocument();
    expect(screen.getByText('Oct 2026')).toBeInTheDocument();
  });
});
