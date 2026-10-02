import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '../entities/expense.entity.js';

export const scanExpenseOptionsSchema = z.object({
  tipo: z.enum(['factura', 'transferencia', 'auto']).default('auto').optional(),
});

export const expenseItemSchema = z.object({
  descripcion: z.string().min(1, 'La descripción es obligatoria'),
  precio: z.number(),
  cantidad: z.number().nullable().optional(),
});

export const updateExpenseSchema = z.object({
  tipoDocumento: z.enum(['factura', 'transferencia']).optional(),
  comercio: z.string().min(1, 'El comercio/beneficiario no puede estar vacío').optional(),
  entidadFinanciera: z.string().nullable().optional(),
  cifNif: z.string().nullable().optional(), // NIT en Colombia
  nit: z.string().nullable().optional(), // NIT con DV
  numeroReferencia: z.string().nullable().optional(),
  cufe: z.string().nullable().optional(), // CUFE DIAN
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)').optional(),
  subtotal: z.number().nullable().optional(),
  baseGravable: z.number().nullable().optional(),
  impuestos: z.number().nullable().optional(), // Total impuestos
  iva: z.number().nullable().optional(), // IVA 19% o 5%
  impoconsumo: z.number().nullable().optional(), // INC 8%
  total: z.number().min(0, 'El total no puede ser negativo').optional(),
  categoria: z.enum(EXPENSE_CATEGORIES).optional(),
  lineasArticulos: z.array(expenseItemSchema).optional(),
  notas: z.string().nullable().optional(),
  estado: z.enum(['borrador', 'confirmado']).optional(),
  isDianCompliant: z.boolean().optional(),
});

export const filterExpenseSchema = z.object({
  userId: z.string().optional(),
  year: z.string().regex(/^\d{4}$/).optional(),
  month: z.string().regex(/^(0?[1-9]|1[0-2])$/).optional(),
  tipoDocumento: z.enum(['factura', 'transferencia']).optional(),
  categoria: z.enum(EXPENSE_CATEGORIES).optional(),
  estado: z.enum(['borrador', 'confirmado']).optional(),
  comercio: z.string().optional(),
});

export type ScanExpenseOptionsDto = z.infer<typeof scanExpenseOptionsSchema>;
export type UpdateExpenseDto = z.infer<typeof updateExpenseSchema>;
export type FilterExpenseDto = z.infer<typeof filterExpenseSchema>;
