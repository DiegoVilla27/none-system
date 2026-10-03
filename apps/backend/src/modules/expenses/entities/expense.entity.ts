export const EXPENSE_CATEGORIES = [
  'Supermercado',
  'Restauración',
  'Transporte',
  'Hogar y Servicios',
  'Tecnología',
  'Salud y Bienestar',
  'Ocio y Viajes',
  'Transferencias y Finanzas',
  'Otros',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/**
 * - factura: factura electrónica, tiquete POS o recibo de compra (con imagen/PDF).
 * - transferencia: comprobante bancario o de pago (con imagen/PDF).
 * - manual: gasto escrito a mano sin soporte documental. Nunca es deducible ante la DIAN.
 */
export const DOCUMENT_TYPES = ['factura', 'transferencia', 'manual'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export type ScannedDocumentType = Exclude<DocumentType, 'manual'>;
export type ExtractionConfidence = 'alta' | 'media' | 'baja';
export type ExpenseStatus = 'borrador' | 'confirmado';
export type ExpenseSource = 'web' | 'whatsapp';

export interface ExpenseItem {
  descripcion: string;
  precio: number;
  cantidad?: number | null;
}

export interface Expense {
  id: string;
  userId?: string;
  tipoDocumento: DocumentType;
  comercio: string; // En factura: comercio/proveedor. En transferencia: beneficiario/convenio. En manual: concepto.
  entidadFinanciera?: string | null; // Banco, Wompi, Nequi, Daviplata, Redeban, etc.
  cifNif?: string | null; // NIT o cédula en Colombia
  nit?: string | null; // NIT formateado con Dígito de Verificación (ej: 890.900.608-9)
  numeroReferencia?: string | null; // No. de factura electrónica, referencia de recaudo, comprobante
  cufe?: string | null; // Código Único de Factura Electrónica (DIAN Colombia)
  fecha: string; // Formato YYYY-MM-DD
  subtotal?: number | null;
  baseGravable?: number | null; // Base antes de impuestos (Art. 447 E.T.)
  impuestos?: number | null; // Total impuestos
  iva?: number | null; // Impuesto sobre las Ventas (IVA 19% o 5%)
  impoconsumo?: number | null; // Impuesto Nacional al Consumo (INC 8% en restaurantes/bares)
  total: number; // Valor en Pesos Colombianos (COP)
  moneda: 'COP';
  categoria: ExpenseCategory;
  lineasArticulos: ExpenseItem[];
  confianzaExtraccion: ExtractionConfidence;
  notas?: string | null;
  imageUrl?: string | null; // null en gastos manuales (sin soporte)
  imageOriginalName?: string | null;
  source?: ExpenseSource;
  /** SHA-256 del archivo original (solo comprobantes con soporte). */
  fileHash?: string | null;
  estado: ExpenseStatus;
  isDianCompliant?: boolean; // Valida requisitos formales de deducción DIAN (Art. 771-2 E.T.)
  encryptedAtRest?: boolean; // El soporte (imagen/PDF) está cifrado con AES-256-GCM
  createdAt: string;
  updatedAt: string;
}

/** Usuario que ejecuta una operación sobre gastos. */
export interface Actor {
  userId: string;
  role: string;
}

export const isAdmin = (actor: Actor): boolean => actor.role === 'admin';
