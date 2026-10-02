'use client';

import React, { useState } from 'react';
import { cn, formatCOP } from '@/lib/utils';
import { MonthlySummary } from '@/types/expense.types';
import { ProgressBar } from '@/components/molecules/ProgressBar/ProgressBar';
import { Button } from '@/components/atoms/Button/Button';
import { Heading, Text } from '@/components/atoms/Typography/Typography';
import { MessageSquare, Copy, Check, Download, Sparkles } from 'lucide-react';

export interface MonthlySummaryCardProps {
  summary: MonthlySummary;
  className?: string;
}

/**
 * Componente organismo MonthlySummaryCard que previsualiza el resumen mensual para WhatsApp
 * con barras de progreso y estética de tarjeta financiera premium.
 */
export const MonthlySummaryCard: React.FC<MonthlySummaryCardProps> = ({
  summary,
  className,
}) => {
  const [copied, setCopied] = useState(false);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  const monthName = monthNames[summary.month - 1] || `Mes ${summary.month}`;

  const categoryEmojis: Record<string, string> = {
    Tecnología: '💻',
    Supermercado: '🛒',
    Restauración: '🍽️',
    Transporte: '🚗',
    'Hogar y Servicios': '🏠',
    'Salud y Bienestar': '💊',
    'Ocio y Viajes': '🎬',
    'Transferencias y Finanzas': '🏦',
    Otros: '📦',
  };

  const handleCopyWhatsApp = () => {
    let text = `📊 *Resumen de ${monthName} ${summary.year}*\n\n`;
    text += `*Total gastado:* ${formatCOP(summary.totalGastado)} de ${formatCOP(summary.presupuesto || 0)}\n`;
    text += `Consumo: ${summary.porcentajePresupuesto}%\n\n`;
    text += `*Desglose por categorías:*\n`;
    summary.categorias.forEach((cat) => {
      const emoji = categoryEmojis[cat.categoria] || '📌';
      text += `${emoji} ${cat.categoria}: ${formatCOP(cat.total)} (${cat.porcentaje}%)\n`;
    });
    text += `\n📄 *Responde "DETALLE" para ver la lista de comprobantes o "EXCEL" para exportar.*`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-b from-surface-card to-surface-base border border-surface-border p-6 shadow-subtle flex flex-col gap-5',
        className
      )}
    >
      {/* Luz ambiental sutil decorativa */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <Heading level={4} className="text-slate-100 font-semibold">
              Tarjeta Resumen de {monthName} {summary.year}
            </Heading>
            <Text variant="muted" className="text-slate-400">
              Formato optimizado para WhatsApp y Control Financiero
            </Text>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full bg-surface-elevated border border-surface-border text-[11px] font-mono font-semibold text-brand-300">
          {summary.numGastos} Comprobantes
        </span>
      </div>

      {/* Barra de Presupuesto General */}
      <div className="p-4 rounded-xl bg-surface-elevated/70 border border-surface-border flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-300 font-medium">Consumo del Presupuesto</span>
          <span className="text-xs font-mono font-bold text-cyan-300">
            {summary.porcentajePresupuesto}% consumido
          </span>
        </div>

        <ProgressBar
          percentage={summary.porcentajePresupuesto || 0}
          size="md"
        />

        <div className="flex items-center justify-between text-xs pt-1 border-t border-surface-border/50 text-slate-400">
          <span>Gastado: <strong className="text-slate-200 font-mono">{formatCOP(summary.totalGastado)}</strong></span>
          <span>Presupuesto: <strong className="text-slate-200 font-mono">{formatCOP(summary.presupuesto || 0)}</strong></span>
        </div>
      </div>

      {/* Desglose por Categorías */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
          Desglose por Categorías
        </span>

        <div className="flex flex-col gap-2.5">
          {summary.categorias.map((cat) => {
            const emoji = categoryEmojis[cat.categoria] || '📌';
            return (
              <div key={cat.categoria} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-200">
                    <span>{emoji}</span>
                    <span>{cat.categoria}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono text-[11px]">{cat.porcentaje}%</span>
                    <span className="font-mono font-semibold text-cyan-300">{formatCOP(cat.total)}</span>
                  </div>
                </div>
                <ProgressBar percentage={cat.porcentaje} size="sm" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-surface-border">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopyWhatsApp}
          leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        >
          {copied ? '¡Copiado para WhatsApp!' : 'Copiar Texto WhatsApp'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          leftIcon={<Download className="w-3.5 h-3.5" />}
        >
          Exportar Excel
        </Button>
      </div>
    </div>
  );
};
