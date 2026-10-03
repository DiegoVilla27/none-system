import { PrismaClient, Prisma } from '@prisma/client';
import {
  Expense,
  ExpenseCategory,
  ExtractionConfidence,
  ExpenseStatus,
  DocumentType,
  ExpenseItem,
  ExpenseSource,
} from '../entities/expense.entity.js';
import { IExpenseRepository, ExpenseQuery, MonthAggregate } from './expense.repository.interface.js';

export class PrismaExpenseRepository implements IExpenseRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapToEntity(record: Prisma.ExpenseGetPayload<object>): Expense {
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
      lineasArticulos: Array.isArray(record.lineItems) ? (record.lineItems as unknown as ExpenseItem[]) : [],
      confianzaExtraccion: record.extractionConfidence as ExtractionConfidence,
      notas: record.notes,
      imageUrl: record.imageUrl,
      imageOriginalName: record.imageOriginalName,
      source: record.source as ExpenseSource,
      fileHash: record.fileHash,
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
        lineItems: expense.lineasArticulos as unknown as Prisma.InputJsonValue,
        extractionConfidence: expense.confianzaExtraccion,
        notes: expense.notas || null,
        imageUrl: expense.imageUrl ?? null,
        imageOriginalName: expense.imageOriginalName ?? null,
        source: expense.source ?? 'web',
        fileHash: expense.fileHash ?? null,
        status: expense.estado,
        isDianCompliant: expense.isDianCompliant ?? false,
        encryptedAtRest: expense.encryptedAtRest ?? false,
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

  async findByImageUrl(imageUrl: string): Promise<Expense | null> {
    const record = await this.prisma.expense.findFirst({ where: { imageUrl } });
    return record ? this.mapToEntity(record) : null;
  }

  async findAll(filter?: ExpenseQuery): Promise<Expense[]> {
    const where: Prisma.ExpenseWhereInput = {};

    if (filter) {
      if (filter.userId) {
        where.userId = filter.userId;
      }
      if (filter.fechaFrom || filter.fechaTo) {
        where.expenseDate = {
          ...(filter.fechaFrom ? { gte: filter.fechaFrom } : {}),
          ...(filter.fechaTo ? { lte: filter.fechaTo } : {}),
        };
      }
      if (filter.createdFrom || filter.createdTo) {
        where.createdAt = {
          ...(filter.createdFrom ? { gte: filter.createdFrom } : {}),
          ...(filter.createdTo ? { lt: filter.createdTo } : {}),
        };
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
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
      ...(filter?.limit ? { take: filter.limit } : {}),
    });

    return records.map((r) => this.mapToEntity(r));
  }

  async findDuplicateCandidates(
    userId: string,
    criteria: { fileHash?: string | null; cufe?: string | null; total?: number }
  ): Promise<Expense[]> {
    const or: Prisma.ExpenseWhereInput[] = [];
    if (criteria.fileHash) or.push({ fileHash: criteria.fileHash });
    if (criteria.cufe) or.push({ cufe: criteria.cufe });
    if (criteria.total !== undefined) or.push({ total: criteria.total });
    if (or.length === 0) return [];
    const records = await this.prisma.expense.findMany({
      where: { userId, OR: or },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return records.map((r) => this.mapToEntity(r));
  }

  async aggregateByMonth(userId: string, options: { year?: number } = {}): Promise<MonthAggregate[]> {
    const yearPrefix = options.year ? `${options.year}-%` : '%';
    const rows = await this.prisma.$queryRaw<Array<{ month: string; count: number; total: number }>>`
      SELECT substring("expense_date", 1, 7) AS month, count(*)::int AS count, COALESCE(sum("total"), 0)::float AS total
      FROM "expenses"
      WHERE "user_id" = ${userId} AND "expense_date" LIKE ${yearPrefix}
      GROUP BY 1
      ORDER BY 1 DESC`;
    return rows.map((r) => ({ month: r.month, count: Number(r.count), total: Number(r.total) }));
  }

  async update(id: string, updates: Partial<Expense>): Promise<Expense | null> {
    const data: Prisma.ExpenseUpdateInput = {};

    if (updates.tipoDocumento !== undefined) data.documentType = updates.tipoDocumento;
    if (updates.comercio !== undefined) data.merchant = updates.comercio;
    if (updates.entidadFinanciera !== undefined) data.financialEntity = updates.entidadFinanciera;
    if (updates.nit !== undefined) data.taxId = updates.nit;
    else if (updates.cifNif !== undefined) data.taxId = updates.cifNif;
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
    if (updates.lineasArticulos !== undefined) data.lineItems = updates.lineasArticulos as unknown as Prisma.InputJsonValue;
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
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') return null;
      throw err;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.expense.delete({
        where: { id },
      });
      return true;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') return false;
      throw err;
    }
  }
}
