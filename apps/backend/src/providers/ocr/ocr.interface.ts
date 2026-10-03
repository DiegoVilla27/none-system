import {
  ExpenseCategory,
  ExtractionConfidence,
  ExpenseItem,
  ScannedDocumentType,
} from '../../modules/expenses/entities/expense.entity.js';
import { MessageInterpretation } from '../../modules/expenses/query/expense-query.js';

export interface ExtractedReceiptData {
  tipoDocumento: ScannedDocumentType;
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
  /** La fecha del documento no se pudo leer (o era futura) y se usó la de hoy: requiere revisión. */
  fechaRequiereRevision?: boolean;
}

export type RequestedScanType = 'factura' | 'transferencia' | 'auto';

export interface IOcrExtractor {
  extractFromBuffer(
    buffer: Buffer,
    mimeType: string,
    requestedType?: RequestedScanType
  ): Promise<ExtractedReceiptData>;
}

export interface IMessageInterpreter {
  /**
   * Clasifica un mensaje de texto libre: registrar gasto(s), consultar gastos u otra cosa.
   * Lanza error si la IA no está disponible (el llamador usa el intérprete de respaldo).
   */
  interpretMessage(text: string, today: string): Promise<MessageInterpretation>;
}
