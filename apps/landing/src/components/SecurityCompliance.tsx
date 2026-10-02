'use client';

import React from 'react';
import { ShieldCheck, Lock, FileCheck, CheckCircle2, Server, HelpCircle } from 'lucide-react';

export const SecurityCompliance: React.FC = () => {
  const cards = [
    {
      icon: ShieldCheck,
      color: 'text-emerald-400',
      border: 'border-emerald-500/30',
      title: 'Meta Cloud API Oficial (0% Riesgo de Baneo)',
      desc: 'Operamos exclusivamente sobre la infraestructura oficial certificada de Meta. A diferencia de bots piratas o scripts que bloquean líneas de WhatsApp, tu número comercial está 100% blindado bajo los términos de servicio de Meta Business.',
    },
    {
      icon: FileCheck,
      color: 'text-brand-400',
      border: 'border-brand-500/30',
      title: 'Adaptado a la DIAN y Estatuto Tributario',
      desc: 'Nuestra IA reconoce facturación electrónica, CUFE, NIT con dígito de verificación y separa con exactitud el IVA del Impuesto Nacional al Consumo (INC), protegiendo tus deducciones fiscales de renta y tus declaraciones de IVA.',
    },
    {
      icon: Lock,
      color: 'text-cyan-400',
      border: 'border-cyan-500/30',
      title: 'Habeas Data & Encriptación Bancaria (AES-256)',
      desc: 'Cumplimos rigurosamente con la Ley Estatutaria 1581 de 2012 de Protección de Datos Personales en Colombia. Tus documentos se encriptan de extremo a extremo y solo tú y tu contador tienen acceso a ellos.',
    },
  ];

  return (
    <section className="py-20 bg-surface-base border-t border-surface-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-300 mb-4">
            <Lock className="h-3.5 w-3.5 text-brand-400" />
            Seguridad y Confianza Empresarial
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Tus datos fiscales y tu WhatsApp en las mejores manos
          </h2>
          <p className="mt-4 text-slate-300 text-base sm:text-lg">
            Diseñado para cumplir con los estándares contables y legales de Colombia sin comprometer la seguridad de tu línea telefónica.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((c, idx) => {
            const Icon = c.icon;
            return (
              <div
                key={idx}
                className={`rounded-2xl border ${c.border} bg-surface-card/70 p-6 sm:p-8 backdrop-blur-sm flex flex-col justify-between`}
              >
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-base border border-surface-border mb-6">
                    <Icon className={`h-6 w-6 ${c.color}`} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">{c.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{c.desc}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-surface-border/50 flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <CheckCircle2 className={`h-4 w-4 ${c.color}`} />
                  <span>Estándar de calidad certificado</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
