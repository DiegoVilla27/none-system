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
  numeroReferencia?: string | null; // No. de factura electrónica o referencia de recaudo
  fecha: string; // Formato YYYY-MM-DD
  subtotal?: number | null;
  impuestos?: number | null; // IVA (19%, 5%, etc.)
  total: number; // Monto en Pesos Colombianos (COP)
  moneda: 'COP';
  categoria: ExpenseCategory;
  lineasArticulos: ExpenseItem[];
  confianzaExtraccion: ExtractionConfidence;
  notas?: string | null;
  imageUrl: string;
  imageOriginalName: string;
  estado: ExpenseStatus;
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
  presupuesto?: number;
  porcentajePresupuesto?: number;
  categorias: CategorySummary[];
  numGastos: number;
}
