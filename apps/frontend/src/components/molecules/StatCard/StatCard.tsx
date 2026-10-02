import React from 'react';
import { cn } from '@/lib/utils';
import { Text } from '@/components/atoms/Typography/Typography';

export interface StatCardProps {
  /**
   * Título descriptivo de la métrica (ej. "Total Gastado este Mes").
   */
  title: string;
  /**
   * Valor principal formateado (ej. "$ 5.308.950 COP").
   */
  value: string;
  /**
   * Icono representativo de la métrica.
   */
  icon: React.ReactNode;
  /**
   * Subtexto descriptivo o cambio porcentual (ej. "88% del presupuesto").
   */
  subtext?: string;
  /**
   * Etiqueta o badge opcional en la esquina superior derecha.
   */
  badge?: React.ReactNode;
  className?: string;
}

/**
 * Componente molecular StatCard para visualizar indicadores clave de rendimiento (KPIs).
 * Diseño dark minimalista con bordes nítidos y resplandor sutil en hover.
 */
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  subtext,
  badge,
  className,
}) => {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl bg-surface-card border border-surface-border p-5',
        'hover:border-brand-500/40 hover:shadow-glow transition-all duration-200',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-surface-elevated border border-surface-border flex items-center justify-center text-brand-400 group-hover:scale-105 transition-transform shrink-0">
            {icon}
          </div>
          <Text variant="small" className="text-slate-400 font-medium tracking-wide uppercase truncate">
            {title}
          </Text>
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      <div className="text-2xl font-bold tracking-tight text-slate-100 mb-1">
        {value}
      </div>

      {subtext && (
        <Text variant="muted" className="text-slate-400">
          {subtext}
        </Text>
      )}
    </div>
  );
};
