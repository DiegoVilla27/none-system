import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportExpensesToCSV } from './export-excel';
import { Expense } from '@/types/expense.types';

describe('Utilidad de Exportación a Excel / CSV (export-excel.ts)', () => {
  const mockExpenses: Expense[] = [
    {
      id: 'exp-1',
      tipoDocumento: 'factura',
      comercio: 'ÉXITO UNICENTRO',
      entidadFinanciera: 'Bancolombia',
      cifNif: '890900608-9',
      numeroReferencia: 'EXT-1234',
      fecha: '2026-10-01',
      subtotal: 100000,
      impuestos: 19000,
      total: 119000,
      moneda: 'COP',
      categoria: 'Supermercado',
      lineasArticulos: [
        { descripcion: 'Arroz Diana', precio: 50000, cantidad: 2 },
      ],
      confianzaExtraccion: 'alta',
      notas: 'Nota con ; y comillas "dobles"',
      imageUrl: '/uploads/1.jpg',
      imageOriginalName: '1.jpg',
      estado: 'confirmado',
      createdAt: '2026-10-01T10:00:00Z',
      updatedAt: '2026-10-01T10:00:00Z',
    },
    {
      id: 'exp-2',
      tipoDocumento: 'transferencia',
      comercio: 'FUNERARIA SAN VICENTE',
      entidadFinanciera: 'Wompi',
      cifNif: null,
      numeroReferencia: 'TR-9988',
      fecha: '2026-10-02',
      subtotal: null,
      impuestos: null,
      total: 50000,
      moneda: 'COP',
      categoria: 'Hogar y Servicios',
      lineasArticulos: [
        { descripcion: 'Recaudo mensual', precio: 50000, cantidad: 1 },
      ],
      confianzaExtraccion: 'alta',
      notas: null,
      imageUrl: '/uploads/2.jpg',
      imageOriginalName: '2.jpg',
      estado: 'confirmado',
      createdAt: '2026-10-02T11:00:00Z',
      updatedAt: '2026-10-02T11:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no genera descarga si la lista de comprobantes está vacía y avisa al usuario', () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    exportExpensesToCSV([]);
    expect(alertMock).toHaveBeenCalledWith(
      'No hay comprobantes para exportar con los filtros seleccionados.'
    );
  });

  it('crea un elemento de descarga con el nombre de archivo especificado', () => {
    const createElementSpy = vi.spyOn(document, 'createElement');
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');

    exportExpensesToCSV(mockExpenses, 'Reporte_Octubre_2026');

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });
});
