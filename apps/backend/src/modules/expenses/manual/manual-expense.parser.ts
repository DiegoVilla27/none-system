import { EXPENSE_CATEGORIES, ExpenseCategory } from '../entities/expense.entity.js';
import { isValidIsoDate, shiftIsoDate } from '../../../core/utils/dates.js';

/**
 * Borrador de un gasto manual interpretado a partir de texto libre
 * (ej: "arroz 5000", "almuerzo 25 mil", "ayer taxi 12.000").
 */
export interface ManualExpenseDraft {
  descripcion: string;
  monto: number;
  cantidad?: number | null;
  fecha: string; // YYYY-MM-DD
  categoria: ExpenseCategory;
  comercio?: string | null;
}

export const MAX_MANUAL_ITEMS_PER_MESSAGE = 10;
export const MAX_MANUAL_AMOUNT = 1_000_000_000; // Tope de seguridad por gasto escrito

const AMOUNT_WORDS = /\b(mil|millon|millones|luca|lucas|palo|palos|k)\b/;

/** Elimina tildes y pasa a minúsculas. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** ¿El texto parece traer un valor de dinero? */
export function hasAmountHint(text: string): boolean {
  const normalized = normalizeText(text);
  return /\d/.test(normalized) || AMOUNT_WORDS.test(normalized);
}

/**
 * Convierte expresiones de dinero colombianas a número.
 * "5000", "5.000", "$5.000", "12.500,50", "5k", "5 mil", "12mil", "1,5 millones", "20 lucas", "1 palo".
 */
export function parseAmount(raw: string): number | null {
  const text = normalizeText(raw).replace(/\$|cop|pesos?/g, '').trim();
  const match = text.match(/^(\d+(?:[.,]\d+)*)\s*(k|mil|lucas?|millon(?:es)?|palos?)?$/);
  if (!match) return null;

  let numeric = match[1];
  const unit = match[2];

  // Separadores: en Colombia "." es miles y "," decimales.
  const groups = numeric.split(/[.,]/);
  const lastSep = numeric.match(/[.,](?=\d+$)/)?.[0];
  const lastGroup = groups[groups.length - 1];
  if (groups.length > 1 && lastSep === ',' && lastGroup.length !== 3) {
    numeric = numeric.replace(/\./g, '').replace(',', '.');
  } else if (groups.length > 1 && unit && lastGroup.length !== 3) {
    // "1,5 millones" / "2.5k" → decimal
    numeric = numeric.replace(/[.,](?=\d+$)/, '#').replace(/[.,]/g, '').replace('#', '.');
  } else {
    numeric = numeric.replace(/[.,]/g, '');
  }

  let value = Number(numeric);
  if (!Number.isFinite(value)) return null;

  if (unit === 'k' || unit === 'mil' || unit === 'luca' || unit === 'lucas') value *= 1_000;
  if (unit?.startsWith('millon') || unit?.startsWith('palo')) value *= 1_000_000;

  value = Math.round(value * 100) / 100;
  return value > 0 && value <= MAX_MANUAL_AMOUNT ? value : null;
}

const CATEGORY_KEYWORDS: Array<[ExpenseCategory, RegExp]> = [
  ['Restauración', /\b(almuerzos?|desayunos?|cenas?|comidas?|corrientazos?|cafes?|tintos?|restaurantes?|empanadas?|arepas?|hamburguesas?|pizzas?|pollo|domicilios?|rappi|onces|cervezas?|gaseosas?)\b/],
  ['Transporte', /\b(taxi|uber|didi|indriver|cabify|bus|buseta|transmilenio|metro|sitp|gasolina|tanqueo|parqueadero|peaje|pasaje|moto)\b/],
  ['Supermercado', /\b(arroz|leche|pan|huevos?|mercado|aceite|azucar|cafe molido|carne|frutas?|verduras?|papa|platano|tienda|d1|ara|exito|olimpica|jumbo|carulla|frijol(es)?|lentejas?|panela|queso)\b/],
  ['Hogar y Servicios', /\b(arriendo|luz|agua|gas|internet|epm|codensa|enel|administracion|aseo|plan celular|recibo)\b/],
  ['Salud y Bienestar', /\b(drogueria|medicamentos?|farmacia|medico|cita|eps|odontologo|gimnasio|gym|pastillas?)\b/],
  ['Ocio y Viajes', /\b(cine|netflix|spotify|concierto|viaje|hotel|tiquete|vuelo|paseo|rumba|bar)\b/],
  ['Tecnología', /\b(celular|computador|portatil|cargador|audifonos|software|app)\b/],
  ['Transferencias y Finanzas', /\b(prestamo|cuota|tarjeta|banco|nequi|daviplata|transferencia|ahorro)\b/],
];

