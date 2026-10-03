import { Expense, DocumentType, ScanDocumentType, MonthlySummary, ManualExpenseInput } from '@/types/expense.types';

const API_BASE =
  typeof window === 'undefined'
    ? process.env.INTERNAL_API_URL || 'http://localhost:4000/api/v1'
    : process.env.NEXT_PUBLIC_API_URL || '/api/v1';

/*
 * La sesión viaja en una cookie HttpOnly emitida por el backend (no accesible desde JavaScript).
 * Las peticiones van al mismo origen (proxy de Next.js), por lo que el navegador la adjunta solo.
 */

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

  let json: { success?: boolean; status?: string; data?: T; message?: string; error?: { message?: string; code?: string } } | null = null;
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

  const isSuccess = res.ok && (json?.success === true || json?.status === 'success' || !json?.error);

  if (!isSuccess) {
    const rawMsg = json?.error?.message || json?.message || fallbackMessage;

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

  return (json?.data !== undefined ? json.data : json) as T;
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
  if (expense.nit !== undefined) allowed.nit = expense.nit;
  if (expense.numeroReferencia !== undefined) allowed.numeroReferencia = expense.numeroReferencia;
  if (expense.cufe !== undefined) allowed.cufe = expense.cufe;
  if (expense.fecha !== undefined) allowed.fecha = expense.fecha;
  if (expense.subtotal !== undefined) allowed.subtotal = expense.subtotal;
  if (expense.baseGravable !== undefined) allowed.baseGravable = expense.baseGravable;
  if (expense.impuestos !== undefined) allowed.impuestos = expense.impuestos;
  if (expense.iva !== undefined) allowed.iva = expense.iva;
  if (expense.impoconsumo !== undefined) allowed.impoconsumo = expense.impoconsumo;
  if (expense.total !== undefined) allowed.total = expense.total;
  if (expense.categoria !== undefined) allowed.categoria = expense.categoria;
  if (expense.lineasArticulos !== undefined) allowed.lineasArticulos = expense.lineasArticulos;
  if (expense.notas !== undefined) allowed.notas = expense.notas;
  if (expense.estado !== undefined) allowed.estado = expense.estado;
  if (expense.isDianCompliant !== undefined) allowed.isDianCompliant = expense.isDianCompliant;

  return allowed;
}

/**
 * Escanea un archivo de comprobante o factura con IA en el backend.
 */
export interface ScanWarning {
  code: 'POSSIBLE_DUPLICATE';
  message: string;
  existingExpenseId: string;
}

/**
 * Escanea un comprobante y devuelve también el aviso de posible duplicado, si lo hay.
 * Un duplicado exacto (mismo archivo, CUFE o referencia) se rechaza con un error explicativo.
 */
export async function scanExpenseWithWarning(
  file: File,
  tipo: ScanDocumentType
): Promise<{ expense: Expense; warning?: ScanWarning }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('tipo', tipo);

  const res = await fetch(`${API_BASE}/expenses/scan`, {
    method: 'POST',
    body: formData,
  });

  const raw = (await res.clone().json().catch(() => null)) as { warning?: ScanWarning } | null;
  const expense = await parseApiResponse<Expense>(
    res,
    'No se pudo procesar el comprobante. Por favor verifica que la imagen sea legible y vuelve a intentarlo.'
  );
  return { expense, warning: raw?.warning };
}

export async function scanExpense(file: File, tipo: ScanDocumentType): Promise<Expense> {
  return (await scanExpenseWithWarning(file, tipo)).expense;
}

/**
 * Registra un gasto manual (sin recibo), ej: "Arroz $5.000".
 */
export async function createManualExpense(input: ManualExpenseInput): Promise<Expense> {
  const res = await fetch(`${API_BASE}/expenses/manual`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  return parseApiResponse<Expense>(res, 'No se pudo registrar el gasto.');
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

// ==========================================
// MÓDULO DE AUTENTICACIÓN Y SEGURIDAD (AUTH)
// ==========================================

import type {
  User,
  AuthSession,
  SubscriptionInfo,
  PendingRegistration,
  RegisterInput,
  PlanId,
} from '@/types/auth.types';

const jsonHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
});

export async function loginUser(email: string, password: string): Promise<AuthSession> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ email, password }),
  });
  return parseApiResponse<AuthSession>(res, 'Error al iniciar sesión.');
}

/** Paso 1 del registro: envía un código de verificación al WhatsApp indicado. */
export async function registerUser(data: RegisterInput): Promise<PendingRegistration> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  });
  return parseApiResponse<PendingRegistration>(res, 'Error al registrar usuario.');
}

