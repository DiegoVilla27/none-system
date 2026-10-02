'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_LIST: FaqItem[] = [
  {
    q: '¿Existe algún riesgo de que Meta bloquee mi número de WhatsApp?',
    a: 'Ninguno. Operamos 100% a través de la Meta Cloud API Oficial. Los bloqueos solo ocurren con herramientas no autorizadas ("scrapers" o librerías piratas que simulan WhatsApp Web). Al usar la API oficial de Meta, tu línea tiene respaldo legal completo y reputación de nivel empresarial.',
  },
  {
    q: '¿Qué pasa si me acabo los comprobantes de mi cupo mensual?',
    a: 'El bot te enviará una notificación preventiva cuando alcances el 80% de tu cupo. Si llegas al 100%, tus datos y comprobantes anteriores permanecen intactos y accesibles. Puedes ascender de plan en cualquier momento desde esta landing con activación inmediata o esperar al día 1 del siguiente mes calendario para la recarga automática.',
  },
  {
    q: '¿Cómo le entrego estos datos a mi contador?',
    a: 'Directamente desde tu Backoffice web. Puedes filtrar por cualquier rango de fechas (este mes, mes pasado, año completo) y hacer clic en el botón "Exportar a Excel". El archivo descargado incluye NIT, razón social, fecha, base gravable, IVA e Impoconsumo en columnas contables estándar compatibles con Siigo, Alegra, World Office o Excel.',
  },
  {
    q: '¿La IA puede leer fotos arrugadas o tirillas de papel térmico?',
    a: 'Sí. Utilizamos el motor Gemini 2.5 Flash entrenado con millones de documentos físicos reales. Aunque la tirilla tenga dobleces, esté rotada o haya sido tomada con la cámara en un restaurante con luz tenue, el algoritmo reconstruye la información fiscal con más del 99% de precisión.',
  },
  {
    q: '¿Qué métodos de pago aceptan en Colombia?',
    a: 'Aceptamos pagos a través de PSE (todos los bancos colombianos incluyendo Bancolombia, Davivienda, Banco de Bogotá, etc.), tarjetas de crédito/débito (Visa, Mastercard, Amex) y cobros directos por Nequi y Daviplata.',
  },
  {
    q: '¿Tengo que firmar algún contrato de permanencia?',
    a: 'No. Todos nuestros planes son mensuales y sin permanencia mínima. Puedes cancelar tu suscripción o cambiar de categoría en cualquier momento sin penalizaciones ni letras pequeñas.',
  },
];

export const Faq: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 bg-surface-base/90 border-t border-surface-border">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-300 mb-4">
            <HelpCircle className="h-3.5 w-3.5 text-brand-400" />
            Resolvemos tus Dudas
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Preguntas Frecuentes
          </h2>
          <p className="mt-4 text-slate-300 text-base sm:text-lg">
            Todo lo que necesitas saber antes de empezar a digitalizar tus gastos con None System.
          </p>
        </div>

        <div className="space-y-4">
          {FAQ_LIST.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-surface-border bg-surface-card overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="flex w-full items-center justify-between p-6 text-left text-sm sm:text-base font-bold text-white hover:text-brand-300 transition-colors"
                >
                  <span className="pr-4">{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-brand-400' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-surface-border/50 pt-4">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
