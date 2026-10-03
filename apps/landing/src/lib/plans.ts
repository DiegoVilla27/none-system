export type SubscriptionPlanId = 'gratuito' | 'basico' | 'pro' | 'empresarial';

export interface PlanItem {
  id: SubscriptionPlanId;
  name: string;
  badge?: string;
  isPopular?: boolean;
  priceCOP: number;
  monthlyLimit: number;
  description: string;
  targetAudience: string;
  features: string[];
  ctaText: string;
}

export const PRICING_PLANS: PlanItem[] = [
  {
    id: 'gratuito',
    name: 'Gratuito / Prueba',
    priceCOP: 0,
    monthlyLimit: 5,
    description: 'Para probar la velocidad y precisión de la IA sin costo ni tarjeta de crédito.',
    targetAudience: 'Cualquier persona o negocio que desee probar el bot en WhatsApp',
    features: [
      '5 comprobantes con foto o PDF al mes',
      '30 gastos escritos sin recibo al mes ("arroz 5000")',
      'Extracción con IA en segundos',
      'Comandos de WhatsApp (CUPO, RESUMEN)',
      'Acceso al Backoffice para ver comprobantes',
      'Detección de NIT, IVA y Total en COP',
      'Soportes cifrados con AES-256 (Habeas Data)',
    ],
    ctaText: 'Probar Gratis en WhatsApp',
  },
  {
    id: 'basico',
    name: 'Personal / Independiente',
    priceCOP: 19900,
    monthlyLimit: 50,
    description: 'Control de gastos personales y profesionales independientes.',
    targetAudience: 'Freelancers, consultores independientes y control del hogar',
    features: [
      '50 comprobantes con imagen al mes',
      'Todo lo del Plan Gratuito',
      'Gastos escritos sin recibo ilimitados',
      'Exportación a Excel / CSV con delimitador colombiano (;)',
      'Filtros por fecha (mes, año, rango) y categorías',
      'Alerta preventiva en WhatsApp al 80% de cupo',
      'Visor lado a lado (imagen original vs datos)',
      'Soporte por WhatsApp en días hábiles',
    ],
    ctaText: 'Elegir Plan Independiente',
  },
  {
    id: 'pro',
    name: 'Comercio / Negocio',
    badge: 'MÁS POPULAR',
    isPopular: true,
    priceCOP: 49900,
    monthlyLimit: 200,
    description: 'Para negocios y comercios con compras, facturas y proveedores frecuentes.',
    targetAudience: 'Restaurantes, tiendas, agencias y microempresas',
    features: [
      '200 comprobantes con imagen al mes',
      'Todo lo del Plan Independiente',
      'Separación automática de IVA (19%/5%) vs Impoconsumo (INC 8%)',
      'Categorización contable automática por IA',
      'Detección de NIT con dígito de verificación',
      'Histórico completo en el Backoffice web',
      'Soporte prioritario por WhatsApp',
    ],
    ctaText: 'Empezar con Plan Negocio',
  },
  {
    id: 'empresarial',
    name: 'Pymes / Empresarial',
    priceCOP: 99900,
    monthlyLimit: 600,
    description: 'Alto volumen para pymes y empresas que requieren conciliación contable.',
    targetAudience: 'Pymes, firmas contables y empresas con alto flujo de facturas',
    features: [
      '600 comprobantes con imagen al mes',
      'Todo lo del Plan Negocio',
      'Reconocimiento de Factura Electrónica con CUFE DIAN',
      'Identificación de requisitos formales de factura (Art. 771-2 E.T.)',
      'Excel preparado para importar a Siigo, Alegra o World Office',
      'Panel web desde cualquier dispositivo',
      'Acompañamiento inicial y soporte preferencial',
    ],
    ctaText: 'Contratar Plan Empresarial',
  },
];