/** Paso 2 del registro: confirma el código y crea la cuenta. */
export async function confirmRegistration(verificationId: string, code: string): Promise<AuthSession> {
  const res = await fetch(`${API_BASE}/auth/register/confirm`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ verificationId, code }),
  });
  return parseApiResponse<AuthSession>(res, 'No pudimos verificar el código.');
}

export async function verifyEmail(token: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/verify-email`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ token }),
  });
  return parseApiResponse<User>(res, 'Error al verificar correo.');
}

export async function requestPasswordReset(email: string): Promise<{ message: string; devCode?: string }> {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ email }),
  });
  return parseApiResponse<{ message: string; devCode?: string }>(res, 'Error al solicitar recuperación.');
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ email, code, newPassword }),
  });
  return parseApiResponse<{ message: string }>(res, 'Error al restablecer la contraseña.');
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return parseApiResponse<{ message: string }>(res, 'Error al cambiar contraseña.');
}

export async function sendPhoneVerificationCode(): Promise<{ phoneHint: string; devCode?: string }> {
  const res = await fetch(`${API_BASE}/auth/phone/send-code`, {
    method: 'POST',
    headers: jsonHeaders(),
  });
  return parseApiResponse<{ phoneHint: string; devCode?: string }>(res, 'No pudimos enviar el código.');
}

export async function confirmPhoneVerification(code: string): Promise<{ user: User }> {
  const res = await fetch(`${API_BASE}/auth/phone/verify`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ code }),
  });
  return parseApiResponse<{ user: User }>(res, 'No pudimos verificar el código.');
}

export async function logoutUser(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: jsonHeaders() }).catch(() => undefined);
}

/** Cierra la sesión en todos los dispositivos (revoca todos los tokens emitidos). */
export async function logoutEverywhere(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/logout-all`, { method: 'POST', headers: jsonHeaders() });
  await parseApiResponse(res, 'No pudimos cerrar las sesiones.');
}

export async function resendEmailVerification(): Promise<{ message: string; devEmailVerificationToken?: string }> {
  const res = await fetch(`${API_BASE}/auth/email/resend`, { method: 'POST', headers: jsonHeaders() });
  return parseApiResponse(res, 'No pudimos enviar el correo de verificación.');
}

/** Elimina definitivamente la cuenta y todos sus datos (derecho de supresión). */
export async function deleteAccount(password: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: 'DELETE',
    headers: jsonHeaders(),
    body: JSON.stringify({ password }),
  });
  return parseApiResponse<{ message: string }>(res, 'No pudimos eliminar la cuenta.');
}

export async function getCurrentUser(): Promise<{ user: User; subscription: SubscriptionInfo | null }> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    cache: 'no-store',
  });
  return parseApiResponse<{ user: User; subscription: SubscriptionInfo | null }>(res, 'Error al obtener perfil.');
}

// ==========================================
// PLANES Y PAGOS
// ==========================================

export interface PlanOption {
  id: PlanId;
  name: string;
  monthlyLimit: number;
  priceCOP: number;
  description: string;
}

export type PaymentMode = 'wompi' | 'simulated' | 'disabled';

export async function getPlans(): Promise<{
  plans: PlanOption[];
  paymentMode: PaymentMode;
  onlinePaymentsEnabled: boolean;
  simulatedPayments: boolean;
}> {
  const res = await fetch(`${API_BASE}/subscriptions/plans`, { cache: 'no-store' });
  return parseApiResponse(res, 'No pudimos cargar los planes.');
}

export type CheckoutResponse =
  | { mode: 'wompi'; checkoutUrl: string; reference: string; simulated: false }
  | { mode: 'simulated'; reference: string; subscription: SubscriptionInfo; simulated: true };

/** Inicia la compra: con Wompi devuelve la URL del checkout seguro; en modo de prueba activa el plan. */
export async function checkoutPlan(plan: Exclude<PlanId, 'gratuito'>): Promise<CheckoutResponse> {
  const res = await fetch(`${API_BASE}/subscriptions/checkout`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ plan }),
  });
  return parseApiResponse(res, 'No pudimos iniciar el pago.');
}

export interface PaymentInfo {
  reference: string;
  plan: PlanId;
  amountCop: number;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR' | 'SIMULATED';
  paymentMethod: string | null;
  paidAt: string | null;
  planApplied: boolean;
}

/** Concilia con Wompi la transacción indicada al volver del checkout. */
export async function confirmWompiPayment(transactionId: string): Promise<PaymentInfo> {
  const res = await fetch(`${API_BASE}/payments/wompi/confirm?id=${encodeURIComponent(transactionId)}`, {
    cache: 'no-store',
  });
  return parseApiResponse(res, 'No pudimos confirmar el pago.');
}
