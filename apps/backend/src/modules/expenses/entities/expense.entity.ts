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
  imageUrl: string;
  imageOriginalName: string;
  estado: ExpenseStatus;
  isDianCompliant?: boolean; // Valida requisitos formales de deducción DIAN (Art. 771-2 E.T.)
  encryptedAtRest?: boolean; // Constancia de cifrado bancario AES-256 (Habeas Data Ley 1581)
  createdAt: string;
  updatedAt: string;
}
