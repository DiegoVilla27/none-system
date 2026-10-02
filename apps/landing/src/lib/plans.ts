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
    monthlyLimit: 10,
    description: 'Para probar la velocidad y precisión de la IA sin costo.',
    targetAudience: 'Usuarios nuevos y curiosos de la tecnología',
    features: [
      '10 comprobantes contables al mes',
      'Extracción IA con Gemini en 2 segundos',
      'Comandos de WhatsApp (CUPO, RESUMEN)',
      'Acceso al Backoffice básico',
      'Detección de NIT, IVA y Total COP',
      'Soporte por comunidad',
    ],
    ctaText: 'Probar Gratis en WhatsApp',
  },
  {
    id: 'basico',
    name: 'Personal / Independiente',
    priceCOP: 19900,
    monthlyLimit: 50,
    description: 'Control impecable de gastos personales y profesionales independientes.',
    targetAudience: 'Freelancers, consultores y control de finanzas del hogar',
    features: [
      '50 comprobantes contables al mes',
      'Extracción IA con Gemini en 2 segundos',
      'Exportación ilimitada a Excel / CSV contable',
      'Filtros por fecha, categoría y comercios',
      'Alerta preventiva al 80% del cupo mensual',
      'Comandos de WhatsApp ilimitados',
      'Soporte estándar vía WhatsApp',
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
    description: 'La solución definitiva para negocios que manejan compras y facturas semanales.',
    targetAudience: 'Restaurantes, tiendas, agencias y microempresas',
    features: [
      '200 comprobantes contables al mes',
      'Todo lo del Plan Independiente',
      'Diferenciación automática IVA (19%) vs Impoconsumo (8%)',
      'Clasificación por centros de costos / proyectos',
      'Histórico ilimitado en Backoffice en la nube',
      'Soporte prioritario por WhatsApp en < 15 min',
      'Garantía de uptime 99.9%',
    ],
    ctaText: 'Empezar con Plan Negocio',
  },
  {
    id: 'empresarial',
    name: 'Pymes / Empresarial',
    priceCOP: 99900,
    monthlyLimit: 600,
    description: 'Alto volumen para empresas que requieren conciliación y reportes masivos.',
    targetAudience: 'Pymes, firmas contables y cadenas comerciales',
    features: [
      '600+ comprobantes contables al mes',
      'Todo lo del Plan Negocio',
      'Carga masiva de facturas PDF electrónicas DIAN',
      'Exportación contable compatible con Siigo, Alegra y World Office',
      'Múltiples números de WhatsApp vinculados al mismo backoffice',
      'Asesor de onboarding dedicado',
      'SLA corporativo garantizado',
    ],
    ctaText: 'Contratar Plan Empresarial',
  },
];

export const COLOMBIAN_BANKS = [
  'Bancolombia',
  'Davivienda',
  'Nequi',
  'Daviplata',
  'Banco de Bogotá',
  'BBVA Colombia',
  'Banco de Occidente',
  'Scotiabank Colpatria',
  'Banco Falabella',
  'Lulo Bank',
  'Nu Colombia',
];
