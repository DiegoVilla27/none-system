import { Expense } from '../entities/expense.entity.js';
import { FilterExpenseDto } from '../dtos/expense.dto.js';

/** Filtros internos adicionales a los expuestos por la API. */
export type ExpenseQuery = FilterExpenseDto & {
  /** Fecha de registro (createdAt) desde, inclusive. */
  createdFrom?: Date;
  /** Fecha de registro (createdAt) hasta, exclusiva. */
  createdTo?: Date;
  /** Rango de fecha del documento (YYYY-MM-DD, ambos inclusive). */
  fechaFrom?: string;
  fechaTo?: string;
  /** Máximo de resultados (ordenados por fecha del documento descendente). */
  limit?: number;
};

/** Totales de un mes según la fecha del documento. */
export interface MonthAggregate {
  month: string; // YYYY-MM
  count: number;
  total: number;
}

export interface IExpenseRepository {
  create(expense: Expense): Promise<Expense>;
  findById(id: string): Promise<Expense | null>;
  findByImageUrl(imageUrl: string): Promise<Expense | null>;
  findAll(filter?: ExpenseQuery): Promise<Expense[]>;
  /**
   * Posibles duplicados de un usuario: mismo archivo, mismo CUFE o mismo valor total.
   * La decisión final (duplicado seguro o posible) la toma el servicio.
   */
  findDuplicateCandidates(userId: string, criteria: { fileHash?: string | null; cufe?: string | null; total?: number }): Promise<Expense[]>;
  /** Cantidad y total por mes (fecha del documento) de un usuario, del más reciente al más antiguo. */
  aggregateByMonth(userId: string, options?: { year?: number }): Promise<MonthAggregate[]>;
  update(id: string, updates: Partial<Expense>): Promise<Expense | null>;
  delete(id: string): Promise<boolean>;
}