export function guessCategory(description: string): ExpenseCategory {
  const text = normalizeText(description);
  for (const [category, pattern] of CATEGORY_KEYWORDS) {
    if (pattern.test(text)) return category;
  }
  return 'Otros';
}

function extractRelativeDate(segment: string, today: string): { text: string; fecha: string } {
  let fecha = today;
  let text = segment;
  const rules: Array<[RegExp, number]> = [
    [/\b(antier|anteayer|antes de ayer)\b/, -2],
    [/\bayer\b/, -1],
    [/\bhoy\b/, 0],
  ];
  for (const [pattern, delta] of rules) {
    if (pattern.test(normalizeText(text))) {
      fecha = shiftIsoDate(today, delta);
      text = text.replace(new RegExp(pattern.source, 'i'), ' ');
      break;
    }
  }
  return { text: text.replace(/\s+/g, ' ').trim(), fecha };
}

const AMOUNT_PATTERN = String.raw`\$?\s*\d+(?:[.,]\d+)*\s*(?:k|mil|lucas?|millon(?:es)?|palos?)?(?:\s*(?:cop|pesos?))?`;
const AMOUNT_AT_END = new RegExp(String.raw`^(.*?)[\s:=-]+(${AMOUNT_PATTERN})$`, 'i');
const AMOUNT_AT_START = new RegExp(String.raw`^(${AMOUNT_PATTERN})\s+(?:en\s+|de\s+)?(.+)$`, 'i');

function parseSegment(segment: string, today: string): ManualExpenseDraft | null {
  const { text, fecha } = extractRelativeDate(segment, today);
  const cleaned = text.replace(/^(gaste|gasté|pague|pagué|compre|compré)\s+/i, '').trim();

  let description: string | null = null;
  let amount: number | null = null;

  const end = cleaned.match(AMOUNT_AT_END);
  if (end) {
    description = end[1];
    amount = parseAmount(end[2]);
  }
  if (amount === null) {
    const start = cleaned.match(AMOUNT_AT_START);
    if (start) {
      amount = parseAmount(start[1]);
      description = start[2];
    }
  }
  if (amount === null || !description) return null;

  let cantidad: number | null = null;
  const qty = description.match(/^(\d{1,3})\s+(.+)$/);
  if (qty) {
    cantidad = Number(qty[1]);
    description = qty[2];
  }

  description = description.replace(/^(en|de)\s+/i, '').trim();
  if (!description || !/[a-záéíóúñ]/i.test(description)) return null;

  return {
    descripcion: capitalize(description.slice(0, 200)),
    monto: amount,
    cantidad,
    fecha,
    categoria: guessCategory(description),
    comercio: null,
  };
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Intérprete determinista (sin IA) para los casos comunes. Se usa como respaldo
 * cuando el modelo de IA no está disponible.
 */
export function fallbackParseManualText(text: string, today: string): ManualExpenseDraft[] {
  const segments = text
    .split(/\n|;|,(?!\d{3}\b)|\s+y\s+(?=[^\d]*\d)/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const parsed = segments.map((s) => parseSegment(s, today));
  if (parsed.length > 0 && parsed.every((p) => p !== null)) {
    return (parsed as ManualExpenseDraft[]).slice(0, MAX_MANUAL_ITEMS_PER_MESSAGE);
  }

  const whole = parseSegment(text.replace(/\n/g, ' '), today);
  return whole ? [whole] : [];
}

/**
 * Valida y normaliza los borradores devueltos por la IA. Descarta lo que no sea coherente.
 */
export function sanitizeManualDrafts(raw: unknown, today: string): ManualExpenseDraft[] {
  if (!Array.isArray(raw)) return [];
  const result: ManualExpenseDraft[] = [];

  for (const item of raw.slice(0, MAX_MANUAL_ITEMS_PER_MESSAGE)) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const descripcion = typeof r.descripcion === 'string' ? r.descripcion.trim().slice(0, 200) : '';
    const monto = typeof r.monto === 'number' ? Math.round(r.monto * 100) / 100 : NaN;
    if (!descripcion || !Number.isFinite(monto) || monto <= 0 || monto > MAX_MANUAL_AMOUNT) continue;

    let fecha = isValidIsoDate(r.fecha) ? r.fecha : today;
    if (fecha > today) fecha = today; // Nunca fechas futuras

    const categoria = EXPENSE_CATEGORIES.includes(r.categoria as ExpenseCategory)
      ? (r.categoria as ExpenseCategory)
      : guessCategory(descripcion);

    const cantidad =
      typeof r.cantidad === 'number' && Number.isFinite(r.cantidad) && r.cantidad > 0 && r.cantidad <= 1_000_000
        ? r.cantidad
        : null;

    const comercio = typeof r.comercio === 'string' && r.comercio.trim() ? r.comercio.trim().slice(0, 200) : null;

    result.push({ descripcion: capitalize(descripcion), monto, cantidad, fecha, categoria, comercio });
  }

  return result;
}
