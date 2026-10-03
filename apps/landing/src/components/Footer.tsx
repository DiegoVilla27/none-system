'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, MessageCircle, ExternalLink, Heart } from 'lucide-react';
import { BACKOFFICE_URL, WHATSAPP_SUPPORT_URL } from '@/lib/contact';
import { LEGAL_ENTITY } from '@/lib/legal';

export const Footer: React.FC = () => {
  const backofficeUrl = BACKOFFICE_URL;
  const whatsappUrl = WHATSAPP_SUPPORT_URL;

  return (
    <footer className="border-t border-surface-border bg-surface-card/60 py-16 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-surface-border">
          {/* Col 1: Brand Info */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-base border border-brand-500/30 text-brand-400 shadow-glow">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                none<span className="text-brand-400 font-black">.system</span>
                <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold text-brand-300 border border-brand-500/20">
                  Colombia
                </span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md leading-relaxed">
              La plataforma de Inteligencia Artificial que transforma fotos y PDFs de WhatsApp en registros contables estructurados y reportes en Excel para profesionales y pymes colombianas.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                Atención por WhatsApp (+57)
              </a>

              <a
                href={backofficeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-slate-600 hover:text-white transition-colors"
              >
                <span>Backoffice</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              </a>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Producto</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a href="/#como-funciona" className="hover:text-brand-400 transition-colors">
                  Cómo Funciona
                </a>
              </li>
              <li>
                <a href="/#demo" className="hover:text-brand-400 transition-colors">
                  Demostración IA
                </a>
              </li>
              <li>
                <a href="/#por-que-pagar" className="hover:text-brand-400 transition-colors">
                  ¿Por qué pagar?
                </a>
              </li>
              <li>
                <a href="/#calculadora-roi" className="hover:text-brand-400 transition-colors">
                  Calculadora de ROI
                </a>
              </li>
              <li>
                <a href="/#planes" className="hover:text-brand-400 transition-colors">
                  Planes y Precios (COP)
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal & Tributario Colombia */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Legal</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/privacidad" className="hover:text-brand-400 transition-colors">
                  Política de Tratamiento de Datos
                </Link>
              </li>
              <li>
                <Link href="/terminos" className="hover:text-brand-400 transition-colors">
                  Términos y Condiciones
                </Link>
              </li>
              <li>
                <span className="text-slate-400">Peticiones, quejas y reclamos: {LEGAL_ENTITY.privacyEmail}</span>
              </li>
              <li>
                <a href="https://www.sic.gov.co" target="_blank" rel="noopener noreferrer" className="hover:text-brand-400 transition-colors">
                  Superintendencia de Industria y Comercio
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div>
            © {new Date().getFullYear()} {LEGAL_ENTITY.name} · NIT {LEGAL_ENTITY.nit}. Todos los derechos reservados. Bogotá, Colombia.
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <span>Hecho con</span>
            <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500" />
            <span>para emprendedores y contadores colombianos.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
