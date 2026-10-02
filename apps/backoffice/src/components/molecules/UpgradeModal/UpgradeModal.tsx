'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, Sparkles, CheckCircle2, X, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { Button } from '@/components/atoms/Button/Button';

export interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  feature?: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  title = 'Función Exclusiva de Planes de Pago',
  description = 'La exportación estructurada a Microsoft Excel (.csv / .xlsx) con desglose contable de IVA, Impoconsumo y formato para Siigo / Alegra está disponible en todos nuestros planes de pago.',
  feature = 'Exportación a Excel / CSV',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-surface-border bg-surface-card p-6 sm:p-8 shadow-2xl">
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-elevated transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icono de Candado / Excel */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-glow">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">
              Plan Gratuito Activo
            </span>
            <h3 className="text-lg font-bold text-white leading-tight">{title}</h3>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-5">
          {description}
        </p>

        {/* Beneficios de los planes de pago */}
        <div className="rounded-2xl bg-surface-base border border-surface-border p-4 mb-6 space-y-2.5">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Al actualizar a un plan de pago obtienes:</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Exportación ilimitada a Excel compatible con la DIAN.</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Mayor volumen mensual (50, 200 o 600 comprobantes).</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Separación automática de IVA (19%/5%) e Impoconsumo (INC 8%).</span>
          </div>
        </div>

        {/* Precios y CTA */}
        <div className="flex flex-col gap-3">
          <div className="text-center">
            <span className="text-xs text-slate-400">Planes mensuales disponibles desde</span>
            <div className="text-xl font-black text-brand-300 font-mono">
              $ 19.900 COP <span className="text-xs text-slate-500 font-normal">/ mes</span>
            </div>
          </div>

          <a
            href="https://none-system.com/#planes"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-teal-500 text-sm font-bold text-white shadow-glow hover:from-brand-400 hover:to-teal-400 transition-all active:scale-95"
          >
            <span>Ver Planes y Actualizar</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          <Button variant="ghost" size="sm" onClick={onClose} className="w-full text-xs text-slate-400">
            Continuar con el Plan Gratuito
          </Button>
        </div>
      </div>
    </div>
  );
};
