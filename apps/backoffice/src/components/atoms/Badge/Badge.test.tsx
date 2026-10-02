import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Componente Atómico Badge', () => {
  it('renderiza el contenido hijo correctamente', () => {
    render(<Badge>Factura</Badge>);
    expect(screen.getByText('Factura')).toBeInTheDocument();
  });

  it('aplica las clases de variante correspondientes para factura', () => {
    const { container } = render(<Badge variant="factura">Factura Comercial</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-cyan-300');
  });

  it('aplica las clases de variante correspondientes para transferencia', () => {
    const { container } = render(<Badge variant="transferencia">Comprobante Bancario</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-indigo-300');
  });

  it('muestra el punto indicador cuando dot es true', () => {
    const { container } = render(<Badge dot variant="alta">Confianza Alta</Badge>);
    const dotSpan = container.querySelector('.rounded-full.w-1\\.5.h-1\\.5');
    expect(dotSpan).toBeInTheDocument();
  });
});
