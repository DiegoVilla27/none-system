import { Expense, DocumentType, MonthlySummary } from '@/types/expense.types';

const API_BASE =
  typeof window === 'undefined'
    ? process.env.INTERNAL_API_URL || 'http://localhost:4000/api/v1'
    : process.env.NEXT_PUBLIC_API_URL || '/api/v1';

/**
 * Filtra únicamente los campos permitidos por el DTO de actualización del backend.
 */
export function sanitizeUpdateExpenseDto(expense: Partial<Expense>) {
  const allowed: Record<string, unknown> = {};

  if (expense.tipoDocumento !== undefined) allowed.tipoDocumento = expense.tipoDocumento;
  if (expense.comercio !== undefined) allowed.comercio = expense.comercio;
  if (expense.entidadFinanciera !== undefined) allowed.entidadFinanciera = expense.entidadFinanciera;
  if (expense.cifNif !== undefined) allowed.cifNif = expense.cifNif;
  if (expense.numeroReferencia !== undefined) allowed.numeroReferencia = expense.numeroReferencia;
  if (expense.fecha !== undefined) allowed.fecha = expense.fecha;
  if (expense.subtotal !== undefined) allowed.subtotal = expense.subtotal;
  if (expense.impuestos !== undefined) allowed.impuestos = expense.impuestos;
  if (expense.total !== undefined) allowed.total = expense.total;
  if (expense.categoria !== undefined) allowed.categoria = expense.categoria;
  if (expense.lineasArticulos !== undefined) allowed.lineasArticulos = expense.lineasArticulos;
  if (expense.notas !== undefined) allowed.notas = expense.notas;
  if (expense.estado !== undefined) allowed.estado = expense.estado;

  return allowed;
}

/**
 * Escanea un archivo de comprobante o factura con Gemini 3.5 Flash en el backend.
 */
export async function scanExpense(file: File, tipo: DocumentType): Promise<Expense> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('tipo', tipo);

  const res = await fetch(`${API_BASE}/expenses/scan`, {
    method: 'POST',
    body: formData,
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Error al procesar el comprobante con IA');
  }

  return json.data;
}

/**
 * Obtiene la lista de todos los gastos contabilizados desde el backend.
 */
export async function getExpenses(filter?: {
  tipoDocumento?: DocumentType;
  categoria?: string;
  search?: string;
}): Promise<Expense[]> {
  const queryParams = new URLSearchParams();
  if (filter?.tipoDocumento) queryParams.set('tipoDocumento', filter.tipoDocumento);
  if (filter?.categoria) queryParams.set('categoria', filter.categoria);

  const url = `${API_BASE}/expenses${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const res = await fetch(url, {
    cache: 'no-store',
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Error al obtener los gastos');
  }

  return json.data;
}

/**
 * Obtiene el detalle de un gasto específico por su ID.
 */
export async function getExpenseById(id: string): Promise<Expense> {
  const res = await fetch(`${API_BASE}/expenses/${encodeURIComponent(id)}`, {
    cache: 'no-store',
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || `Gasto con ID ${id} no encontrado`);
  }

  return json.data;
}

/**
 * Actualiza los datos de un gasto contable existente.
 */
export async function updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
  const sanitized = sanitizeUpdateExpenseDto(updates);

  const res = await fetch(`${API_BASE}/expenses/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sanitized),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Error al actualizar el gasto');
  }

  return json.data;
}

/**
 * Elimina un gasto del sistema.
 */
export async function deleteExpense(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/expenses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Error al eliminar el gasto');
  }
}

/**
 * Obtiene el resumen mensual consolidado para el panel y WhatsApp.
 */
export async function getMonthlySummary(year?: number, month?: number): Promise<MonthlySummary> {
  const queryParams = new URLSearchParams();
  if (year) queryParams.set('year', String(year));
  if (month) queryParams.set('month', String(month));

  const url = `${API_BASE}/summaries/monthly${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const res = await fetch(url, {
    cache: 'no-store',
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Error al obtener el resumen mensual');
  }

  return json.data;
}
