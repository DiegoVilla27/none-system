import { DOCUMENT_TYPES, DocumentType, EXPENSE_CATEGORIES, ExpenseCategory } from '../entities/expense.entity.js';
import {
  ManualExpenseDraft,
  fallbackParseManualText,
  hasAmountHint,
  normalizeText,
} from '../manual/manual-expense.parser.js';
import { isValidIsoDate, monthFromName, shiftIsoDate } from '../../../core/utils/dates.js';

/**
 * Consulta sobre los gastos del usuario, interpretada a partir de lenguaje natural
 * ("¿cuánto gasté en transporte el trimestre pasado?"). Es solo un filtro: los datos
 * siempre se consultan en el backend y únicamente sobre el usuario que pregunta.
 */
export interface ExpenseQuerySpec {
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
  tipoDocumento?: DocumentType;
  categoria?: ExpenseCategory;
  comercio?: string;
  /** resumen = totales agrupados; lista = registros individuales. */
  view: 'resumen' | 'lista';
  /** total = valores pagados; impuestos = IVA + impoconsumo. */
  metric: 'total' | 'impuestos';
  sort: 'reciente' | 'mayor' | 'menor';
  limit: number;
}

export type MessageInterpretation =
  | { intent: 'gasto'; gastos: ManualExpenseDraft[] }
  | { intent: 'consulta'; consulta: ExpenseQuerySpec }
  | { intent: 'otro' };

export const MAX_QUERY_RANGE_DAYS = 731;
export const MAX_LIST_ITEMS = 10;

// ---------------------------------------------------------------------------
// Periodos
// ---------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');
const lastDayOfMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const monthRange = (year: number, month: number) => ({
  from: `${year}-${pad(month)}-01`,
  to: `${year}-${pad(month)}-${pad(lastDayOfMonth(year, month))}`,
});

