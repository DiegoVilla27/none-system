import React from 'react';
import { cn } from '@/lib/utils';
import { DocumentType, ExtractionConfidence, ExpenseStatus } from '@/types/expense.types';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Tipo semántico o de negocio que determina el color y estilo.
   */
  variant?:
    | DocumentType
    | ExtractionConfidence
    | ExpenseStatus
    | 'neutral'
    | 'brand';
  /**
   * Muestra un punto pulsante decorativo a la izquierda.
   */
  dot?: boolean;
}

/**
 * Componente atómico Badge para estados, tipos de documento y niveles de confianza.
 */
export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  dot = false,
  children,
  ...props
}) => {
  const styles: Record<string, { badge: string; dot: string }> = {
    // Tipos de documento
    factura: {
      badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
      dot: 'bg-cyan-400',
    },
    transferencia: {
      badge: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
      dot: 'bg-indigo-400',
    },
    manual: {
      badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      dot: 'bg-amber-400',
    },
    // Niveles de confianza
    alta: {
      badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      dot: 'bg-emerald-400',
    },
    media: {
      badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      dot: 'bg-amber-400',
    },
    baja: {
      badge: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
      dot: 'bg-rose-400',
    },
    // Estados contables
    confirmado: {
      badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      dot: 'bg-emerald-400',
    },
    borrador: {
      badge: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
      dot: 'bg-slate-400',
    },
    // Genéricos
    neutral: {
      badge: 'bg-surface-elevated text-slate-300 border-surface-border',
      dot: 'bg-slate-400',
    },
    brand: {
      badge: 'bg-brand-500/10 text-brand-300 border-brand-500/30',
      dot: 'bg-brand-400',
    },
  };

  const currentStyle = styles[variant] || styles.neutral;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide uppercase whitespace-nowrap shrink-0 select-none',
        currentStyle.badge,
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full animate-pulse', currentStyle.dot)}
        />
      )}
      {children}
    </span>
  );
};
