import { http, HttpResponse } from 'msw';
import { Expense, MonthlySummary } from '@/types/expense.types';

export const INITIAL_TEST_EXPENSES: Expense[] = [
  {
    id: 'exp-test-01',
    tipoDocumento: 'factura',
    comercio: 'ALKOMPRAR ARMENIA',
    entidadFinanciera: 'REDEBAN CR',
    cifNif: '890900943-1',
    numeroReferencia: 'X9722525757',
    fecha: '2026-10-01',
    subtotal: 4032731,
    impuestos: 766219,
    total: 4798950,
    moneda: 'COP',
    categoria: 'Tecnología',
    lineasArticulos: [
      { descripcion: 'TV SAMSUNG 55"', precio: 2199900, cantidad: 1 },
      { descripcion: 'Lavadora Samsung', precio: 2599050, cantidad: 1 },
    ],
    confianzaExtraccion: 'alta',
    notas: 'Factura Electrónica Alkomprar',
    imageUrl: '/uploads/sample-alkomprar.jpg',
    imageOriginalName: 'factura-alkomprar.jpg',
    estado: 'confirmado',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'exp-test-02',
    tipoDocumento: 'transferencia',
    comercio: 'FUNERARIA SAN VICENT',
    entidadFinanciera: 'Bancolombia / Wompi',
    cifNif: null,
    numeroReferencia: '42756870',
    fecha: '2026-09-26',
    subtotal: null,
    impuestos: null,
    total: 50000,
    moneda: 'COP',
    categoria: 'Hogar y Servicios',
    lineasArticulos: [
      { descripcion: 'Recaudo de factura', precio: 50000, cantidad: 1 },
    ],
    confianzaExtraccion: 'alta',
    notas: 'Comprobante Wompi',
    imageUrl: '/uploads/sample-wompi.png',
    imageOriginalName: 'comprobante-wompi.png',
    estado: 'confirmado',
    createdAt: '2026-09-26T11:00:00.000Z',
    updatedAt: '2026-09-26T11:00:00.000Z',
  },
];

export const INITIAL_TEST_SUMMARY: MonthlySummary = {
  year: 2026,
  month: 10,
  totalGastado: 4848950,
  totalFacturas: 4798950,
  totalTransferencias: 50000,
  numFacturas: 1,
  numTransferencias: 1,
  numGastos: 2,
  categorias: [
    {
      categoria: 'Tecnología',
      total: 4798950,
      porcentaje: 99,
      numTickets: 1,
    },
    {
      categoria: 'Hogar y Servicios',
      total: 50000,
      porcentaje: 1,
      numTickets: 1,
    },
  ],
};

let currentExpenses: Expense[] = [...INITIAL_TEST_EXPENSES];
let currentSummary: MonthlySummary = { ...INITIAL_TEST_SUMMARY };

export function resetMockDatabase() {
  currentExpenses = JSON.parse(JSON.stringify(INITIAL_TEST_EXPENSES));
  currentSummary = JSON.parse(JSON.stringify(INITIAL_TEST_SUMMARY));
}

export const handlers = [
  // Listar gastos
  http.get('*/api/v1/expenses', ({ request }) => {
    const url = new URL(request.url);
    const tipo = url.searchParams.get('tipoDocumento');
    let data = [...currentExpenses];
    if (tipo) {
      data = data.filter((e) => e.tipoDocumento === tipo);
    }
    return HttpResponse.json({
      success: true,
      data,
      meta: { total: data.length },
    });
  }),

  // Obtener gasto por ID
  http.get('*/api/v1/expenses/:id', ({ params }) => {
    const { id } = params;
    const expense = currentExpenses.find((e) => e.id === id);
    if (!expense) {
      return HttpResponse.json(
        {
          success: false,
          error: { message: `Gasto con ID ${id} no encontrado` },
        },
        { status: 404 }
      );
    }
    return HttpResponse.json({ success: true, data: expense });
  }),

  // Escanear nuevo comprobante con OCR IA
  http.post('*/api/v1/expenses/scan', async () => {
    const newExpense: Expense = {
      id: 'exp-scanned-99',
      tipoDocumento: 'factura',
      comercio: 'ÉXITO UNICENTRO',
      entidadFinanciera: 'Bancolombia Débito',
      cifNif: '890900608-9',
      numeroReferencia: 'EXT-10492',
      fecha: '2026-10-02',
      subtotal: 150000,
      impuestos: 28500,
      total: 178500,
      moneda: 'COP',
      categoria: 'Supermercado',
      lineasArticulos: [
        { descripcion: 'Compras de despensa familiar', precio: 178500, cantidad: 1 },
      ],
      confianzaExtraccion: 'alta',
      notas: null,
      imageUrl: '/uploads/scanned-sample.jpg',
      imageOriginalName: 'recibo-exito.jpg',
      estado: 'confirmado',
      createdAt: '2026-10-02T12:00:00.000Z',
      updatedAt: '2026-10-02T12:00:00.000Z',
    };
    currentExpenses.unshift(newExpense);
    return HttpResponse.json(
      {
        success: true,
        message: 'Documento escaneado y procesado con éxito',
        data: newExpense,
      },
      { status: 201 }
    );
  }),

  // Actualizar gasto
  http.put('*/api/v1/expenses/:id', async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as Partial<Expense>;
    const index = currentExpenses.findIndex((e) => e.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: { message: 'Gasto no encontrado' } },
        { status: 404 }
      );
    }
    currentExpenses[index] = {
      ...currentExpenses[index],
      ...body,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json({
      success: true,
      message: 'Gasto actualizado con éxito',
      data: currentExpenses[index],
    });
  }),

  // Eliminar gasto
  http.delete('*/api/v1/expenses/:id', ({ params }) => {
    const { id } = params;
    const index = currentExpenses.findIndex((e) => e.id === id);
    if (index !== -1) {
      currentExpenses.splice(index, 1);
    }
    return HttpResponse.json({
      success: true,
      message: 'Gasto eliminado con éxito',
    });
  }),

  // Resumen mensual
  http.get('*/api/v1/summaries/monthly', () => {
    return HttpResponse.json({
      success: true,
      data: currentSummary,
    });
  }),
];
