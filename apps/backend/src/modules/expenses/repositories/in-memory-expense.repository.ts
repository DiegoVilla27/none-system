import { Expense } from '../entities/expense.entity.js';
import { FilterExpenseDto } from '../dtos/expense.dto.js';
import { IExpenseRepository } from './expense.repository.interface.js';

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

  async findAll(filter?: FilterExpenseDto): Promise<Expense[]> {
    let list = Array.from(this.expenses.values());

    if (filter) {
      if (filter.userId) {
        list = list.filter((e) => !e.userId || e.userId === filter.userId);
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
