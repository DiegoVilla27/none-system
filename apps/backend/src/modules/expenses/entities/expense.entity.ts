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

export type DocumentType = 'factura' | 'transferencia';
export type ExtractionConfidence = 'alta' | 'media' | 'baja';
export type ExpenseStatus = 'borrador' | 'confirmado';

export interface ExpenseItem {
  descripcion: string;
  precio: number;
  cantidad?: number | null;
}

export interface Expense {
  id: string;
  userId?: string;
  tipoDocumento: DocumentType;
  comercio: string; // En factura: comercio/proveedor. En transferencia: beneficiario/convenio.
  entidadFinanciera?: string | null; // Banco, Wompi, Nequi, Daviplata, Redeban, etc.
  cifNif?: string | null; // NIT o cédula en Colombia
  numeroReferencia?: string | null; // No. de factura electrónica, referencia de recaudo, comprobante
  fecha: string; // Formato YYYY-MM-DD
  subtotal?: number | null;
  impuestos?: number | null; // IVA en Colombia
  total: number; // Valor en Pesos Colombianos (COP)
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
