import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SideBySideViewer } from './SideBySideViewer';
import { INITIAL_TEST_EXPENSES } from '@/test/mocks/handlers';
import { Expense } from '@/types/expense.types';

describe('Componente Organismo SideBySideViewer (Integración de Visor y Formulario)', () => {
  const mockImageExpense: Expense = INITIAL_TEST_EXPENSES[0]; // Factura Alkomprar .jpg
  const mockPdfExpense: Expense = {
    ...INITIAL_TEST_EXPENSES[1],
    imageUrl: '/uploads/soporte_bancario.pdf',
    imageOriginalName: 'soporte_bancario.pdf',
  };

  it('renderiza la imagen y controles de zoom/rotación si el soporte es una foto', () => {
    render(<SideBySideViewer initialExpense={mockImageExpense} />);

    expect(screen.getByAltText('Soporte financiero')).toBeInTheDocument();
    expect(screen.getByTitle('Acercar')).toBeInTheDocument();
    expect(screen.getByTitle('Alejar')).toBeInTheDocument();
    expect(screen.getByTitle('Rotar 90°')).toBeInTheDocument();
  });

  it('renderiza un iframe interactivo y enlaces de descarga si el soporte es un PDF', () => {
    render(<SideBySideViewer initialExpense={mockPdfExpense} />);

    const iframe = screen.getByTitle(/Soporte PDF/i);
    expect(iframe).toBeInTheDocument();
    expect(screen.getByTitle('Abrir PDF en pestaña nueva')).toBeInTheDocument();
    expect(screen.getByTitle('Descargar PDF')).toBeInTheDocument();
  });

  it('permite modificar los campos contables y totales financieros en COP', async () => {
    const handleSave = vi.fn();
    render(<SideBySideViewer initialExpense={mockImageExpense} onSave={handleSave} />);

    // Modificar comercio
    const comercioInput = screen.getByDisplayValue('ALKOMPRAR ARMENIA');
    fireEvent.change(comercioInput, { target: { value: 'ALKOMPRAR PEREIRA' } });
    expect(comercioInput).toHaveValue('ALKOMPRAR PEREIRA');

    // Modificar total a pagar
    const totalInput = screen.getByDisplayValue('4798950');
    fireEvent.change(totalInput, { target: { value: '5000000' } });
    expect(totalInput).toHaveValue(5000000);

    // Guardar cambios
    const saveBtn = screen.getByRole('button', { name: /Confirmar y Guardar Gasto/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({
          comercio: 'ALKOMPRAR PEREIRA',
          total: 5000000,
        })
      );
    });
  });
});
