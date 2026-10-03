import { Expense } from '../entities/expense.entity.js';
import { IExpenseRepository, ExpenseQuery, MonthAggregate } from './expense.repository.interface.js';

export class InMemoryExpenseRepository implements IExpenseRepository {
  private expenses: Map<string, Expense> = new Map();

  async create(expense: Expense): Promise<Expense> {
    this.expenses.set(expense.id, { ...expense });
    return { ...expense };
  }

  async findById(id: string): Promise<Expense | null> {
    const expense = this.expenses.get(id);
    return expense ? { ...expense } : null;
  }

  async findByImageUrl(imageUrl: string): Promise<Expense | null> {
    for (const e of this.expenses.values()) {
      if (e.imageUrl === imageUrl) return { ...e };
    }
    return null;
  }

  async findAll(filter?: ExpenseQuery): Promise<Expense[]> {
    let list = Array.from(this.expenses.values());

    if (filter) {
      if (filter.userId) {
        list = list.filter((e) => e.userId === filter.userId);
      }
      if (filter.fechaFrom) {
        list = list.filter((e) => e.fecha >= filter.fechaFrom!);
      }
      if (filter.fechaTo) {
        list = list.filter((e) => e.fecha <= filter.fechaTo!);
      }
      if (filter.createdFrom) {
        list = list.filter((e) => new Date(e.createdAt) >= filter.createdFrom!);
      }
      if (filter.createdTo) {
        list = list.filter((e) => new Date(e.createdAt) < filter.createdTo!);
      }
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
      if (filter.month && filter.year) {
        const paddedMonth = filter.month.padStart(2, '0');
        list = list.filter((e) => {
          const parts = e.fecha.split('-');
          return parts[1] === paddedMonth;
        });
      }
    }

    // Ordenar de más reciente a más antiguo
    const sorted = list
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.createdAt.localeCompare(a.createdAt))
      .map((e) => ({ ...e }));
    return filter?.limit ? sorted.slice(0, filter.limit) : sorted;
  }

  async findDuplicateCandidates(
    userId: string,
    criteria: { fileHash?: string | null; cufe?: string | null; total?: number }
  ): Promise<Expense[]> {
    return [...this.expenses.values()]
      .filter(
        (e) =>
          e.userId === userId &&
          ((criteria.fileHash && e.fileHash === criteria.fileHash) ||
            (criteria.cufe && e.cufe === criteria.cufe) ||
            (criteria.total !== undefined && e.total === criteria.total))
      )
      .slice(0, 50)
      .map((e) => ({ ...e }));
  }

  async aggregateByMonth(userId: string, options: { year?: number } = {}): Promise<MonthAggregate[]> {
    const byMonth = new Map<string, MonthAggregate>();
    for (const e of this.expenses.values()) {
      if (e.userId !== userId) continue;
      if (options.year && !e.fecha.startsWith(`${options.year}-`)) continue;
      const month = e.fecha.slice(0, 7);
      const agg = byMonth.get(month) ?? { month, count: 0, total: 0 };
      agg.count += 1;
      agg.total += e.total;
      byMonth.set(month, agg);
    }
    return [...byMonth.values()].sort((a, b) => b.month.localeCompare(a.month));
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
