'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { cn, formatCOP, formatDate } from '@/lib/utils';
import { Expense, DocumentType, EXPENSE_CATEGORIES, ExpenseCategory } from '@/types/expense.types';
import { exportExpensesToCSV } from '@/lib/export-excel';
import { useAuth } from '@/context/AuthContext';
import { UpgradeModal } from '@/components/molecules/UpgradeModal/UpgradeModal';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Button } from '@/components/atoms/Button/Button';
import { Text } from '@/components/atoms/Typography/Typography';
import {
  Search,
  Eye,
  Calendar,
  Filter,
  Download,
  X,
  SlidersHorizontal,
  Lock,
} from 'lucide-react';

export type DateRangePreset = 'all' | 'this_month' | 'last_month' | 'last_30' | 'custom';

export interface ExpenseTableProps {
  /**
   * Lista de gastos o comprobantes a mostrar.
   */
  expenses: Expense[];
  /**
   * Callback invocado al hacer clic en inspeccionar un gasto. Si no se provee, navega a /expenses/:id.
   */
  onViewExpense?: (expense: Expense) => void;
  /**
   * Muestra la barra de filtros avanzados (rango de fechas, selector de categoría, exportación).
   * @default false
   */
  showAdvancedFilters?: boolean;
  className?: string;
}

/**
 * Componente organismo ExpenseTable para explorar, filtrar y exportar comprobantes contables en Colombia.
 */
