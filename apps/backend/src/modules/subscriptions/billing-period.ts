import { todayInBogota, bogotaMonthRange } from '../../core/utils/dates.js';

/**
 * Cálculo de periodos de facturación.
 */

/** Periodo natural del mes calendario en hora de Colombia (plan gratuito): [día 1, día 1 del mes siguiente). */
export function calendarMonthPeriod(date: Date = new Date()): { start: Date; end: Date; cycle: string } {
  const [year, month] = todayInBogota(date).split('-').map(Number);
  const { from, to } = bogotaMonthRange(year, month);
  return { start: from, end: to, cycle: `${year}-${String(month).padStart(2, '0')}` };
}

/**
 * Suma meses respetando el día de corte y el último día de cada mes.
 * Ej: anclado al 31 → 31 ene, 28/29 feb, 31 mar (sin desbordarse a marzo).
 */
export function addMonthsClamped(date: Date, months: number, anchorDay = date.getDate()): Date {
  const target = new Date(date);
  target.setDate(1);
  target.setMonth(target.getMonth() + months);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(anchorDay, lastDay));
  return target;
}

/** Periodo de un mes exacto desde la fecha de pago (planes pagados). */
export function anchoredPeriod(start: Date, anchorDay = start.getDate()): { start: Date; end: Date } {
  return { start: new Date(start), end: addMonthsClamped(start, 1, anchorDay) };
}

export function cycleLabel(date: Date): string {
  return todayInBogota(date).slice(0, 7);
}

/** Fecha legible en español de Colombia (ej: "15 de noviembre de 2026"). */
export function formatDateEsCO(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Bogota',
  });
}
