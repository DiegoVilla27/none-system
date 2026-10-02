'use client';

import React from 'react';
import { Camera, Cpu, FileSpreadsheet, ArrowRight, MessageCircle } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: '01',
      icon: Camera,
      title: 'Envía una foto o PDF por WhatsApp',
      desc: 'Sin instalar apps pesadas ni memorizar contraseñas. Reenvía fotos de tirillas físicas, pantallazos de transferencias o el PDF de la factura electrónica directo al bot.',
      highlight: 'Funciona desde cualquier celular con WhatsApp.',
    },
    {
      num: '02',
      icon: Cpu,
      title: 'La IA extrae los datos en 2 segundos',
      desc: 'Nuestro motor de visión Gemini identifica automáticamente el comercio, NIT, fecha, IVA (19%) o Impoconsumo (8%) y clasifica la categoría de gasto.',
      highlight: 'Recibes respuesta de confirmación al instante.',
    },
    {
      num: '03',
      icon: FileSpreadsheet,
      title: 'Consulta tu saldo o exporta a Excel',
      desc: 'Escribe RESUMEN en WhatsApp para ver tus gastos del mes o abre tu Backoffice web para filtrar por fechas y descargar el archivo de Excel listo para tu contador.',
      highlight: 'Compatible con Siigo, Alegra y World Office.',
    },
  ];

  return (
    <section id="como-funciona" className="py-20 bg-surface-base/80 border-t border-surface-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-300 mb-4">
            Flujo en 3 Pasos
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Tan simple como chatear con un amigo
          </h2>
          <p className="mt-4 text-slate-300 text-base sm:text-lg">
            La contabilidad tradicional requiere horas de escritorio. None System convierte tu WhatsApp en un auxiliar contable inteligente disponible 24/7.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="group relative rounded-2xl border border-surface-border bg-surface-card p-8 transition-all duration-300 hover:border-brand-500/40 hover:bg-surface-elevated hover:shadow-glow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-3xl font-black text-slate-700 group-hover:text-brand-400/40 transition-colors">
                      {step.num}
                    </span>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-base border border-surface-border text-brand-400 group-hover:border-brand-400 group-hover:scale-110 transition-all">
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-3 group-hover:text-brand-300 transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed mb-6">{step.desc}</p>
                </div>

                <div className="pt-4 border-t border-surface-border/50 text-xs font-medium text-brand-300 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                  {step.highlight}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
