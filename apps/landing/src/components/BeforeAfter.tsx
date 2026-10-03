'use client';

import React from 'react';
import { XCircle, CheckCircle2, AlertTriangle, TrendingUp, Clock, DollarSign, FileSpreadsheet, ShieldAlert } from 'lucide-react';

export const BeforeAfter: React.FC = () => {
  return (
    <section id="por-que-pagar" className="py-20 bg-surface-base border-t border-surface-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300 mb-4">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            ¿Por qué pagar por None System?
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            El desorden de recibos te cuesta más de lo que imaginas
          </h2>
          <p className="mt-4 text-slate-300 text-base sm:text-lg">
            Para una microempresa o un profesional independiente, los recibos perdidos y las horas digitando papeles se traducen en <strong className="text-white">dinero y tiempo que no vuelven</strong>: IVA descontable sin soporte y gastos que nunca se registraron.
          </p>
        </div>

        {/* Side-by-side Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Left: The Old Painful Way */}
          <div className="rounded-2xl border border-red-500/20 bg-surface-card/60 p-6 sm:p-8 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 h-32 w-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                  <XCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">El Método Tradicional</h3>
                  <p className="text-xs text-red-300/80">Pérdida de dinero, tiempo y estrés contable</p>
                </div>
              </div>

              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-100">15 a 20 horas al mes</strong> perdidas los fines de semana transcribiendo recibos arrugados a un archivo de Excel.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-100">Facturas perdidas o borradas:</strong> La tinta térmica de las tirillas POS se borra en semanas y pierdes deducciones del impuesto de renta.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-100">Errores de digitación en el NIT o IVA:</strong> Provocan sanciones o requerimientos de información exógena ante la DIAN.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-100">Honorarios contables más caros:</strong> Tu contador tiene que cobrar más horas solo por organizar y digitar el desorden.
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-8 rounded-xl border border-red-500/20 bg-red-950/20 p-4">
              <div className="text-xs text-red-300 font-semibold uppercase tracking-wider">Costo oculto:</div>
              <div className="text-2xl font-black text-red-400 mt-1">Horas y soportes perdidos</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Calcula tu caso con la calculadora de ahorro más abajo (estimación ilustrativa).</div>
            </div>
          </div>

          {/* Right: The None System Way */}
          <div className="rounded-2xl border border-emerald-500/30 bg-surface-card p-6 sm:p-8 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-glow">
            <div className="absolute top-0 right-0 h-40 w-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-glowGreen">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Con None System</h3>
                  <p className="text-xs text-emerald-400">Automatización total por WhatsApp desde $19.900 COP</p>
                </div>
              </div>

              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-100">3 segundos por comprobante:</strong> Tomas la foto frente al datáfono o reenvías el PDF desde tu celular por WhatsApp y te olvidas.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-100">Extracción con IA que puedes revisar:</strong> Inteligencia Artificial entrenada en facturas de Colombia (NIT, Razón Social, IVA 19%, Impoconsumo 8%).
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-100">Archivo digital perpetuo:</strong> Imagen y datos guardados en la nube con visor lado a lado para cualquier auditoría.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-100">Exporta a Excel con 1 clic:</strong> Listo para Siigo, World Office, Alegra o para enviárselo directo a tu contador.
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4">
              <div className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">Inversión Desde:</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">$19.900 COP / mes</div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                💡 <strong className="text-white">Se paga solo:</strong> Con registrar una sola factura que ibas a perder, ya recuperaste el costo de todo el año.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
