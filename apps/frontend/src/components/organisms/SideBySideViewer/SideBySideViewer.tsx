'use client';

import React, { useState } from 'react';
import { cn, formatCOP } from '@/lib/utils';
import { Expense, EXPENSE_CATEGORIES, ExpenseCategory } from '@/types/expense.types';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Input } from '@/components/atoms/Input/Input';
import { Button } from '@/components/atoms/Button/Button';
import { Text, Heading } from '@/components/atoms/Typography/Typography';
import {
  RotateCw,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  Trash2,
  FileCheck2,
  ArrowRight,
  Plus,
  Building2,
  Hash,
  Calendar,
  CreditCard,
} from 'lucide-react';

export interface SideBySideViewerProps {
  /**
   * Registro de gasto extraído para inspección y confirmación.
   */
  initialExpense: Expense;
  /**
   * Callback invocado al confirmar y guardar la edición.
   */
  onSave?: (updatedExpense: Expense) => void;
  /**
   * Callback para descartar o cancelar.
   */
  onCancel?: () => void;
  className?: string;
}

/**
 * Componente organismo SideBySideViewer: Muestra el soporte original a la izquierda
 * y el formulario estructurado para validación manual a la derecha.
 */
export const SideBySideViewer: React.FC<SideBySideViewerProps> = ({
  initialExpense,
  onSave,
  onCancel,
  className,
}) => {
  const [expense, setExpense] = useState<Expense>(initialExpense);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync if initialExpense changes
  React.useEffect(() => {
    setExpense(initialExpense);
  }, [initialExpense]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const updateField = <K extends keyof Expense>(field: K, value: Expense[K]) => {
    setExpense((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (onSave) {
        await onSave(expense);
      }
      setIsSaved(true);
    } finally {
      setIsSaving(false);
    }
  };

  const isTransferencia = expense.tipoDocumento === 'transferencia';

  return (
    <div
      className={cn(
        'w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start',
        className
      )}
    >
      {/* ================= COLUMNA IZQUIERDA: VISOR DE IMAGEN / SOPORTE ================= */}
      <div className="lg:col-span-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
              Soporte Original
            </span>
            <Badge variant={expense.tipoDocumento}>
              {isTransferencia ? 'Comprobante Bancario' : 'Factura Comercial'}
            </Badge>
          </div>

          {/* Controles de imagen */}
          <div className="flex items-center gap-1 bg-surface-card border border-surface-border p-1 rounded-lg">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-surface-elevated"
              title="Alejar"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 px-1">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-surface-elevated"
              title="Acercar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3 bg-surface-border mx-0.5" />
            <button
              type="button"
              onClick={handleRotate}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-surface-elevated"
              title="Rotar 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Contenedor de visualización */}
        <div className="relative w-full h-[520px] rounded-xl overflow-hidden bg-surface-base border border-surface-border flex items-center justify-center p-4">
          <div
            className="transition-transform duration-200 ease-out origin-center flex items-center justify-center"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={expense.imageUrl}
              alt="Soporte financiero"
              className="max-h-[460px] w-auto object-contain rounded-lg shadow-2xl border border-surface-border/50"
            />
          </div>

          <div className="absolute bottom-3 left-3 right-3 py-1.5 px-3 rounded-lg bg-surface-card/90 backdrop-blur-sm border border-surface-border text-xs text-slate-400 flex items-center justify-between">
            <span className="truncate max-w-[200px]">{expense.imageOriginalName}</span>
            <Badge variant={expense.confianzaExtraccion} dot>
              Confianza: {expense.confianzaExtraccion}
            </Badge>
          </div>
        </div>
      </div>

      {/* ================= COLUMNA DERECHA: FORMULARIO DE VERIFICACIÓN ================= */}
      <div className="lg:col-span-7 flex flex-col gap-4 p-6 rounded-xl bg-surface-card border border-surface-border shadow-subtle">
        <div className="flex items-center justify-between border-b border-surface-border pb-4">
          <div>
            <Heading level={3}>Verificación de Datos</Heading>
            <Text variant="small" className="text-slate-400">
              Datos extraídos automáticamente por IA. Revisa y confirma antes de contabilizar.
            </Text>
          </div>

          <Badge variant={expense.confianzaExtraccion} dot>
            IA {expense.confianzaExtraccion.toUpperCase()}
          </Badge>
        </div>

        {/* Campos Principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={isTransferencia ? 'Beneficiario / Convenio' : 'Comercio / Proveedor'}
            value={expense.comercio}
            onChange={(e) => updateField('comercio', e.target.value)}
            prefix={<Building2 className="w-4 h-4 text-brand-400" />}
          />

          <Input
            label="Entidad Financiera / Pasarela"
            value={expense.entidadFinanciera || ''}
            onChange={(e) => updateField('entidadFinanciera', e.target.value)}
            placeholder="Bancolombia, Wompi, Nequi, etc."
            prefix={<CreditCard className="w-4 h-4 text-indigo-400" />}
          />

          <Input
            label={isTransferencia ? 'Ref. de Recaudo / Aprobación' : 'No. Factura Electrónica'}
            value={expense.numeroReferencia || ''}
            onChange={(e) => updateField('numeroReferencia', e.target.value)}
            prefix={<Hash className="w-4 h-4 text-slate-400" />}
          />

          <Input
            label="NIT o Documento (Colombia)"
            value={expense.cifNif || ''}
            onChange={(e) => updateField('cifNif', e.target.value)}
            placeholder="890900943-1"
          />

          <Input
            type="date"
            label="Fecha del Documento"
            value={expense.fecha}
            onChange={(e) => updateField('fecha', e.target.value)}
            prefix={<Calendar className="w-4 h-4 text-slate-400" />}
          />

          {/* Selector de Categoría */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-300 tracking-wide">
              Categoría Contable
            </label>
            <select
              value={expense.categoria}
              onChange={(e) => updateField('categoria', e.target.value as ExpenseCategory)}
              className="w-full rounded-lg bg-surface-elevated border border-surface-border px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Desglose de Líneas de Artículos */}
        <div className="flex flex-col gap-2 pt-2 border-t border-surface-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
              {isTransferencia ? 'Concepto de la Transacción' : 'Artículos / Conceptos'}
            </span>
          </div>

          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
            {expense.lineasArticulos.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-surface-base border border-surface-border text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-5 h-5 rounded-full bg-surface-elevated flex items-center justify-center text-slate-400 font-mono text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="text-slate-200 font-medium truncate">
                    {item.descripcion}
                  </span>
                </div>
                <span className="font-mono text-cyan-300 font-semibold shrink-0">
                  {formatCOP(item.precio)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Resumen de Totales en COP */}
        <div className="pt-3 border-t border-surface-border grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            type="number"
            label="Subtotal (COP)"
            value={expense.subtotal !== null && expense.subtotal !== undefined ? expense.subtotal : ''}
            onChange={(e) => updateField('subtotal', e.target.value ? Number(e.target.value) : null)}
            placeholder="Opcional"
          />

          <Input
            type="number"
            label="IVA / Impuestos (COP)"
            value={expense.impuestos !== null && expense.impuestos !== undefined ? expense.impuestos : ''}
            onChange={(e) => updateField('impuestos', e.target.value ? Number(e.target.value) : null)}
            placeholder="Opcional"
          />

          <Input
            type="number"
            label="Total a Pagar (COP) *"
            value={expense.total || ''}
            onChange={(e) => updateField('total', Number(e.target.value) || 0)}
          />
        </div>

        {/* Acciones Finales */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border mt-2">
          {onCancel && (
            <Button variant="ghost" size="md" onClick={onCancel} disabled={isSaving}>
              Descartar
            </Button>
          )}

          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            isLoading={isSaving}
            leftIcon={
              isSaved ? (
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
              ) : (
                <FileCheck2 className="w-4 h-4 text-slate-950" />
              )
            }
          >
            {isSaved ? '¡Gasto Confirmado!' : 'Confirmar y Guardar Gasto'}
          </Button>
        </div>
      </div>
    </div>
  );
};
