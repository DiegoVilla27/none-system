'use client';

import React from 'react';
import { MessageCircle, Play, ShieldCheck, CheckCircle2, Zap, FileSpreadsheet, ArrowRight } from 'lucide-react';

interface HeroProps {
  onScrollToDemo: () => void;
  onScrollToPlans: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onScrollToDemo, onScrollToPlans }) => {
  const whatsappUrl =
    'https://wa.me/573009999999?text=Hola%2C%20quiero%20empezar%20mi%20prueba%20gratuita%20de%2010%20comprobantes%20con%20None%20System';

  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
      {/* Background radiant ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-brand-500/15 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -left-40 -z-10 h-[350px] w-[350px] rounded-full bg-emerald-500/10 blur-[100px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Top Tagline Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-surface-card/90 px-4 py-1.5 text-xs font-semibold text-brand-300 shadow-glow mb-8 backdrop-blur-md">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300">🇨🇴 Diseñado para Colombia:</span>
          <span className="text-brand-300 font-bold">Factura Electrónica DIAN & Bancos</span>
        </div>

        {/* Main Headline */}
        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-6xl sm:leading-[1.15]">
          Tus facturas y gastos al día en segundos.{' '}
          <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-teal-300 bg-clip-text text-transparent">
            Solo reenvía una foto por WhatsApp.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300 leading-relaxed">
          Nuestra Inteligencia Artificial extrae automáticamente <strong className="text-white">NIT, IVA, comercio y total en pesos colombianos</strong>. Sin descargar apps pesadas. Consulta tu saldo al instante y descarga tu reporte en <strong className="text-white">Excel para tu contador con 1 clic</strong>.
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex w-full sm:w-auto items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-4 text-base font-bold text-white shadow-glowGreen transition-all duration-200 hover:from-emerald-400 hover:to-teal-400 hover:scale-[1.02] active:scale-95"
          >
            <MessageCircle className="h-5 w-5 text-white" />
            <span>Pruébalo Gratis en WhatsApp</span>
            <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs uppercase tracking-wide">10 facturas</span>
          </a>

          <button
            onClick={onScrollToDemo}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-card/90 px-6 py-4 text-base font-semibold text-slate-200 transition-all duration-200 hover:border-brand-500/40 hover:bg-surface-elevated hover:text-white"
          >
            <Play className="h-4 w-4 text-brand-400 fill-brand-400" />
            <span>Ver Demostración en Vivo</span>
          </button>
        </div>

        {/* Trust Badges Bar */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Sin tarjeta de crédito
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-brand-400" /> Cero riesgo de baneo (Meta Cloud API)
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-amber-400" /> Extracción en 2.1 segundos
          </span>
          <span className="flex items-center gap-1.5">
            <FileSpreadsheet className="h-4 w-4 text-cyan-400" /> Compatible con Excel y la DIAN
          </span>
        </div>

        {/* Metric summary boxes */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="rounded-xl border border-surface-border bg-surface-card/60 p-4 backdrop-blur-sm">
            <div className="text-2xl sm:text-3xl font-extrabold text-white">+12.000</div>
            <div className="text-xs text-slate-400 mt-1">Comprobantes procesados</div>
          </div>
          <div className="rounded-xl border border-surface-border bg-surface-card/60 p-4 backdrop-blur-sm">
            <div className="text-2xl sm:text-3xl font-extrabold text-brand-400">99.4%</div>
            <div className="text-xs text-slate-400 mt-1">Precisión en datos fiscales</div>
          </div>
          <div className="rounded-xl border border-surface-border bg-surface-card/60 p-4 backdrop-blur-sm">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">15 Horas</div>
            <div className="text-xs text-slate-400 mt-1">Ahorro mensual promedio</div>
          </div>
          <div className="rounded-xl border border-surface-border bg-surface-card/60 p-4 backdrop-blur-sm">
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">100% COP</div>
            <div className="text-xs text-slate-400 mt-1">Adaptado a la tributaria colombiana</div>
          </div>
        </div>
      </div>
    </section>
  );
};
