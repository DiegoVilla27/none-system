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
      tipoDocumento: record.documentType as DocumentType,
      comercio: record.merchant,
      entidadFinanciera: record.financialEntity,
      cifNif: record.taxId,
      nit: record.taxId,
      numeroReferencia: record.referenceNumber,
      cufe: record.cufe,
      fecha: record.expenseDate,
      subtotal: record.subtotal,
      baseGravable: record.taxableBase,
      impuestos: record.taxAmount,
      iva: record.vat,
      impoconsumo: record.consumptionTax,
      total: record.total,
      moneda: 'COP',
      categoria: record.category as ExpenseCategory,
      lineasArticulos: Array.isArray(record.lineItems) ? record.lineItems : [],
      confianzaExtraccion: record.extractionConfidence as ExtractionConfidence,
      notas: record.notes,
      imageUrl: record.imageUrl,
      imageOriginalName: record.imageOriginalName,
      estado: record.status as ExpenseStatus,
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
        documentType: expense.tipoDocumento,
        merchant: expense.comercio,
        financialEntity: expense.entidadFinanciera || null,
        taxId: expense.nit || expense.cifNif || null,
        referenceNumber: expense.numeroReferencia || null,
        cufe: expense.cufe || null,
        expenseDate: expense.fecha,
        subtotal: expense.subtotal ?? null,
        taxableBase: expense.baseGravable ?? null,
        taxAmount: expense.impuestos ?? null,
        vat: expense.iva ?? null,
        consumptionTax: expense.impoconsumo ?? null,
        total: expense.total,
        currency: expense.moneda,
        category: expense.categoria,
        lineItems: expense.lineasArticulos as any,
        extractionConfidence: expense.confianzaExtraccion,
        notes: expense.notas || null,
        imageUrl: expense.imageUrl,
        imageOriginalName: expense.imageOriginalName,
        status: expense.estado,
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
          { userId: null }, // Comprobantes globales o públicos
        ];
      }
      if (filter.tipoDocumento) {
        where.documentType = filter.tipoDocumento;
      }
      if (filter.categoria) {
        where.category = filter.categoria;
      }
      if (filter.estado) {
        where.status = filter.estado;
      }
      if (filter.comercio) {
        where.merchant = {
          contains: filter.comercio,
          mode: 'insensitive',
        };
      }
      if (filter.year) {
        where.expenseDate = {
          startsWith: filter.year,
        };
      }
      if (filter.month && filter.year) {
        const paddedMonth = filter.month.padStart(2, '0');
        where.expenseDate = {
          startsWith: `${filter.year}-${paddedMonth}`,
        };
      }
    }

    const records = await this.prisma.expense.findMany({
      where,
      orderBy: {
        expenseDate: 'desc',
      },
    });

    return records.map((r) => this.mapToEntity(r));
  }

  async update(id: string, updates: Partial<Expense>): Promise<Expense | null> {
    const data: any = {};

    if (updates.tipoDocumento !== undefined) data.documentType = updates.tipoDocumento;
    if (updates.comercio !== undefined) data.merchant = updates.comercio;
    if (updates.entidadFinanciera !== undefined) data.financialEntity = updates.entidadFinanciera;
    if (updates.nit !== undefined) data.taxId = updates.nit;
    if (updates.numeroReferencia !== undefined) data.referenceNumber = updates.numeroReferencia;
    if (updates.cufe !== undefined) data.cufe = updates.cufe;
    if (updates.fecha !== undefined) data.expenseDate = updates.fecha;
    if (updates.subtotal !== undefined) data.subtotal = updates.subtotal;
    if (updates.baseGravable !== undefined) data.taxableBase = updates.baseGravable;
    if (updates.impuestos !== undefined) data.taxAmount = updates.impuestos;
    if (updates.iva !== undefined) data.vat = updates.iva;
    if (updates.impoconsumo !== undefined) data.consumptionTax = updates.impoconsumo;
    if (updates.total !== undefined) data.total = updates.total;
    if (updates.categoria !== undefined) data.category = updates.categoria;
    if (updates.lineasArticulos !== undefined) data.lineItems = updates.lineasArticulos as any;
    if (updates.confianzaExtraccion !== undefined) data.extractionConfidence = updates.confianzaExtraccion;
    if (updates.notas !== undefined) data.notes = updates.notas;
    if (updates.imageUrl !== undefined) data.imageUrl = updates.imageUrl;
    if (updates.imageOriginalName !== undefined) data.imageOriginalName = updates.imageOriginalName;
    if (updates.estado !== undefined) data.status = updates.estado;
    if (updates.isDianCompliant !== undefined) data.isDianCompliant = updates.isDianCompliant;

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
