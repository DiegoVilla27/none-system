'use client';

import React from 'react';
import { Check, Sparkles, MessageCircle, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { PRICING_PLANS, SubscriptionPlanId, PlanItem } from '@/lib/plans';
import { formatCOP } from '@/lib/utils';
import { WHATSAPP_START_URL } from '@/lib/contact';

interface PricingProps {
  onSelectPlan: (planId: SubscriptionPlanId) => void;
}

export const Pricing: React.FC<PricingProps> = ({ onSelectPlan }) => {
  const whatsappUrl = WHATSAPP_START_URL;

  return (
    <section id="planes" className="py-24 bg-surface-base/90 border-t border-surface-border relative">
      {/* Background ambient accent */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/10 blur-[130px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-300 mb-4">
            <Zap className="h-3.5 w-3.5 text-brand-400" />
            Precios Claros en Pesos Colombianos (COP)
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Planes diseñados para cada etapa de tu negocio
          </h2>
          <p className="mt-4 text-slate-300 text-base sm:text-lg">
            Sin contratos de permanencia ni cobros ocultos. Cancela o cambia de plan en cualquier momento con un mensaje.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {PRICING_PLANS.map((plan: PlanItem) => {
            const isFree = plan.priceCOP === 0;
            const isPopular = plan.isPopular;

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl border flex flex-col justify-between transition-all duration-300 ${
                  isPopular
                    ? 'border-brand-400 bg-surface-card shadow-glowHover scale-100 lg:-translate-y-2 lg:shadow-2xl'
                    : 'border-surface-border bg-surface-card/70 hover:border-slate-700 hover:bg-surface-elevated'
                } p-6 sm:p-7 backdrop-blur-md`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand-500 to-teal-400 px-3.5 py-1 text-[11px] font-black tracking-wide text-slate-950 uppercase shadow-glow">
                      <Sparkles className="h-3 w-3 fill-slate-950" />
                      Más Popular
                    </span>
                  </div>
                )}

                <div>
                  {/* Plan Header */}
                  <div className="border-b border-surface-border pb-6">
                    <h3 className="text-xl font-bold text-white flex items-center justify-between">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.description}</p>

                    <div className="mt-5 flex items-baseline">
                      {isFree ? (
                        <span className="text-4xl font-extrabold text-white">$0 COP</span>
                      ) : (
                        <>
                          <span className="text-4xl font-extrabold text-white">
                            {formatCOP(plan.priceCOP)}
                          </span>
                          <span className="ml-1 text-xs text-slate-400 font-medium">/ mes</span>
                        </>
                      )}
                    </div>

                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-surface-base px-2.5 py-1 text-xs font-semibold text-brand-300 border border-surface-border">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                      Cupo: {plan.monthlyLimit} comprobantes / mes
                    </div>
                  </div>

                  {/* Target Audience */}
                  <div className="py-4 border-b border-surface-border/50 text-[11px] text-slate-400">
                    <strong className="text-slate-300">Ideal para:</strong> {plan.targetAudience}
                  </div>

                  {/* Features List */}
                  <div className="py-6 space-y-3">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Incluye:
                    </div>
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                <div className="pt-4 border-t border-surface-border">
                  {isFree ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-500/40 bg-brand-500/10 py-3 text-xs font-bold text-brand-200 transition-all hover:bg-brand-500/20 active:scale-95"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>{plan.ctaText}</span>
                    </a>
                  ) : (
                    <button
                      onClick={() => onSelectPlan(plan.id)}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition-all active:scale-95 ${
                        isPopular
                          ? 'bg-gradient-to-r from-brand-500 to-teal-500 text-white shadow-glow hover:from-brand-400 hover:to-teal-400'
                          : 'border border-surface-border bg-surface-elevated text-white hover:border-slate-600'
                      }`}
                    >
                      <span>{plan.ctaText}</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom guarantee */}
        <div className="mt-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <ShieldCheck className="h-4 w-4 text-brand-400" />
          <span>Precios en pesos colombianos. Planes mensuales sin renovación automática. Nunca almacenamos datos de tarjetas.</span>
        </div>
      </div>
    </section>
  );
};
