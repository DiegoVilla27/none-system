import { z } from 'zod';
import { EXPENSE_CATEGORIES, DOCUMENT_TYPES } from '../entities/expense.entity.js';
import { isValidIsoDate } from '../../../core/utils/dates.js';

const MAX_AMOUNT = 10_000_000_000; // 10 mil millones COP

const isoDate = z.string().refine(isValidIsoDate, 'Formato de fecha inválido (YYYY-MM-DD)');
const amount = z.number().finite().min(0, 'El valor no puede ser negativo').max(MAX_AMOUNT, 'Valor demasiado alto');
const shortText = (max: number) => z.string().trim().max(max);

export const scanExpenseOptionsSchema = z.object({
  tipo: z.enum(['factura', 'transferencia', 'auto']).default('auto').optional(),
});

export const expenseItemSchema = z.object({
  descripcion: shortText(300).min(1, 'La descripción es obligatoria'),
  precio: z.number().finite().min(-MAX_AMOUNT).max(MAX_AMOUNT),
  cantidad: z.number().finite().min(0).max(1_000_000).nullable().optional(),
});

export const updateExpenseSchema = z.object({
  tipoDocumento: z.enum(DOCUMENT_TYPES).optional(),
  comercio: shortText(200).min(1, 'El comercio/beneficiario no puede estar vacío').optional(),
  entidadFinanciera: shortText(200).nullable().optional(),
  cifNif: shortText(40).nullable().optional(), // NIT en Colombia
  nit: shortText(40).nullable().optional(), // NIT con DV
  numeroReferencia: shortText(120).nullable().optional(),
  cufe: shortText(200).nullable().optional(), // CUFE DIAN
  fecha: isoDate.optional(),
  subtotal: amount.nullable().optional(),
  baseGravable: amount.nullable().optional(),
  impuestos: amount.nullable().optional(), // Total impuestos
  iva: amount.nullable().optional(), // IVA 19% o 5%
  impoconsumo: amount.nullable().optional(), // INC 8%
  total: amount.optional(),
  categoria: z.enum(EXPENSE_CATEGORIES).optional(),
  lineasArticulos: z.array(expenseItemSchema).max(200).optional(),
  notas: shortText(1000).nullable().optional(),
  estado: z.enum(['borrador', 'confirmado']).optional(),
  isDianCompliant: z.boolean().optional(),
});

export const createManualExpenseSchema = z.object({
  descripcion: shortText(200).min(1, 'Describe el gasto (ej: Arroz)'),
  total: z.number().finite().positive('El valor debe ser mayor a 0').max(MAX_AMOUNT, 'Valor demasiado alto'),
  fecha: isoDate.optional(),
  categoria: z.enum(EXPENSE_CATEGORIES).optional(),
  comercio: shortText(200).nullable().optional(), // Lugar donde se compró (opcional)
  cantidad: z.number().finite().positive().max(1_000_000).nullable().optional(),
  notas: shortText(1000).nullable().optional(),
});

export const filterExpenseSchema = z.object({
  userId: z.string().max(100).optional(),
  year: z.string().regex(/^\d{4}$/).optional(),
  month: z.string().regex(/^(0?[1-9]|1[0-2])$/).optional(),
  tipoDocumento: z.enum(DOCUMENT_TYPES).optional(),
  categoria: z.enum(EXPENSE_CATEGORIES).optional(),
  estado: z.enum(['borrador', 'confirmado']).optional(),
  comercio: z.string().max(200).optional(),
});

export type ScanExpenseOptionsDto = z.infer<typeof scanExpenseOptionsSchema>;
export type UpdateExpenseDto = z.infer<typeof updateExpenseSchema>;
export type CreateManualExpenseDto = z.infer<typeof createManualExpenseSchema>;
export type FilterExpenseDto = z.infer<typeof filterExpenseSchema>;
