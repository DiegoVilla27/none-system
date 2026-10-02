'use client';

import React, { useState } from 'react';
import { cn, formatCOP } from '@/lib/utils';
import { Expense, MonthlySummary } from '@/types/expense.types';
import { exportExpensesToCSV } from '@/lib/export-excel';
import { useAuth } from '@/context/AuthContext';
import { UpgradeModal } from '@/components/molecules/UpgradeModal/UpgradeModal';
import { ProgressBar } from '@/components/molecules/ProgressBar/ProgressBar';
import { Button } from '@/components/atoms/Button/Button';
import { Heading, Text } from '@/components/atoms/Typography/Typography';
import { MessageSquare, Copy, Check, Download, Lock } from 'lucide-react';

export interface MonthlySummaryCardProps {
  summary: MonthlySummary;
  /**
   * Comprobantes del periodo para exportación directa a Excel.
   */
  expenses?: Expense[];
  /**
   * Callback personalizado para exportación a Excel.
   */
  onExportExcel?: () => void;
  className?: string;
}

/**
 * Componente organismo MonthlySummaryCard que previsualiza el resumen mensual para WhatsApp
 * enfocado en control contable de facturas y transferencias (sin presupuestos artificiales).
 */
export const MonthlySummaryCard: React.FC<MonthlySummaryCardProps> = ({
  summary,
  expenses,
  onExportExcel,
  className,
}) => {
  const [copied, setCopied] = useState(false);
  const { subscription } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const isFreePlan = !subscription || subscription.plan === 'gratuito';

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
    text += `*Total gastado:* ${formatCOP(summary.totalGastado)} (${summary.numGastos} comprobantes)\n`;
    if (summary.numFacturas > 0) {
      text += `🧾 *Facturas:* ${formatCOP(summary.totalFacturas)} (${summary.numFacturas})\n`;
    }
    if (summary.numTransferencias > 0) {
      text += `🏦 *Transferencias:* ${formatCOP(summary.totalTransferencias)} (${summary.numTransferencias})\n`;
    }
    text += `\n*Desglose por categorías:*\n`;
    summary.categorias.forEach((cat) => {
      const emoji = categoryEmojis[cat.categoria] || '📌';
      text += `${emoji} ${cat.categoria}: ${formatCOP(cat.total)} (${cat.porcentaje}%)\n`;
    });
    text += `\n📄 *Responde "DETALLE" para ver la lista de comprobantes o "EXCEL" para exportar.*`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExcelExport = () => {
    if (isFreePlan) {
      setShowUpgradeModal(true);
      return;
    }

    if (onExportExcel) {
      onExportExcel();
    } else if (expenses && expenses.length > 0) {
      exportExpensesToCSV(expenses, `Reporte_Contable_${monthName}_${summary.year}`);
    } else {
      alert('No hay comprobantes disponibles para exportar en este periodo.');
    }
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-b from-surface-card to-surface-base border border-surface-border p-6 shadow-subtle flex flex-col justify-between gap-5 h-full',
        className
      )}
    >
      {/* Luz ambiental sutil decorativa */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col gap-4">
        {/* Cabecera */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <Heading level={4} className="text-slate-100 font-semibold text-sm">
                Tarjeta Resumen · {monthName} {summary.year}
              </Heading>
              <Text variant="muted" className="text-slate-400 text-[11px]">
                Formato optimizado para WhatsApp
              </Text>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-surface-elevated border border-surface-border text-[11px] font-mono font-semibold text-brand-300 shrink-0">
            {summary.numGastos} Soportes
          </span>
        </div>

        {/* Resumen Total y Subdesglose Facturas vs Transferencias */}
        <div className="p-4 rounded-xl bg-surface-elevated/70 border border-surface-border flex flex-col gap-2.5">
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
              Total Contabilizado (Mes)
            </span>
            <div className="text-2xl font-bold font-mono text-cyan-200 mt-0.5">
              {formatCOP(summary.totalGastado)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-border/50 text-xs">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400">Facturas ({summary.numFacturas})</span>
              <span className="font-mono text-slate-200 font-semibold text-xs truncate">
                {formatCOP(summary.totalFacturas)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400">Transferencias ({summary.numTransferencias})</span>
              <span className="font-mono text-slate-200 font-semibold text-xs truncate">
                {formatCOP(summary.totalTransferencias)}
              </span>
            </div>
          </div>
        </div>

        {/* Desglose por Categorías */}
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
            Distribución por Categorías
          </span>

          {summary.categorias.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-500 rounded-lg bg-surface-elevated/40 border border-surface-border/50">
              Sin movimientos categorizados este mes
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {summary.categorias.map((cat) => {
                const emoji = categoryEmojis[cat.categoria] || '📌';
                return (
                  <div key={cat.categoria} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-200 truncate">
                        <span>{emoji}</span>
                        <span className="truncate">{cat.categoria}</span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400 font-mono text-[11px]">{cat.porcentaje}%</span>
                        <span className="font-mono font-semibold text-cyan-300 text-[11px]">
                          {formatCOP(cat.total)}
                        </span>
                      </div>
                    </div>
                    <ProgressBar percentage={cat.porcentaje} size="sm" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-surface-border mt-auto">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopyWhatsApp}
          leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          className="text-xs"
        >
          {copied ? '¡Copiado!' : 'Copiar para WhatsApp'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExcelExport}
          leftIcon={
            isFreePlan ? (
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )
          }
          className="text-xs"
          title={isFreePlan ? 'Función disponible en planes de pago' : 'Exportar Excel'}
        >
          Excel {isFreePlan && <span className="ml-1 text-[10px] text-amber-400 font-bold">(PRO)</span>}
        </Button>
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
