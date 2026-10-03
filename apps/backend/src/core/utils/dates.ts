const BOGOTA_TZ = 'America/Bogota';

/** Fecha actual en Colombia en formato YYYY-MM-DD (independiente de la zona del servidor). */
export function todayInBogota(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BOGOTA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Suma días a una fecha YYYY-MM-DD. */
export function shiftIsoDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Valida que una cadena sea una fecha real YYYY-MM-DD. */
export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

const MONTHS_ES: Record<string, number> = {
  ene: 1, enero: 1, jan: 1, january: 1,
  feb: 2, febrero: 2, february: 2,
  mar: 3, marzo: 3, march: 3,
  abr: 4, abril: 4, apr: 4, april: 4,
  may: 5, mayo: 5,
  jun: 6, junio: 6, june: 6,
  jul: 7, julio: 7, july: 7,
  ago: 8, agosto: 8, aug: 8, august: 8,
  sep: 9, sept: 9, septiembre: 9, setiembre: 9, september: 9,
  oct: 10, octubre: 10, october: 10,
  nov: 11, noviembre: 11, november: 11,
  dic: 12, diciembre: 12, dec: 12, december: 12,
};

export const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Número de mes (1-12) a partir de su nombre o abreviatura en español/inglés. */
export function monthFromName(name: string): number | null {
  const key = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\.$/, '');
  return MONTHS_ES[key] ?? null;
}

const pad = (n: number) => String(n).padStart(2, '0');

function build(year: number, month: number, day: number): string | null {
  if (year < 100) year += 2000;
  const iso = `${year}-${pad(month)}-${pad(day)}`;
  return isValidIsoDate(iso) ? iso : null;
}

export interface NormalizedDate {
  /** Fecha final en formato YYYY-MM-DD. */
  date: string;
  /** true si la fecha original no se pudo usar tal cual (ilegible, futura o fuera de rango) y se reemplazó por hoy. */
  needsReview: boolean;
}

/**
 * Convierte la fecha leída de un documento a YYYY-MM-DD.
 * Acepta: 2025-10-29, 2025/10/29, 29/10/2025, 29-10-25, 29 oct 2025, "SEP 26 2026", "29 de octubre de 2025".
 * En Colombia el orden es día/mes; si el primer número no puede ser mes se mantiene, y si el segundo
 * supera 12 se interpreta como mes/día. Fechas futuras o anteriores al año 2000 se marcan para revisión.
 */
export function normalizeDocumentDate(raw: unknown, today: string): NormalizedDate {
  const fallback = { date: today, needsReview: true };
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  const text = raw.trim().toLowerCase().replace(/\s+de\s+/g, ' ').replace(/,/g, ' ');

  let result: string | null = null;
  let m: RegExpMatchArray | null;

  if ((m = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) {
    result = build(+m[1], +m[2], +m[3]);
  } else if ((m = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/))) {
    const [a, b, y] = [+m[1], +m[2], +m[3]];
    result = b > 12 && a <= 12 ? build(y, a, b) : build(y, b, a);
  } else if ((m = text.match(/^(\d{1,2})[\s-]+([a-zñ.]+)[\s-]+(\d{2,4})/))) {
    const month = monthFromName(m[2]);
    result = month ? build(+m[3], month, +m[1]) : null;
  } else if ((m = text.match(/^([a-zñ.]+)[\s-]+(\d{1,2})[\s-]+(\d{2,4})/))) {
    const month = monthFromName(m[1]);
    result = month ? build(+m[3], month, +m[2]) : null;
  }

  if (!result || result > today || result < '2000-01-01') return fallback;
  return { date: result, needsReview: false };
}

/** Inicio y fin (exclusivo) de un mes calendario en hora de Colombia (UTC-5, sin horario de verano). */
export function bogotaMonthRange(year: number, month: number): { from: Date; to: Date } {
  return {
    from: new Date(Date.UTC(year, month - 1, 1, 5, 0, 0)),
    to: new Date(Date.UTC(year, month, 1, 5, 0, 0)),
  };
}
