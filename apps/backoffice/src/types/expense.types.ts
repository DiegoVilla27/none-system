/**
 * Categorías oficiales soportadas por el sistema financiero.
 */
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
 * Tipos de documentos financieros admitidos en Colombia.
 */
export type DocumentType = 'factura' | 'transferencia';

/**
 * Nivel de certeza con el que la IA extrajo los datos del documento.
 */
export type ExtractionConfidence = 'alta' | 'media' | 'baja';

/**
 * Estado contable del registro en la plataforma.
 */
export type ExpenseStatus = 'borrador' | 'confirmado';

/**
 * Línea de artículo o producto individual dentro de una factura.
 */
export interface ExpenseItem {
  descripcion: string;
  precio: number;
  cantidad?: number | null;
}

/**
 * Entidad principal que representa un gasto o movimiento financiero en Colombia (COP).
 */
export interface Expense {
  id: string;
  userId?: string;
  tipoDocumento: DocumentType;
  comercio: string; // En factura: Comercio/Proveedor. En transferencia: Beneficiario o Convenio.
  entidadFinanciera?: string | null; // Banco, Wompi, Nequi, Daviplata, etc.
  cifNif?: string | null; // NIT en Colombia
  nit?: string | null; // NIT con Dígito de Verificación (ej: 890.900.608-9)
  numeroReferencia?: string | null; // No. de factura electrónica o referencia de recaudo
  cufe?: string | null; // Código Único de Factura Electrónica (DIAN)
  fecha: string; // Formato YYYY-MM-DD
  subtotal?: number | null;
  baseGravable?: number | null; // Base antes de impuestos (Art. 447 E.T.)
  impuestos?: number | null; // Total de impuestos
  iva?: number | null; // Impuesto sobre las Ventas (IVA 19% o 5%)
  impoconsumo?: number | null; // Impuesto Nacional al Consumo (INC 8%)
  total: number; // Monto en Pesos Colombianos (COP)
  moneda: 'COP';
  categoria: ExpenseCategory;
  lineasArticulos: ExpenseItem[];
  confianzaExtraccion: ExtractionConfidence;
  notas?: string | null;
  imageUrl: string;
  imageOriginalName: string;
  estado: ExpenseStatus;
  isDianCompliant?: boolean; // Cumplimiento de requisitos tributarios DIAN (Art. 771-2 E.T.)
  encryptedAtRest?: boolean; // Cifrado AES-256 (Habeas Data Ley 1581)
  createdAt: string;
  updatedAt: string;
}

/**
 * Resumen de gastos agrupados por categoría.
 */
export interface CategorySummary {
  categoria: ExpenseCategory;
  total: number;
  porcentaje: number;
  numTickets: number;
}

/**
 * Resumen mensual global para visualización y generación de reportes de WhatsApp.
 */
export interface MonthlySummary {
  year: number;
  month: number;
  totalGastado: number;
  totalFacturas: number;
  totalTransferencias: number;
  numFacturas: number;
  numTransferencias: number;
  numGastos: number;
  categorias: CategorySummary[];
}