export const ExpenseTable: React.FC<ExpenseTableProps> = ({
  expenses,
  onViewExpense,
  showAdvancedFilters = false,
  className,
}) => {
  const router = useRouter();
  const { subscription } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const isFreePlan = !subscription || subscription.plan === 'gratuito';

  const [filterType, setFilterType] = useState<'all' | DocumentType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const handleInspect = (exp: Expense) => {
    if (onViewExpense) {
      onViewExpense(exp);
    } else {
      router.push(`/expenses/${exp.id}`);
    }
  };

  // Verifica si el comprobante cae en el rango de fechas seleccionado
  const matchesDateFilter = (expDate: string): boolean => {
    if (datePreset === 'all') return true;
    if (!expDate) return false;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

    if (datePreset === 'this_month') {
      return expDate.startsWith(`${currentYear}-${currentMonth}`);
    }

    if (datePreset === 'last_month') {
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevYear = prevDate.getFullYear();
      const prevMonth = String(prevDate.getMonth() + 1).padStart(2, '0');
      return expDate.startsWith(`${prevYear}-${prevMonth}`);
    }

    if (datePreset === 'last_30') {
      const expTimestamp = new Date(expDate).getTime();
      const diffDays = (now.getTime() - expTimestamp) / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 30;
    }

    if (datePreset === 'custom') {
      if (customStartDate && expDate < customStartDate) return false;
      if (customEndDate && expDate > customEndDate) return false;
      return true;
    }

    return true;
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      // 1. Filtro por tipo de comprobante
      const matchesType = filterType === 'all' || exp.tipoDocumento === filterType;

      // 2. Filtro por categoría contable
      const matchesCat =
        selectedCategory === 'all' || exp.categoria === selectedCategory;

      // 3. Filtro por rango de fechas
      const matchesDate = matchesDateFilter(exp.fecha);

      // 4. Búsqueda de texto libre
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        exp.comercio.toLowerCase().includes(query) ||
        (exp.numeroReferencia && exp.numeroReferencia.toLowerCase().includes(query)) ||
        (exp.cifNif && exp.cifNif.toLowerCase().includes(query)) ||
        exp.categoria.toLowerCase().includes(query) ||
        exp.lineasArticulos?.some((line) => line.descripcion.toLowerCase().includes(query));

      return matchesType && matchesCat && matchesDate && matchesSearch;
    });
  }, [
    expenses,
    filterType,
    selectedCategory,
    datePreset,
    customStartDate,
    customEndDate,
    searchQuery,
  ]);

  // Totales acumulados de la selección filtrada
  const filteredTotals = useMemo(() => {
    return filteredExpenses.reduce(
      (acc, exp) => {
        acc.total += exp.total;
        acc.subtotal += exp.subtotal || 0;
        acc.impuestos += exp.impuestos || 0;
        return acc;
      },
      { total: 0, subtotal: 0, impuestos: 0 }
    );
  }, [filteredExpenses]);

  const hasActiveFilters =
    filterType !== 'all' ||
    searchQuery !== '' ||
    selectedCategory !== 'all' ||
    datePreset !== 'all' ||
    customStartDate !== '' ||
    customEndDate !== '';

  const handleClearFilters = () => {
    setFilterType('all');
    setSearchQuery('');
    setSelectedCategory('all');
    setDatePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const handleExportFiltered = () => {
    if (isFreePlan) {
      setShowUpgradeModal(true);
      return;
    }

    exportExpensesToCSV(
      filteredExpenses,
      `Reporte_Comprobantes_${new Date().toISOString().slice(0, 10)}`
    );
  };

  return (
    <div className={cn('w-full flex flex-col gap-4', className)}>
      {/* ================= BARRA DE FILTROS ================= */}
      <div className="flex flex-col gap-3">
        {/* Fila 1: Pestañas de Tipo + Buscador */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Selector de Pestañas */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-card border border-surface-border">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border border-transparent transition-colors duration-150 select-none',
                filterType === 'all'
                  ? 'bg-surface-elevated text-brand-300 border-surface-border shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated/40'
              )}
            >
              Todos ({expenses.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterType('factura')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border border-transparent transition-colors duration-150 select-none',
                filterType === 'factura'
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated/40'
              )}
            >
              Facturas
            </button>

            <button
              type="button"
              onClick={() => setFilterType('transferencia')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border border-transparent transition-colors duration-150 select-none',
                filterType === 'transferencia'
                  ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated/40'
              )}
            >
              Transferencias
            </button>

            <button
              type="button"
              onClick={() => setFilterType('manual')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border border-transparent transition-colors duration-150 select-none',
                filterType === 'manual'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated/40'
              )}
            >
              Manuales
            </button>
          </div>

          {/* Input de Búsqueda */}
          <div className="relative flex items-center min-w-[260px]">
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

        {/* Fila 2: Filtros Avanzados (Rango de Fechas + Categoría + Exportación) */}
        {showAdvancedFilters && (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3 rounded-xl bg-surface-card/70 border border-surface-border text-xs">
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Selector de Rango de Fechas */}
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                <select
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value as DateRangePreset)}
                  aria-label="Filtrar por rango de fechas"
                  className="rounded-lg bg-surface-elevated border border-surface-border px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="all">Todas las fechas</option>
                  <option value="this_month">Este mes</option>
                  <option value="last_month">Mes anterior</option>
                  <option value="last_30">Últimos 30 días</option>
                  <option value="custom">Rango personalizado...</option>
                </select>
              </div>

              {/* Inputs Personalizados de Fecha (si se elige 'custom') */}
              {datePreset === 'custom' && (
                <div className="flex items-center gap-1.5 animate-fadeIn">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    aria-label="Fecha inicial"
                    className="rounded-lg bg-surface-elevated border border-surface-border px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                  <span className="text-slate-500 text-xs">a</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    aria-label="Fecha final"
                    className="rounded-lg bg-surface-elevated border border-surface-border px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              )}

              {/* Selector de Categoría */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  aria-label="Filtrar por categoría contable"
                  className="rounded-lg bg-surface-elevated border border-surface-border px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="all">Todas las categorías</option>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botón Limpiar Filtros */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  leftIcon={<X className="w-3.5 h-3.5" />}
                  className="text-xs h-7 text-slate-400 hover:text-slate-200"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>

            {/* Acciones de la barra avanzada: Exportar Selección a Excel */}
            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportFiltered}
                leftIcon={
                  isFreePlan ? (
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                  )
                }
                className="text-xs h-7"
                title={isFreePlan ? 'Función disponible en planes de pago' : 'Exportar a Excel'}
              >
                Exportar a Excel ({filteredExpenses.length})
              </Button>
            </div>
          </div>
        )}

        {/* Fila 3: Tira de Resumen Contable Dinámica en tiempo real */}
        {showAdvancedFilters && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-lg bg-surface-elevated/40 border border-surface-border/60 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <span>
                Mostrando <strong className="text-slate-200">{filteredExpenses.length}</strong> de{' '}
                {expenses.length} comprobantes
              </span>
              {hasActiveFilters && (
                <span className="px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-300 border border-brand-500/30 text-[10px] font-mono">
                  Filtros activos
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              {filteredTotals.impuestos > 0 && (
                <span className="text-slate-400 hidden sm:inline">
                  IVA: <span className="text-slate-300 font-semibold">{formatCOP(filteredTotals.impuestos)}</span>
                </span>
              )}
              <span className="text-slate-300">
                Total Acumulado:{' '}
                <strong className="text-cyan-300 text-sm font-bold">
                  {formatCOP(filteredTotals.total)}
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ================= TABLA DE COMPROBANTES ================= */}
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
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-1.5 max-w-sm mx-auto">
                    <p className="text-sm font-medium text-slate-300">
                      {expenses.length === 0
                        ? 'No hay comprobantes registrados aún'
                        : 'No se encontraron registros con los filtros seleccionados'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {expenses.length === 0
                        ? 'Empieza escaneando una factura comercial o una transferencia bancaria.'
                        : 'Intenta cambiar de pestaña, ampliar el rango de fechas o limpiar los filtros.'}
                    </p>
                    {hasActiveFilters && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleClearFilters}
                        className="mt-2 text-xs"
                      >
                        Restablecer Filtros
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredExpenses.map((exp) => (
                <tr
                  key={exp.id}
                  className="hover:bg-surface-elevated/40 transition-colors group cursor-pointer"
                  onClick={() => handleInspect(exp)}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant={exp.tipoDocumento}>
                      {exp.tipoDocumento === 'transferencia' ? 'Transf.' : exp.tipoDocumento === 'manual' ? 'Manual' : 'Factura'}
                    </Badge>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[200px]">{exp.comercio}</span>
                    </div>
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
                        handleInspect(exp);
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

      {/* Modal de Actualización si el usuario gratuito intenta exportar */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="Exportación a Excel / CSV"
      />
    </div>
  );
};
