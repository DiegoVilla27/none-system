import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina clases condicionales de Tailwind resolviendo conflictos de especificidad.
 *
 * @param inputs - Clases o expresiones booleanas de clases.
 * @returns Cadena de clases CSS unificadas.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formatea un número al estándar de Pesos Colombianos (COP).
 *
 * @example
 * formatCOP(50000) // "$ 50.000 COP"
 * formatCOP(4798950) // "$ 4.798.950 COP"
 *
 * @param value - Valor numérico en COP.
 * @param includeSuffix - Si se debe incluir el sufijo "COP". Por defecto true.
 * @returns Cadena formateada para Colombia.
 */
export function formatCOP(value: number, includeSuffix = true): string {
  const formatted = Math.round(value).toLocaleString('es-CO');
  return includeSuffix ? `$ ${formatted} COP` : `$ ${formatted}`;
}

/**
 * Formatea una fecha ISO o string (YYYY-MM-DD) al formato legible en español.
 *
 * @param dateStr - Fecha en formato YYYY-MM-DD o ISO.
 * @returns Fecha legible (ej. "26 sep, 2026").
 */
export function formatDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
