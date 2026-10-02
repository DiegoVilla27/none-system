'use client';

import React, { useState } from 'react';
import { Calculator, ArrowRight, TrendingUp, Clock, DollarSign, Sparkles } from 'lucide-react';
import { formatCOP } from '@/lib/utils';
import { PRICING_PLANS, SubscriptionPlanId } from '@/lib/plans';

interface RoiCalculatorProps {
  onSelectPlan: (planId: SubscriptionPlanId) => void;
}

export const RoiCalculator: React.FC<RoiCalculatorProps> = ({ onSelectPlan }) => {
  const [receiptsCount, setReceiptsCount] = useState<number>(120);

  // Time calculation: Average manual typing, checking NIT, filing = 4.5 minutes per receipt
  const hoursSaved = Math.round((receiptsCount * 4.5) / 60);

  // Colombian market cost of 1 hour of professional / accounting assistant time = ~$25.000 COP
  const HOURLY_RATE_COP = 25000;
  const estimatedSavingsCOP = hoursSaved * HOURLY_RATE_COP;

  // Determine recommended plan
  let recommendedPlanId: SubscriptionPlanId = 'basico';
  if (receiptsCount <= 10) {
    recommendedPlanId = 'gratuito';
  } else if (receiptsCount <= 50) {
    recommendedPlanId = 'basico';
  } else if (receiptsCount <= 200) {
    recommendedPlanId = 'pro';
  } else {
    recommendedPlanId = 'empresarial';
  }

  const recommendedPlan =
    PRICING_PLANS.find((p) => p.id === recommendedPlanId) || PRICING_PLANS[2];

  const planCostCOP = recommendedPlan.priceCOP;
  const netProfitCOP = Math.max(0, estimatedSavingsCOP - planCostCOP);
  const roiPercentage =
    planCostCOP > 0 ? Math.round((netProfitCOP / planCostCOP) * 100) : 1000;

  return (
    <section id="calculadora-roi" className="py-20 bg-surface-base border-t border-surface-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 mb-4">
            <Calculator className="h-3.5 w-3.5 text-emerald-400" />
            Calculadora de Retorno de Inversión (ROI)
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Calcula cuánto dinero y tiempo vas a ahorrar cada mes
          </h2>
          <p className="mt-4 text-slate-300 text-base sm:text-lg">
            Ajusta la cantidad de facturas, tirillas o comprobantes que genera tu negocio mensualmente y descubre el plan ideal para ti.
          </p>
        </div>

        {/* Calculator Card */}
        <div className="mx-auto max-w-4xl rounded-3xl border border-brand-500/30 bg-surface-card p-6 sm:p-10 shadow-glow backdrop-blur-md">
          {/* Slider input */}
          <div className="mb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
              <label className="text-sm font-bold text-white uppercase tracking-wider">
                Comprobantes o facturas al mes:
              </label>
              <div className="rounded-xl border border-brand-400 bg-brand-500/15 px-4 py-1.5 text-xl font-black text-brand-300 shadow-glow">
                {receiptsCount} <span className="text-xs font-normal text-slate-300">facturas/mes</span>
              </div>
            </div>

            <input
              type="range"
              min="5"
              max="500"
              step="5"
              value={receiptsCount}
              onChange={(e) => setReceiptsCount(Number(e.target.value))}
              className="w-full h-3 bg-surface-base rounded-lg appearance-none cursor-pointer accent-brand-400 focus:outline-none"
            />
            <div className="flex justify-between text-[11px] text-slate-500 mt-2 font-mono">
              <span>5 recibos</span>
              <span>50 (Independiente)</span>
              <span>200 (Negocio)</span>
              <span>500+ (Empresarial)</span>
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl border border-surface-border bg-surface-base/80 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
                <Clock className="h-4 w-4 text-brand-400" />
                Tiempo Recuperado
              </div>
              <div className="text-3xl font-extrabold text-white">{hoursSaved} horas</div>
              <div className="text-xs text-slate-400 mt-1">Ahorro mensual en digitación</div>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-base/80 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-2">
                <DollarSign className="h-4 w-4" />
                Valor del Tiempo Ahorrado
              </div>
              <div className="text-3xl font-extrabold text-emerald-400">
                {formatCOP(estimatedSavingsCOP)}
              </div>
              <div className="text-xs text-slate-400 mt-1">Estimado a $25.000 COP/hora</div>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-base/80 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-2">
                <TrendingUp className="h-4 w-4" />
                Retorno de Inversión
              </div>
              <div className="text-3xl font-extrabold text-amber-300">+{roiPercentage}% ROI</div>
              <div className="text-xs text-slate-400 mt-1">Ganancia neta mensual</div>
            </div>
          </div>

          {/* Recommended Plan Banner & Action */}
          <div className="rounded-2xl border border-brand-500/40 bg-gradient-to-r from-brand-950/40 via-surface-elevated to-brand-950/40 p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-400 uppercase tracking-wider mb-1">
                <Sparkles className="h-3.5 w-3.5" /> Plan Recomendado para tu Volumen:
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">
                {recommendedPlan.name}{' '}
                <span className="text-brand-300 text-lg sm:text-xl">
                  ({recommendedPlan.priceCOP === 0 ? 'Gratis' : `${formatCOP(recommendedPlan.priceCOP)} COP / mes`})
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-1">
                Hasta {recommendedPlan.monthlyLimit} comprobantes contables con extracción IA.
              </div>
            </div>

            <button
              onClick={() => onSelectPlan(recommendedPlan.id)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-teal-500 px-6 py-3.5 text-sm font-bold text-white shadow-glow transition-all hover:from-brand-400 hover:to-teal-400 hover:scale-[1.03] active:scale-95 shrink-0"
            >
              <span>Elegir este Plan</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
