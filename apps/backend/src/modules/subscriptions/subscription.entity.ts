/**
 * Entidades y tipos de paquetes de suscripción contable.
 */

export type SubscriptionPlan = 'gratuito' | 'basico' | 'pro' | 'empresarial';

export interface PlanConfig {
  name: string;
  monthlyLimit: number;
  priceCOP: number;
  description: string;
}

export const PLAN_CONFIGS: Record<SubscriptionPlan, PlanConfig> = {
  gratuito: {
    name: 'Plan Gratuito de Prueba',
    monthlyLimit: 10,
    priceCOP: 0,
    description: '10 comprobantes contables al mes gratis para siempre',
  },
  basico: {
    name: 'Plan Independiente',
    monthlyLimit: 50,
    priceCOP: 19900,
    description: '50 comprobantes contables al mes para independientes y hogar',
  },
  pro: {
    name: 'Plan Negocio',
    monthlyLimit: 200,
    priceCOP: 49900,
    description: '200 comprobantes contables al mes para comercios y pymes',
  },
  empresarial: {
    name: 'Plan Empresarial',
    monthlyLimit: 600,
    priceCOP: 99900,
    description: '600 comprobantes contables al mes para alto volumen',
  },
};

export interface UserSubscription {
  phoneNumber: string; // Identificador natural en WhatsApp (ej: 573001234567)
  name?: string;
  plan: SubscriptionPlan;
  monthlyLimit: number;
  currentUsage: number;
  billingCycleMonth: string; // Formato YYYY-MM
  status: 'activo' | 'suspendido';
  createdAt: string;
  updatedAt: string;
}
