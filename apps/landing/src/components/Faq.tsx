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
    a: 'Tú solo le escribes a nuestro número oficial, como a cualquier contacto: tu línea no se conecta a ningún software. Nuestro bot opera sobre la API oficial de WhatsApp Business de Meta, no con herramientas no autorizadas que simulan WhatsApp Web.',
  },
  {
    q: '¿Qué pasa si me acabo los comprobantes de mi cupo mensual?',
    a: 'El bot te avisa cuando usas el 80% de tu cupo. Si llegas al 100%, tus datos siguen intactos. Los gastos escritos (sin recibo) tienen su propio cupo: 30 al mes en el Plan Gratuito e ilimitados en los planes pagos. En el Plan Gratuito el cupo se renueva el día 1 de cada mes; los planes pagados duran un mes desde la fecha de pago y no se renuevan automáticamente.',
  },
  {
    q: '¿Cómo le entrego estos datos a mi contador?',
    a: 'Directamente desde tu Backoffice web. Puedes filtrar por cualquier rango de fechas (este mes, mes pasado, año completo) y hacer clic en el botón "Exportar a Excel". El archivo descargado incluye NIT, razón social, fecha, base gravable, IVA e Impoconsumo en columnas contables estándar compatibles con Siigo, Alegra, World Office o Excel.',
  },
  {
    q: '¿La IA puede leer fotos arrugadas o tirillas de papel térmico?',
    a: 'En la mayoría de los casos sí: usamos modelos de IA de Google (Gemini) que leen tirillas con dobleces o poca luz. Aun así la IA puede equivocarse, por eso te mostramos lo que extrajo para que lo revises y lo corrijas desde WhatsApp (CAMBIAR / DESHACER) o desde el panel web.',
  },
  {
    q: '¿Qué métodos de pago aceptan en Colombia?',
    a: 'Los pagos se procesan con Wompi (Bancolombia), una pasarela certificada: PSE, tarjetas de crédito y débito, Nequi y Botón Bancolombia. None System nunca ve ni almacena los datos de tu tarjeta.',
  },
  {
    q: '¿Tengo que firmar algún contrato de permanencia?',
    a: 'No. Todos los planes son mensuales, sin permanencia mínima y sin renovación automática: al terminar el mes vuelves al Plan Gratuito sin cobros adicionales.',
  },
  {
    q: '¿Puedo registrar gastos que no tienen recibo?',
    a: 'Sí. Escríbele al bot el concepto y el valor, por ejemplo "arroz 5000" o "ayer taxi 12 mil", o usa el formulario de gasto manual en el panel web. No gastan tus comprobantes con foto (el Plan Gratuito incluye 30 gastos escritos al mes y los planes pagos, ilimitados), pero al no tener soporte no sirven como respaldo contable ante la DIAN.',
  },
  {
    q: '¿Cómo elimino mis datos?',
    a: 'Escribe "ELIMINAR MIS DATOS" al bot o usa la opción "Eliminar mi cuenta" en tu perfil web. Borramos tus comprobantes, imágenes y gastos de forma permanente. Consulta nuestra Política de Tratamiento de Datos para conocer todos tus derechos.',
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
