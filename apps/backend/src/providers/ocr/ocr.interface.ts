import {
  ExpenseCategory,
  ExtractionConfidence,
  ExpenseItem,
  DocumentType,
} from '../../modules/expenses/entities/expense.entity.js';

export interface ExtractedReceiptData {
  tipoDocumento: DocumentType;
  comercio: string; // Beneficiario o Comercio
  entidadFinanciera?: string | null;
  cifNif?: string | null; // NIT de emisor o convenio
  nit?: string | null; // NIT formateado con DV (ej: 890.900.608-9)
  numeroReferencia?: string | null; // Factura electrónica o Ref. de pago
  cufe?: string | null; // Código Único de Factura Electrónica (DIAN)
  fecha: string; // YYYY-MM-DD
  subtotal?: number | null;
  baseGravable?: number | null; // Base imponible en COP
  impuestos?: number | null; // Total impuestos
  iva?: number | null; // IVA (19% o 5%)
  impoconsumo?: number | null; // Impuesto Nacional al Consumo (8%)
  total: number; // Monto en COP
  moneda: 'COP';
  categoria: ExpenseCategory;
  lineasArticulos: ExpenseItem[];
  confianzaExtraccion: ExtractionConfidence;
  notas?: string | null;
  isDianCompliant?: boolean;
}

export type RequestedScanType = 'factura' | 'transferencia' | 'auto';

export interface IOcrExtractor {
  extractFromBuffer(
    buffer: Buffer,
    mimeType: string,
    requestedType?: RequestedScanType
  ): Promise<ExtractedReceiptData>;
}
