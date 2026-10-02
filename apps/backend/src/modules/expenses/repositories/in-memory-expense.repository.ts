import { Expense } from '../entities/expense.entity.js';
import { FilterExpenseDto } from '../dtos/expense.dto.js';
import { IExpenseRepository } from './expense.repository.interface.js';

export class InMemoryExpenseRepository implements IExpenseRepository {
  private expenses: Map<string, Expense> = new Map([
    [
      'exp-alkomprar-01',
      {
        id: 'exp-alkomprar-01',
        tipoDocumento: 'factura',
        comercio: 'ALKOMPRAR',
        entidadFinanciera: 'REDEBAN CR',
        cifNif: '890900943-1',
        numeroReferencia: 'X9722525757',
        fecha: '2025-10-29',
        subtotal: 4032731,
        impuestos: 766219,
        total: 4798950,
        moneda: 'COP',
        categoria: 'Tecnología',
        lineasArticulos: [
          {
            descripcion: 'TV SAMSUNG 55" 55Q7F+ BarC400',
            precio: 2199900,
            cantidad: 1,
          },
          {
            descripcion: 'L/S SAM CF 11,5Kg WD11T4046B"I',
            precio: 2599050,
            cantidad: 1,
          },
        ],
        confianzaExtraccion: 'alta',
        notas: 'Factura Electrónica de Venta - Alkomprar Armenia',
        imageUrl: '/uploads/sample-alkomprar.jpg',
        imageOriginalName: 'factura-alkomprar.jpg',
        estado: 'confirmado',
        createdAt: '2025-10-29T17:16:20.000Z',
        updatedAt: '2025-10-29T17:16:20.000Z',
      },
    ],
    [
      'exp-wompi-02',
      {
        id: 'exp-wompi-02',
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
          {
            descripcion: 'Recaudo de factura - FUNERARIA SAN VICENT',
            precio: 50000,
            cantidad: 1,
          },
        ],
        confianzaExtraccion: 'alta',
        notas: 'Convenio: 00128, Corresponsal: Districampo Armenia Quico (Aprob: 807611)',
        imageUrl: '/uploads/sample-wompi.png',
        imageOriginalName: 'comprobante-wompi.png',
        estado: 'confirmado',
        createdAt: '2026-09-26T11:29:56.000Z',
        updatedAt: '2026-09-26T11:29:56.000Z',
      },
    ],
    [
      'exp-terpel-03',
      {
        id: 'exp-terpel-03',
        tipoDocumento: 'factura',
        comercio: 'ESTACION TERPEL ARMENIA',
        entidadFinanciera: 'Bancolombia Débito',
        cifNif: '800149695-1',
        numeroReferencia: 'TERP-88412',
        fecha: '2026-10-01',
        subtotal: 100840,
        impuestos: 19160,
        total: 120000,
        moneda: 'COP',
        categoria: 'Transporte',
        lineasArticulos: [
          {
            descripcion: 'Gasolina Corriente - 7.5 Galones',
            precio: 120000,
            cantidad: 1,
          },
        ],
        confianzaExtraccion: 'alta',
        notas: null,
        imageUrl: '/uploads/sample-alkomprar.jpg',
        imageOriginalName: 'recibo-gasolina.jpg',
        estado: 'confirmado',
        createdAt: '2026-10-01T08:30:00.000Z',
        updatedAt: '2026-10-01T08:30:00.000Z',
      },
    ],
    [
      'exp-exito-04',
      {
        id: 'exp-exito-04',
        tipoDocumento: 'factura',
        comercio: 'ÉXITO VECINO',
        entidadFinanciera: 'Nequi',
        cifNif: '890900608-9',
        numeroReferencia: 'EX-992144',
        fecha: '2026-09-28',
        subtotal: 285714,
        impuestos: 54286,
        total: 340000,
        moneda: 'COP',
        categoria: 'Supermercado',
        lineasArticulos: [
          {
            descripcion: 'Mercado Quincenal Víveres y Carnes',
            precio: 340000,
            cantidad: 1,
          },
        ],
        confianzaExtraccion: 'alta',
        notas: null,
        imageUrl: '/uploads/sample-alkomprar.jpg',
        imageOriginalName: 'ticket-exito.jpg',
        estado: 'confirmado',
        createdAt: '2026-09-28T19:45:00.000Z',
        updatedAt: '2026-09-28T19:45:00.000Z',
      },
    ],
  ]);

  async create(expense: Expense): Promise<Expense> {
    this.expenses.set(expense.id, { ...expense });
    return { ...expense };
  }

  async findById(id: string): Promise<Expense | null> {
    const expense = this.expenses.get(id);
    return expense ? { ...expense } : null;
  }

  async findAll(filter?: FilterExpenseDto): Promise<Expense[]> {
    let list = Array.from(this.expenses.values());

    if (filter) {
      if (filter.tipoDocumento) {
        list = list.filter((e) => e.tipoDocumento === filter.tipoDocumento);
      }
      if (filter.categoria) {
        list = list.filter((e) => e.categoria === filter.categoria);
      }
      if (filter.estado) {
        list = list.filter((e) => e.estado === filter.estado);
      }
      if (filter.comercio) {
        const query = filter.comercio.toLowerCase();
        list = list.filter((e) => e.comercio.toLowerCase().includes(query));
      }
      if (filter.year) {
        list = list.filter((e) => e.fecha.startsWith(filter.year!));
      }
      if (filter.month) {
        const paddedMonth = filter.month.padStart(2, '0');
        list = list.filter((e) => {
          const parts = e.fecha.split('-');
          return parts[1] === paddedMonth;
        });
      }
    }

    // Ordenar de más reciente a más antiguo
    return list.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  async update(id: string, updates: Partial<Expense>): Promise<Expense | null> {
    const existing = this.expenses.get(id);
    if (!existing) return null;

    const updated: Expense = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.expenses.set(id, updated);
    return { ...updated };
  }

  async delete(id: string): Promise<boolean> {
    return this.expenses.delete(id);
  }
}
