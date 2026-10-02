'use client';

import React, { useState } from 'react';
import { cn, formatCOP, formatDate } from '@/lib/utils';
import { Expense, DocumentType } from '@/types/expense.types';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Button } from '@/components/atoms/Button/Button';
import { Text } from '@/components/atoms/Typography/Typography';
import { Search, Filter, Eye, Trash2, ArrowUpDown } from 'lucide-react';

export interface ExpenseTableProps {
  /**
   * Lista de gastos o comprobantes a mostrar.
   */
  expenses: Expense[];
  /**
   * Callback invocado al hacer clic en inspeccionar un gasto.
   */
  onViewExpense?: (expense: Expense) => void;
  className?: string;
}

/**
 * Componente organismo ExpenseTable para explorar y filtrar comprobantes contables en Colombia.
 */
export const ExpenseTable: React.FC<ExpenseTableProps> = ({
  expenses,
  onViewExpense,
  className,
}) => {
  const [filterType, setFilterType] = useState<'all' | DocumentType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredExpenses = expenses.filter((exp) => {
    const matchesType = filterType === 'all' || exp.tipoDocumento === filterType;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      exp.comercio.toLowerCase().includes(query) ||
      (exp.numeroReferencia && exp.numeroReferencia.toLowerCase().includes(query)) ||
      (exp.cifNif && exp.cifNif.toLowerCase().includes(query)) ||
      exp.categoria.toLowerCase().includes(query);

    return matchesType && matchesSearch;
  });

  return (
    <div className={cn('w-full flex flex-col gap-4', className)}>
      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Selector de Pestañas */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-card border border-surface-border">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none',
              filterType === 'all'
                ? 'bg-surface-elevated text-brand-300 border border-surface-border font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            Todos ({expenses.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('factura')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none',
              filterType === 'factura'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            Facturas
          </button>

          <button
            type="button"
            onClick={() => setFilterType('transferencia')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none',
              filterType === 'transferencia'
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            Transferencias
          </button>
        </div>

        {/* Input de Búsqueda */}
        <div className="relative flex items-center min-w-[240px]">
          <Search className="absolute left-3 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por comercio, NIT o ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-surface-card border border-surface-border text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Tabla con scroll horizontal responsivo */}
      <div className="w-full overflow-x-auto rounded-xl border border-surface-border bg-surface-card shadow-subtle">
        <table className="w-full text-left text-xs text-slate-300 divide-y divide-surface-border">
          <thead className="bg-surface-elevated text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
            <tr>
              <th scope="col" className="px-4 py-3">Tipo</th>
              <th scope="col" className="px-4 py-3">Comercio / Beneficiario</th>
              <th scope="col" className="px-4 py-3">Fecha</th>
              <th scope="col" className="px-4 py-3">Categoría</th>
              <th scope="col" className="px-4 py-3">No. Ref / NIT</th>
              <th scope="col" className="px-4 py-3 text-right">Total (COP)</th>
              <th scope="col" className="px-4 py-3 text-center">Confianza</th>
              <th scope="col" className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  No se encontraron registros que coincidan con los filtros.
                </td>
              </tr>
            ) : (
              filteredExpenses.map((exp) => (
                <tr
                  key={exp.id}
                  className="hover:bg-surface-elevated/40 transition-colors group cursor-pointer"
                  onClick={() => onViewExpense?.(exp)}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant={exp.tipoDocumento}>
                      {exp.tipoDocumento === 'transferencia' ? 'Transf.' : 'Factura'}
                    </Badge>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-semibold text-slate-100 group-hover:text-brand-300 transition-colors">
                      {exp.comercio}
                    </div>
                    {exp.entidadFinanciera && (
                      <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                        {exp.entidadFinanciera}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-400">
                    {formatDate(exp.fecha)}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md bg-surface-elevated border border-surface-border text-[11px] text-slate-300">
                      {exp.categoria}
                    </span>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                    {exp.numeroReferencia || exp.cifNif || '—'}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-bold text-cyan-300 text-sm">
                    {formatCOP(exp.total)}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <Badge variant={exp.confianzaExtraccion} dot>
                      {exp.confianzaExtraccion}
                    </Badge>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewExpense?.(exp);
                      }}
                      className="p-1 h-7 w-7 rounded-lg"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
