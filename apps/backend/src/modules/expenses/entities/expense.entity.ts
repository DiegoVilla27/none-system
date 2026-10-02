export const EXPENSE_CATEGORIES = [
  'Supermercado',
  'Restauración',
  'Transporte',
  'Hogar y Servicios',
  'Tecnología',
  'Salud y Bienestar',
  'Ocio y Viajes',
  'Otros',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type ExtractionConfidence = 'alta' | 'media' | 'baja';
export type ExpenseStatus = 'borrador' | 'confirmado';

export interface ExpenseItem {
  descripcion: string;
  precio: number;
  cantidad?: number;
}

export interface Expense {
  id: string;
  userId?: string;
  comercio: string;
  cifNif?: string | null;
  fecha: string; // Formato YYYY-MM-DD
  subtotal?: number | null;
  impuestos?: number | null;
  total: number;
  moneda: string;
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
