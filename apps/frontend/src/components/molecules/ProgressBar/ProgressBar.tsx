import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  /**
   * Porcentaje de progreso (0 a 100).
   */
  percentage: number;
  /**
   * Etiqueta opcional izquierda.
   */
  label?: string;
  /**
   * Valor o texto derecho (ej. "88%").
   */
  valueText?: string;
  /**
   * Altura de la barra.
   */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Componente molecular ProgressBar para visualizar presupuesto y categorías de gasto.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  label,
  valueText,
  size = 'md',
  className,
}) => {
  const clamped = Math.min(100, Math.max(0, percentage));
  const isDanger = clamped >= 95;
  const isWarning = clamped >= 80 && clamped < 95;

  const barGradient = isDanger
    ? 'from-rose-500 to-amber-500'
    : isWarning
    ? 'from-amber-400 to-brand-400'
    : 'from-brand-500 to-teal-400';

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
  };

  return (
    <div className={cn('w-full flex flex-col gap-1.5', className)}>
      {(label || valueText) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="font-medium text-slate-300">{label}</span>}
          {valueText && (
            <span className="font-semibold text-slate-400 font-mono">
              {valueText}
            </span>
          )}
        </div>
      )}

      <div className={cn('w-full rounded-full bg-surface-base border border-surface-border overflow-hidden', heights[size])}>
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out shadow-glow',
            barGradient
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
