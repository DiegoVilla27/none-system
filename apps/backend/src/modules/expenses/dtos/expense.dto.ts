import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '../entities/expense.entity.js';

export const expenseItemSchema = z.object({
  descripcion: z.string().min(1, 'La descripción es obligatoria'),
  precio: z.number(),
  cantidad: z.number().optional(),
});

export const updateExpenseSchema = z.object({
  comercio: z.string().min(1, 'El comercio no puede estar vacío').optional(),
  cifNif: z.string().nullable().optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)').optional(),
  subtotal: z.number().nullable().optional(),
  impuestos: z.number().nullable().optional(),
  total: z.number().min(0, 'El total no puede ser negativo').optional(),
  moneda: z.string().length(3).optional(),
  categoria: z.enum(EXPENSE_CATEGORIES).optional(),
  lineasArticulos: z.array(expenseItemSchema).optional(),
  notas: z.string().nullable().optional(),
  estado: z.enum(['borrador', 'confirmado']).optional(),
});

export const filterExpenseSchema = z.object({
  year: z.string().regex(/^\d{4}$/).optional(),
  month: z.string().regex(/^(0?[1-9]|1[0-2])$/).optional(),
  categoria: z.enum(EXPENSE_CATEGORIES).optional(),
  estado: z.enum(['borrador', 'confirmado']).optional(),
  comercio: z.string().optional(),
});

export type UpdateExpenseDto = z.infer<typeof updateExpenseSchema>;
export type FilterExpenseDto = z.infer<typeof filterExpenseSchema>;
