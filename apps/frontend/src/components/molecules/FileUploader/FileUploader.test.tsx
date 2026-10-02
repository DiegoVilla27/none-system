import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUploader } from './FileUploader';

describe('Componente Molecular FileUploader', () => {
  it('renderiza las opciones de tipo de comprobante', () => {
    render(<FileUploader />);
    expect(screen.getByText('Factura / Compra')).toBeInTheDocument();
    expect(screen.getByText('Transferencia / Recaudo')).toBeInTheDocument();
  });

  it('deshabilita las pestañas de selección cuando isProcessing es true', () => {
    render(<FileUploader isProcessing={true} />);

    const facturaBtn = screen.getByRole('button', { name: /Factura \/ Compra/i });
    const transBtn = screen.getByRole('button', { name: /Transferencia \/ Recaudo/i });

    expect(facturaBtn).toBeDisabled();
    expect(transBtn).toBeDisabled();
    expect(screen.getByText('(bloqueado durante el escaneo)')).toBeInTheDocument();
  });

  it('muestra la barra de progreso y el estado cuando isProcessing es true', () => {
    render(
      <FileUploader
        isProcessing={true}
        progressPercentage={65}
        progressStatus="Extrayendo valores, NIT, comercio y fecha..."
      />
    );

    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(
      screen.getByText('Extrayendo valores, NIT, comercio y fecha...')
    ).toBeInTheDocument();
  });

  it('permite alternar el tipo de documento cuando no está procesando', () => {
    render(<FileUploader />);

    const transBtn = screen.getByRole('button', { name: /Transferencia \/ Recaudo/i });
    fireEvent.click(transBtn);

    expect(transBtn.className).toContain('text-indigo-300');
  });
});
