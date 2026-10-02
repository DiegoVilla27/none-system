import { Expense } from '../entities/expense.entity.js';
import { FilterExpenseDto } from '../dtos/expense.dto.js';

export interface IExpenseRepository {
  create(expense: Expense): Promise<Expense>;
  findById(id: string): Promise<Expense | null>;
  findAll(filter?: FilterExpenseDto): Promise<Expense[]>;
  update(id: string, updates: Partial<Expense>): Promise<Expense | null>;
  delete(id: string): Promise<boolean>;
}