/** Trimestre calendario (1: ene–mar, 2: abr–jun, 3: jul–sep, 4: oct–dic). */
export function quarterRange(year: number, quarter: number): { from: string; to: string } {
  const startMonth = (quarter - 1) * 3 + 1;
  return { from: monthRange(year, startMonth).from, to: monthRange(year, startMonth + 2).to };
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/**
 * Periodo expresado en lenguaje natural, relativo a hoy (hora de Colombia).
 * "Último trimestre" / "trimestre pasado" = trimestre calendario anterior completo.
 * "Últimos N meses" = los N meses calendario más recientes, incluido el actual.
 */
export function periodFromText(text: string, today: string): { from: string; to: string } | null {
  const t = normalizeText(text);
  const [y, m] = today.split('-').map(Number);
  const currentQuarter = Math.ceil(m / 3);
  let match: RegExpMatchArray | null;

  if (/\bhoy\b/.test(t)) return { from: today, to: today };
  if (/\bayer\b/.test(t)) return { from: shiftIsoDate(today, -1), to: shiftIsoDate(today, -1) };

  if (/\b(esta semana)\b/.test(t)) {
    const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7; // lunes = 0
    return { from: shiftIsoDate(today, -weekday), to: today };
  }
  if (/\b(semana pasada|semana anterior)\b/.test(t)) {
    const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
    const monday = shiftIsoDate(today, -weekday - 7);
    return { from: monday, to: shiftIsoDate(monday, 6) };
  }

  if ((match = t.match(/\bultim[oa]s? (\d{1,2}|dos|tres|cuatro|seis|doce) meses\b/))) {
    const words: Record<string, number> = { dos: 2, tres: 3, cuatro: 4, seis: 6, doce: 12 };
    const n = Math.min(24, Number(words[match[1]] ?? match[1]));
    const startMonthIndex = y * 12 + (m - 1) - (n - 1);
    return { from: `${Math.floor(startMonthIndex / 12)}-${pad((startMonthIndex % 12) + 1)}-01`, to: today };
  }
  if (/\b(trimestre pasado|ultimo trimestre|trimestre anterior)\b/.test(t)) {
    return currentQuarter === 1 ? quarterRange(y - 1, 4) : quarterRange(y, currentQuarter - 1);
  }
  if (/\b(este trimestre|trimestre actual)\b/.test(t)) return { from: quarterRange(y, currentQuarter).from, to: today };
  if ((match = t.match(/\b(primer|segundo|tercer|cuarto) trimestre(?: (?:de |del )?(\d{4}))?\b/))) {
    const q = { primer: 1, segundo: 2, tercer: 3, cuarto: 4 }[match[1] as 'primer'];
    return quarterRange(match[2] ? Number(match[2]) : y, q);
  }
  if (/\b(semestre pasado|ultimo semestre|semestre anterior)\b/.test(t)) {
    return m <= 6 ? { from: `${y - 1}-07-01`, to: `${y - 1}-12-31` } : { from: `${y}-01-01`, to: `${y}-06-30` };
  }
  if (/\b(este semestre)\b/.test(t)) return { from: m <= 6 ? `${y}-01-01` : `${y}-07-01`, to: today };
  if (/\b(mes pasado|mes anterior|ultimo mes)\b/.test(t)) return m === 1 ? monthRange(y - 1, 12) : monthRange(y, m - 1);
  if (/\b(este mes|mes actual)\b/.test(t)) return { from: `${y}-${pad(m)}-01`, to: today };
  if (/\b(este ano|ano actual|en lo que va del ano)\b/.test(t)) return { from: `${y}-01-01`, to: today };
  if (/\b(ano pasado|ano anterior)\b/.test(t)) return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
  if ((match = t.match(/\b(?:ano |del |en )?(20\d{2})\b/)) && !/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|jun|jul|ago|sep|oct|nov|dic)\b/.test(t)) {
    const year = Number(match[1]);
    return year === y ? { from: `${y}-01-01`, to: today } : { from: `${year}-01-01`, to: `${year}-12-31` };
  }

  // Nombre de mes (con o sin año): el más reciente que no sea futuro
  for (const word of t.split(/[^a-z0-9]+/)) {
    const month = monthFromName(word);
    if (!month) continue;
    const yearMatch = t.match(/\b(20\d{2})\b/);
    const year = yearMatch ? Number(yearMatch[1]) : month > m ? y - 1 : y;
    return monthRange(year, month);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Validación de lo que devuelve la IA
// ---------------------------------------------------------------------------

/** Valida y normaliza una consulta: fechas reales, nunca futuras, rango máximo de 2 años, enumeraciones válidas. */
export function sanitizeQuery(raw: unknown, today: string): ExpenseQuerySpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  let from = isValidIsoDate(r.desde) ? (r.desde as string) : null;
  let to = isValidIsoDate(r.hasta) ? (r.hasta as string) : null;
  if (!from && !to) {
    from = `${today.slice(0, 7)}-01`;
    to = today;
  }
  from ??= to!;
  to ??= today;
  if (to > today) to = today;
  if (from > to) [from, to] = [to, from];
  if (from < '2000-01-01') from = '2000-01-01';
  if (daysBetween(from, to) > MAX_QUERY_RANGE_DAYS) from = shiftIsoDate(to, -MAX_QUERY_RANGE_DAYS);

  const tipoDocumento = DOCUMENT_TYPES.includes(r.tipoDocumento as DocumentType) ? (r.tipoDocumento as DocumentType) : undefined;
  const categoria = EXPENSE_CATEGORIES.includes(r.categoria as ExpenseCategory) ? (r.categoria as ExpenseCategory) : undefined;
  const comercio = typeof r.comercio === 'string' && r.comercio.trim().length >= 2 ? r.comercio.trim().slice(0, 60) : undefined;
  const sort = r.orden === 'mayor' || r.orden === 'menor' ? r.orden : 'reciente';
  const limitRaw = typeof r.limite === 'number' && Number.isFinite(r.limite) ? Math.round(r.limite) : null;
  const limit = Math.min(MAX_LIST_ITEMS, Math.max(1, limitRaw ?? MAX_LIST_ITEMS));
  // "Los 5 más grandes" es una lista aunque la IA haya dicho resumen
  const view = r.vista === 'lista' || limitRaw !== null || sort !== 'reciente' ? 'lista' : 'resumen';
  const metric = r.metrica === 'impuestos' ? 'impuestos' : 'total';

  return { from, to, tipoDocumento, categoria, comercio, view, metric, sort, limit };
}

// ---------------------------------------------------------------------------
// Intérprete de respaldo (sin IA)
// ---------------------------------------------------------------------------

const QUESTION_PATTERN =
  /(\?|\b(cuanto|cuantos|cuantas|cual|cuales|en que|ver|veo|muestra|muestrame|mostrar|dame|quiero ver|quiero saber|consultar|lista|listar|resumen|mis gastos|mis compras|mis facturas|mis transferencias|mas grandes|mayores|mas caros)\b)/;

const CATEGORY_WORDS: Array<[RegExp, ExpenseCategory]> = [
  [/\b(transporte|taxi|taxis|uber|gasolina)\b/, 'Transporte'],
  [/\b(supermercado|mercado)\b/, 'Supermercado'],
  [/\b(restaurante|restaurantes|restauracion|comida|comidas|almuerzos?)\b/, 'Restauración'],
  [/\b(hogar|servicios|servicios publicos)\b/, 'Hogar y Servicios'],
  [/\b(tecnologia)\b/, 'Tecnología'],
  [/\b(salud|bienestar|drogueria)\b/, 'Salud y Bienestar'],
  [/\b(ocio|viajes|entretenimiento)\b/, 'Ocio y Viajes'],
  [/\b(finanzas)\b/, 'Transferencias y Finanzas'],
];

export function looksLikeQuestion(text: string): boolean {
  return QUESTION_PATTERN.test(normalizeText(text));
}

const TOPIC_PATTERN = /\b(gastos?|compras?|facturas?|transferencias?|pagos?|recibos?|registros?|iva|impuestos?)\b/;

function buildFallbackQuery(text: string, today: string): ExpenseQuerySpec | null {
  const t = normalizeText(text);
  const period = periodFromText(text, today);
  const tipoDocumento: DocumentType | undefined = /\bfacturas?\b|\brecibos?\b/.test(t)
    ? 'factura'
    : /\btransferencias?\b/.test(t)
    ? 'transferencia'
    : /\b(gastos escritos|sin recibo|manuales)\b/.test(t)
    ? 'manual'
    : undefined;
  const categoria = CATEGORY_WORDS.find(([pattern]) => pattern.test(t))?.[1];
  const limitMatch = t.match(/\b(\d{1,2}) (gastos|registros|compras|facturas|transferencias|pagos)\b/);
  return sanitizeQuery(
    {
      desde: period?.from,
      hasta: period?.to,
      tipoDocumento,
      categoria,
      metrica: /\b(iva|impuestos?|impoconsumo)\b/.test(t) ? 'impuestos' : 'total',
      orden: /\b(mas grandes|mayores|mas caros|mas altos)\b/.test(t)
        ? 'mayor'
        : /\b(mas pequenos|menores|mas baratos)\b/.test(t)
        ? 'menor'
        : 'reciente',
      vista: /\b(lista|listar|cuales|detalle)\b/.test(t) ? 'lista' : 'resumen',
      limite: limitMatch ? Number(limitMatch[1]) : null,
    },
    today
  );
}

/**
 * Interpretación determinista para cuando la IA no está disponible:
 * 1) si suena a pregunta → consulta; 2) si trae un gasto con valor → gasto;
 * 3) si menciona un periodo o "gastos/facturas/…" → consulta; 4) otro.
 */
export function fallbackInterpret(text: string, today: string): MessageInterpretation {
  const t = normalizeText(text);

  if (looksLikeQuestion(text)) {
    const spec = buildFallbackQuery(text, today);
    if (spec) return { intent: 'consulta', consulta: spec };
  }

  if (hasAmountHint(text)) {
    const gastos = fallbackParseManualText(text, today);
    if (gastos.length > 0) return { intent: 'gasto', gastos };
  }

  if (periodFromText(text, today) || TOPIC_PATTERN.test(t)) {
    const spec = buildFallbackQuery(text, today);
    if (spec) return { intent: 'consulta', consulta: spec };
  }
  return { intent: 'otro' };
}

