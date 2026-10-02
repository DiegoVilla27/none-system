import { PrismaClient } from '@prisma/client';
import { Expense, ExpenseCategory, ExtractionConfidence, ExpenseStatus, DocumentType } from '../entities/expense.entity.js';
import { FilterExpenseDto } from '../dtos/expense.dto.js';
import { IExpenseRepository } from './expense.repository.interface.js';

export class PrismaExpenseRepository implements IExpenseRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapToEntity(record: any): Expense {
    return {
      id: record.id,
      userId: record.userId || undefined,
      tipoDocumento: record.tipoDocumento as DocumentType,
      comercio: record.comercio,
      entidadFinanciera: record.entidadFinanciera,
      cifNif: record.cifNif,
      nit: record.nit,
      numeroReferencia: record.numeroReferencia,
      cufe: record.cufe,
      fecha: record.fecha,
      subtotal: record.subtotal,
      baseGravable: record.baseGravable,
      impuestos: record.impuestos,
      iva: record.iva,
      impoconsumo: record.impoconsumo,
      total: record.total,
      moneda: 'COP',
      categoria: record.categoria as ExpenseCategory,
      lineasArticulos: Array.isArray(record.lineasArticulos) ? record.lineasArticulos : [],
      confianzaExtraccion: record.confianzaExtraccion as ExtractionConfidence,
      notas: record.notas,
      imageUrl: record.imageUrl,
      imageOriginalName: record.imageOriginalName,
      estado: record.estado as ExpenseStatus,
      isDianCompliant: record.isDianCompliant,
      encryptedAtRest: record.encryptedAtRest,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  async create(expense: Expense): Promise<Expense> {
    const created = await this.prisma.expense.create({
      data: {
        id: expense.id,
        userId: expense.userId || null,
        tipoDocumento: expense.tipoDocumento,
        comercio: expense.comercio,
        entidadFinanciera: expense.entidadFinanciera || null,
        cifNif: expense.cifNif || null,
        nit: expense.nit || null,
        numeroReferencia: expense.numeroReferencia || null,
        cufe: expense.cufe || null,
        fecha: expense.fecha,
        subtotal: expense.subtotal ?? null,
        baseGravable: expense.baseGravable ?? null,
        impuestos: expense.impuestos ?? null,
        iva: expense.iva ?? null,
        impoconsumo: expense.impoconsumo ?? null,
        total: expense.total,
        moneda: expense.moneda,
        categoria: expense.categoria,
        lineasArticulos: expense.lineasArticulos as any,
        confianzaExtraccion: expense.confianzaExtraccion,
        notas: expense.notas || null,
        imageUrl: expense.imageUrl,
        imageOriginalName: expense.imageOriginalName,
        estado: expense.estado,
        isDianCompliant: expense.isDianCompliant || false,
        encryptedAtRest: expense.encryptedAtRest || true,
      },
    });

    return this.mapToEntity(created);
  }

  async findById(id: string): Promise<Expense | null> {
    const record = await this.prisma.expense.findUnique({
      where: { id },
    });
    return record ? this.mapToEntity(record) : null;
  }

  async findAll(filter?: FilterExpenseDto): Promise<Expense[]> {
    const where: any = {};

    if (filter) {
      if (filter.userId) {
        where.OR = [
          { userId: filter.userId },
          { userId: null }, // Comprobantes públicos o globales
        ];
      }
      if (filter.tipoDocumento) {
        where.tipoDocumento = filter.tipoDocumento;
      }
      if (filter.categoria) {
        where.categoria = filter.categoria;
      }
      if (filter.estado) {
        where.estado = filter.estado;
      }
      if (filter.comercio) {
        where.comercio = {
          contains: filter.comercio,
          mode: 'insensitive',
        };
      }
      if (filter.year) {
        where.fecha = {
          startsWith: filter.year,
        };
      }
      if (filter.month && filter.year) {
        const paddedMonth = filter.month.padStart(2, '0');
        where.fecha = {
          startsWith: `${filter.year}-${paddedMonth}`,
        };
      }
    }

    const records = await this.prisma.expense.findMany({
      where,
      orderBy: {
        fecha: 'desc',
      },
    });

    return records.map((r) => this.mapToEntity(r));
  }

  async update(id: string, updates: Partial<Expense>): Promise<Expense | null> {
    const data: any = { ...updates };

    if (updates.lineasArticulos) {
      data.lineasArticulos = updates.lineasArticulos as any;
    }

    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;

    try {
      const updated = await this.prisma.expense.update({
        where: { id },
        data,
      });

      return this.mapToEntity(updated);
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.expense.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }
}
