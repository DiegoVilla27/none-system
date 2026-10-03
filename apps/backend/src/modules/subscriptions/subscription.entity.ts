/**
 * Entidades y tipos de paquetes de suscripción contable.
 */

export type SubscriptionPlan = 'gratuito' | 'basico' | 'pro' | 'empresarial';

export interface PlanConfig {
  name: string;
  /** Comprobantes con imagen o PDF (lectura con IA) por periodo. */
  monthlyLimit: number;
  /** Gastos escritos (texto) por periodo; null = ilimitados. */
  manualMonthlyLimit: number | null;
  priceCOP: number;
  description: string;
}

export const PLAN_CONFIGS: Record<SubscriptionPlan, PlanConfig> = {
  gratuito: {
    name: 'Plan Gratuito',
    monthlyLimit: 5,
    manualMonthlyLimit: 30,
    priceCOP: 0,
    description: '5 comprobantes con imagen y 30 gastos escritos al mes',
  },
  basico: {
    name: 'Plan Independiente',
    monthlyLimit: 50,
    manualMonthlyLimit: null,
    priceCOP: 19900,
    description: '50 comprobantes con imagen al mes y gastos escritos ilimitados para independientes y hogar',
  },
  pro: {
    name: 'Plan Negocio',
    monthlyLimit: 200,
    manualMonthlyLimit: null,
    priceCOP: 49900,
    description: '200 comprobantes con imagen al mes y gastos escritos ilimitados para comercios y pymes',
  },
  empresarial: {
    name: 'Plan Empresarial',
    monthlyLimit: 600,
    manualMonthlyLimit: null,
    priceCOP: 99900,
    description: '600 comprobantes con imagen al mes y gastos escritos ilimitados para alto volumen',
  },
};

export const PAID_PLANS: SubscriptionPlan[] = ['basico', 'pro', 'empresarial'];

/** Porcentaje de consumo a partir del cual se avisa al usuario por WhatsApp. */
export const USAGE_ALERT_THRESHOLD = 0.8;

export interface UserSubscription {
  userId?: string; // ID único del usuario
  phoneNumber: string; // Identificador natural en WhatsApp (ej: 573001234567)
  name?: string;
  plan: SubscriptionPlan;
  monthlyLimit: number;
  currentUsage: number;
  /** Gastos escritos registrados en el periodo. */
  manualUsage: number;
  /** Límite de gastos escritos del plan; null = ilimitados. */
  manualMonthlyLimit: number | null;
  billingCycleMonth: string; // Formato YYYY-MM
  billingCycleAnchor?: number; // Día de corte mensual (1-31)
  currentPeriodStart?: string; // Fecha ISO inicio del ciclo actual
  currentPeriodEnd?: string; // Fecha ISO fin del ciclo actual (exclusiva)
  status: 'activo' | 'suspendido';
  createdAt: string;
  updatedAt: string;
}

/**
 * Traduce los valores guardados en BD (incluidos nombres legados en inglés) al plan del dominio.
 */
export function normalizePlan(value: string): SubscriptionPlan {
  switch (value) {
    case 'free':
    case 'gratuito':
      return 'gratuito';
    case 'starter':
    case 'basico':
      return 'basico';
    case 'pro':
      return 'pro';
    case 'enterprise':
    case 'empresarial':
      return 'empresarial';
    default:
      return 'gratuito';
  }
}

export function toDbPlan(plan: SubscriptionPlan): string {
  return plan === 'gratuito' ? 'free' : plan;
}
