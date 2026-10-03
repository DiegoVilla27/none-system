import { createHash } from 'node:crypto';
import { Expense } from '../entities/expense.entity.js';
import { normalizeText } from '../manual/manual-expense.parser.js';

export type DuplicateReason = 'archivo' | 'cufe' | 'referencia' | 'datos';

export interface DuplicateMatch {
  /** strong: es el mismo comprobante (no se guarda). possible: muy parecido (se guarda y se avisa). */
  level: 'strong' | 'possible';
  reason: DuplicateReason;
  existing: Expense;
}

export const fileFingerprint = (buffer: Buffer): string => createHash('sha256').update(buffer).digest('hex');

/** Referencia/CUFE comparables: sin espacios, guiones ni diferencias de mayúsculas. */
export function normalizeReference(value?: string | null): string {
  return (value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Nombre comparable: sin tildes, signos ni sufijos societarios. */
export function normalizeName(value?: string | null): string {
  return normalizeText(value ?? '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(s ?a ?s|s ?a|ltda|limitada|y cia|cia)\b/g, ' ')
    .replace(/\s+/g, '')
    .trim();
}

const similarNames = (a: string, b: string): boolean => {
  const x = normalizeName(a);
  const y = normalizeName(b);
  return Boolean(x && y && (x === y || x.includes(y) || y.includes(x)));
};

/**
 * Compara un comprobante recién leído con los existentes del mismo usuario.
 * - Mismo CUFE → mismo comprobante.
 * - Misma referencia + mismo valor → mismo comprobante.
 * - Sin referencia en alguno de los dos: mismo valor + misma fecha + mismo comercio → posible duplicado.
 * Los gastos escritos a mano nunca se consideran duplicados.
 */
export function classifyDuplicate(
  candidate: Pick<Expense, 'cufe' | 'numeroReferencia' | 'total' | 'fecha' | 'comercio'>,
  existing: Expense[]
): DuplicateMatch | null {
  const cufe = normalizeReference(candidate.cufe);
  const reference = normalizeReference(candidate.numeroReferencia);
  let possible: DuplicateMatch | null = null;

  for (const e of existing) {
    if (e.tipoDocumento === 'manual') continue;

    const otherCufe = normalizeReference(e.cufe);
    if (cufe.length >= 10 && cufe === otherCufe) return { level: 'strong', reason: 'cufe', existing: e };

    const otherReference = normalizeReference(e.numeroReferencia);
    if (reference.length >= 4 && otherReference.length >= 4) {
      if (reference === otherReference && e.total === candidate.total) {
        return { level: 'strong', reason: 'referencia', existing: e };
      }
      continue; // Ambos tienen referencia y es distinta: son transacciones diferentes
    }

    if (!possible && e.total === candidate.total && e.fecha === candidate.fecha && similarNames(e.comercio, candidate.comercio)) {
      possible = { level: 'possible', reason: 'datos', existing: e };
    }
  }
  return possible;
}
