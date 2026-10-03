import { EXPENSE_CATEGORIES, ExpenseCategory } from '../expenses/entities/expense.entity.js';
import { guessCategory, normalizeText, parseAmount } from '../expenses/manual/manual-expense.parser.js';
import { normalizeDocumentDate, shiftIsoDate, todayInBogota } from '../../core/utils/dates.js';
import { RequestedScanType } from '../../providers/ocr/ocr.interface.js';

/**
 * Datos que el usuario indica en el pie de foto del comprobante, p. ej.:
 *   "categoria transporte"
 *   "remitente Juan Pérez, valor 50 mil"
 *   "transferencia" (solo el tipo)
 * Lo que el usuario escribe prevalece sobre lo que lea la IA.
 */
export interface CaptionInstructions {
  tipo: RequestedScanType;
  comercio?: string;
  categoria?: ExpenseCategory;
  total?: number;
  fecha?: string;
  nota?: string;
  /** Datos que el usuario escribió pero no se pudieron interpretar (se informan). */
  invalid: Array<{ field: 'categoria' | 'valor' | 'fecha' | 'comercio'; value: string }>;
}

type Directive = 'tipo' | 'comercio' | 'categoria' | 'total' | 'fecha' | 'nota';

const KEYWORDS: Array<[Directive, string]> = [
  ['tipo', 'tipo'],
  ['categoria', 'categor[ií]as?'],
  ['comercio', 'comercio|remitente|beneficiario|destinatario|proveedor|tienda|establecimiento|nombre|empresa'],
  ['total', 'valor|total|monto'],
  ['fecha', 'fecha'],
  ['nota', 'notas?|descripci[oó]n|concepto|detalle'],
];

// Solo cuenta como instrucción si la palabra clave abre el pie de foto o va después de un salto de línea, coma o punto y coma
const DIRECTIVE_PATTERN = new RegExp(
  `(?:^|[\\n,;])\\s*(${KEYWORDS.map(([, k]) => k).join('|')})\\s*(?:[:=\\-]\\s*|\\s+)`,
  'giu'
);

const CATEGORY_ALIASES: Array<[RegExp, ExpenseCategory]> = [
  [/^(comida|alimentacion|restaurante|restaurantes)$/, 'Restauración'],
  [/^(mercado|supermercados?)$/, 'Supermercado'],
  [/^(servicios|hogar|servicios publicos)$/, 'Hogar y Servicios'],
  [/^(salud|bienestar)$/, 'Salud y Bienestar'],
  [/^(ocio|viajes|entretenimiento)$/, 'Ocio y Viajes'],
  [/^(transferencias?|finanzas|banco)$/, 'Transferencias y Finanzas'],
  [/^(otro|otros|otra|otras)$/, 'Otros'],
];

export function matchCategory(value: string): ExpenseCategory | null {
  const text = normalizeText(value).replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length < 3) return null;
  for (const category of EXPENSE_CATEGORIES) {
    const name = normalizeText(category);
    if (name === text || name.startsWith(text)) return category;
  }
  for (const [pattern, category] of CATEGORY_ALIASES) if (pattern.test(text)) return category;
  const guessed = guessCategory(text);
  return guessed === 'Otros' ? null : guessed;
}

function typeFromText(text: string): RequestedScanType {
  const t = normalizeText(text);
  if (/\b(transferencia|transferi|consignacion|pago bancario|comprobante de pago)\b/.test(t)) return 'transferencia';
  if (/\b(factura|recibo|tiquete|ticket|compra)\b/.test(t)) return 'factura';
  return 'auto';
}

function directiveFor(keyword: string): Directive {
  const k = normalizeText(keyword);
  for (const [directive, pattern] of KEYWORDS) {
    if (new RegExp(`^(${pattern})$`, 'iu').test(k) || new RegExp(`^(${normalizeText(pattern)})$`, 'iu').test(k)) return directive;
  }
  return 'nota';
}

export function parseCaption(caption?: string | null): CaptionInstructions {
  const result: CaptionInstructions = { tipo: 'auto', invalid: [] };
  const text = (caption ?? '').trim().slice(0, 500);
  if (!text) return result;

  const matches = [...text.matchAll(DIRECTIVE_PATTERN)];
  const freeText = matches.length > 0 ? text.slice(0, matches[0].index) : text;
  result.tipo = typeFromText(freeText);

  const today = todayInBogota();
  matches.forEach((match, i) => {
    const start = match.index! + match[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    const value = text.slice(start, end).replace(/^[\s:=\-]+|[\s,;.]+$/g, '').trim();
    if (!value) return;

    switch (directiveFor(match[1])) {
      case 'tipo':
        result.tipo = typeFromText(value);
        break;
      case 'categoria': {
        const category = matchCategory(value);
        if (category) result.categoria = category;
        else result.invalid.push({ field: 'categoria', value });
        break;
      }
      case 'comercio':
        if (value.length >= 2 && value.length <= 120) result.comercio = value;
        else result.invalid.push({ field: 'comercio', value });
        break;
      case 'total': {
        const amount = parseAmount(value);
        if (amount) result.total = amount;
        else result.invalid.push({ field: 'valor', value });
        break;
      }
      case 'fecha': {
        const word = normalizeText(value);
        const date =
          word === 'hoy' ? today : word === 'ayer' ? shiftIsoDate(today, -1) : normalizeDocumentDate(value, today);
        if (typeof date === 'string') result.fecha = date;
        else if (!date.needsReview) result.fecha = date.date;
        else result.invalid.push({ field: 'fecha', value });
        break;
      }
      case 'nota':
        result.nota = value.slice(0, 300);
        break;
    }
  });
  return result;
}
