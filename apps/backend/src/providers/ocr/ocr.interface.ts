import { ExpenseCategory, ExtractionConfidence, ExpenseItem } from '../../modules/expenses/entities/expense.entity.js';

export interface ExtractedReceiptData {
  comercio: string;
  cifNif?: string | null;
  fecha: string; // YYYY-MM-DD
  subtotal?: number | null;
  impuestos?: number | null;
  total: number;
  moneda: string;
  categoria: ExpenseCategory;
  lineasArticulos: ExpenseItem[];
  confianzaExtraccion: ExtractionConfidence;
  notas?: string | null;
}

export interface IOcrExtractor {
  extractFromBuffer(buffer: Buffer, mimeType: string): Promise<ExtractedReceiptData>;
}
