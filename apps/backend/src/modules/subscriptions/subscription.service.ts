import {
  SubscriptionPlan,
  UserSubscription,
  PLAN_CONFIGS,
} from './subscription.entity.js';

export class SubscriptionService {
  // Almacenamiento en memoria de suscripciones por número de teléfono
  private readonly subscriptions = new Map<string, UserSubscription>();

  /**
   * Obtiene el ciclo de facturación actual en formato YYYY-MM.
   */
  private getCurrentBillingCycle(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Obtiene la suscripción de un usuario o crea una en el Plan Gratuito (10 escaneos/mes).
   * Si ha cambiado de mes (nuevo ciclo), reinicia el consumo a 0 automáticamente.
   */
  async getOrCreateSubscription(
    phoneNumber: string,
    name?: string
  ): Promise<UserSubscription> {
    const currentCycle = this.getCurrentBillingCycle();
    const nowIso = new Date().toISOString();

    let sub = this.subscriptions.get(phoneNumber);

    if (!sub) {
      sub = {
        phoneNumber,
        name,
        plan: 'gratuito',
        monthlyLimit: PLAN_CONFIGS.gratuito.monthlyLimit,
        currentUsage: 0,
        billingCycleMonth: currentCycle,
        status: 'activo',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      this.subscriptions.set(phoneNumber, sub);
      return sub;
    }

    // Si ya comenzó un nuevo mes, reiniciar el consumo automáticamente
    if (sub.billingCycleMonth !== currentCycle) {
      sub.currentUsage = 0;
      sub.billingCycleMonth = currentCycle;
      sub.updatedAt = nowIso;
      this.subscriptions.set(phoneNumber, sub);
    }

    // Actualizar nombre si viene disponible
    if (name && sub.name !== name) {
      sub.name = name;
      sub.updatedAt = nowIso;
    }

    return sub;
  }

  /**
   * Valida si el usuario tiene cupo disponible para escanear un nuevo comprobante.
   */
  async canProcessDocument(
    phoneNumber: string,
    name?: string
  ): Promise<{
    allowed: boolean;
    remaining: number;
    total: number;
    plan: SubscriptionPlan;
    currentUsage: number;
  }> {
    const sub = await this.getOrCreateSubscription(phoneNumber, name);

    if (sub.status !== 'activo') {
      return {
        allowed: false,
        remaining: 0,
        total: sub.monthlyLimit,
        plan: sub.plan,
        currentUsage: sub.currentUsage,
      };
    }

    const remaining = Math.max(0, sub.monthlyLimit - sub.currentUsage);
    const allowed = sub.currentUsage < sub.monthlyLimit;

    return {
      allowed,
      remaining,
      total: sub.monthlyLimit,
      plan: sub.plan,
      currentUsage: sub.currentUsage,
    };
  }

  /**
   * Incrementa en +1 el consumo de comprobantes del usuario tras un escaneo exitoso.
   */
  async incrementUsage(phoneNumber: string): Promise<UserSubscription> {
    const sub = await this.getOrCreateSubscription(phoneNumber);
    sub.currentUsage += 1;
    sub.updatedAt = new Date().toISOString();
    this.subscriptions.set(phoneNumber, sub);
    return sub;
  }

  /**
   * Asigna un plan de suscripción a un número de teléfono (por ejemplo tras confirmar el pago).
   */
  async upgradePlan(
    phoneNumber: string,
    plan: SubscriptionPlan
  ): Promise<UserSubscription> {
    const sub = await this.getOrCreateSubscription(phoneNumber);
    const config = PLAN_CONFIGS[plan];

    sub.plan = plan;
    sub.monthlyLimit = config.monthlyLimit;
    sub.status = 'activo';
    sub.updatedAt = new Date().toISOString();

    this.subscriptions.set(phoneNumber, sub);
    return sub;
  }

  /**
   * Consulta todas las suscripciones registradas (útil para auditoría / admin).
   */
  async getAllSubscriptions(): Promise<UserSubscription[]> {
    return Array.from(this.subscriptions.values());
  }
}
