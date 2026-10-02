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
  cifNif?: string | null; // NIT
  numeroReferencia?: string | null; // Factura electrónica o Ref. de pago
  fecha: string; // YYYY-MM-DD
  subtotal?: number | null;
  impuestos?: number | null; // IVA
  total: number; // Monto en COP
  moneda: 'COP';
  categoria: ExpenseCategory;
  lineasArticulos: ExpenseItem[];
  confianzaExtraccion: ExtractionConfidence;
  notas?: string | null;
}

export type RequestedScanType = 'factura' | 'transferencia' | 'auto';

export interface IOcrExtractor {
  extractFromBuffer(
    buffer: Buffer,
    mimeType: string,
    requestedType?: RequestedScanType
  ): Promise<ExtractedReceiptData>;
}
