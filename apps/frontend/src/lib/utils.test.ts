import { describe, it, expect } from 'vitest';
import { formatCOP, formatDate, cn } from './utils';

describe('Formatos y Utilidades Contables de Colombia (utils.ts)', () => {
  describe('formatCOP', () => {
    it('formatea montos en Pesos Colombianos con el símbolo $ y puntos de miles', () => {
      expect(formatCOP(50000)).toMatch(/\$\s?50\.000/);
      expect(formatCOP(4798950)).toMatch(/\$\s?4\.798\.950/);
      expect(formatCOP(120000)).toMatch(/\$\s?120\.000/);
    });

    it('formatea cero (0 COP) correctamente', () => {
      expect(formatCOP(0)).toMatch(/\$\s?0/);
    });

    it('no muestra decimales para Pesos Colombianos', () => {
      const formatted = formatCOP(150000);
      expect(formatted).not.toContain(',00');
    });
  });

  describe('formatDate', () => {
    it('formatea cadenas YYYY-MM-DD en formato legible para Colombia', () => {
      const formatted = formatDate('2026-10-02');
      expect(formatted).toContain('2026');
      expect(formatted).toMatch(/2/);
    });

    it('devuelve la cadena original si el formato es inválido', () => {
      expect(formatDate('')).toBe('');
      expect(formatDate('invalid-date')).toBe('invalid-date');
    });
  });

  describe('cn (Classnames Merger)', () => {
    it('combina clases condicionales y resuelve conflictos de Tailwind CSS', () => {
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
      expect(cn('text-sm', false && 'text-lg', 'font-bold')).toBe('text-sm font-bold');
    });
  });
});
