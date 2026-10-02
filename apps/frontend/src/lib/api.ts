import { Expense, DocumentType, MonthlySummary } from '@/types/expense.types';

const API_BASE =
  typeof window === 'undefined'
    ? process.env.INTERNAL_API_URL || 'http://localhost:4000/api/v1'
    : process.env.NEXT_PUBLIC_API_URL || '/api/v1';

/**
 * Parser seguro de respuestas HTTP para evitar errores de sintaxis JSON
 * y transformar errores técnicos en mensajes comprensibles y amigables.
 */
async function parseApiResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  let rawText = '';
  try {
    rawText = await res.text();
  } catch {
    throw new Error('No se pudo establecer conexión con el servidor. Revisa tu conexión.');
  }

  let json: { success?: boolean; data?: T; error?: { message?: string; code?: string } } | null = null;
  if (rawText) {
    try {
      json = JSON.parse(rawText);
    } catch {
      // Respuestas que no son JSON (ej: páginas de error 502/503/500 de proxy o gateway)
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        throw new Error(
          'El servicio de análisis inteligente está experimentando alta demanda momentánea. Por favor espera unos segundos y vuelve a intentar.'
        );
      }
      if (res.status >= 500) {
        throw new Error(
          'Ocurrió un inconveniente temporal en el servidor de procesamiento. Por favor intenta de nuevo en un momento.'
        );
      }
      throw new Error(fallbackMessage);
    }
  }

  if (!res.ok || !json?.success) {
    const rawMsg = json?.error?.message || fallbackMessage;

    // Normalización de mensajes técnicos a lenguaje amigable
    if (
      rawMsg.includes('varios intentos') ||
      rawMsg.includes('503') ||
      rawMsg.includes('502') ||
      rawMsg.includes('high demand')
    ) {
      throw new Error(
        'El servicio de lectura inteligente está experimentando congestión temporal. Por favor espera unos segundos y reintenta.'
      );
    }

    if (rawMsg.includes('tamaño') || rawMsg.includes('5 MB') || rawMsg.includes('FILE_TOO_LARGE')) {
      throw new Error(
        'El archivo supera el tamaño máximo permitido de 5 MB. Por favor sube una imagen o PDF más ligero.'
      );
    }

    throw new Error(rawMsg);
  }

  return json.data as T;
}

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
 * Escanea un archivo de comprobante o factura con IA en el backend.
 */
export async function scanExpense(file: File, tipo: DocumentType): Promise<Expense> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('tipo', tipo);

  const res = await fetch(`${API_BASE}/expenses/scan`, {
    method: 'POST',
    body: formData,
  });

  return parseApiResponse<Expense>(
    res,
    'No se pudo procesar el comprobante. Por favor verifica que la imagen sea legible y vuelve a intentarlo.'
  );
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

  return parseApiResponse<Expense[]>(res, 'Error al obtener la lista de comprobantes.');
}

/**
 * Obtiene el detalle de un gasto específico por su ID.
 */
export async function getExpenseById(id: string): Promise<Expense> {
  const res = await fetch(`${API_BASE}/expenses/${encodeURIComponent(id)}`, {
    cache: 'no-store',
  });

  return parseApiResponse<Expense>(res, `El comprobante con ID ${id} no fue encontrado.`);
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

  return parseApiResponse<Expense>(res, 'Error al guardar los cambios en el comprobante.');
}

/**
 * Elimina un gasto del sistema.
 */
export async function deleteExpense(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/expenses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

  await parseApiResponse<{ message: string }>(res, 'Error al eliminar el comprobante.');
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

  return parseApiResponse<MonthlySummary>(res, 'Error al obtener el resumen contable del mes.');
}
