import { PrismaClient } from '@prisma/client';
import {
  SubscriptionPlan,
  UserSubscription,
  PLAN_CONFIGS,
} from './subscription.entity.js';

export interface PaymentTransactionRecord {
  reference: string;
  amountCOP: number;
  paymentMethod: string;
  customerName?: string;
  customerEmail?: string;
  customerDocNumber?: string;
  userId?: string;
  status?: string;
}

export class SubscriptionService {
  private readonly inMemorySubscriptions = new Map<string, UserSubscription>();

  constructor(private readonly prisma?: PrismaClient | null) {}

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
    name?: string,
    userId?: string
  ): Promise<UserSubscription> {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const currentCycle = this.getCurrentBillingCycle();
    const nowIso = new Date().toISOString();

    if (this.prisma) {
      try {
        let record = await this.prisma.subscription.findUnique({
          where: { phoneNumber: cleanPhone },
        });

        if (!record) {
          record = await this.prisma.subscription.create({
            data: {
              phoneNumber: cleanPhone,
              name: name || null,
              userId: userId || null,
              plan: 'gratuito',
              monthlyLimit: PLAN_CONFIGS.gratuito.monthlyLimit,
              currentUsage: 0,
              billingCycleMonth: currentCycle,
              status: 'activo',
            },
          });
        } else {
          // Si ya comenzó un nuevo mes o vienen datos nuevos, actualizar
          const updates: any = {};
          if (record.billingCycleMonth !== currentCycle) {
            updates.currentUsage = 0;
            updates.billingCycleMonth = currentCycle;
          }
          if (name && record.name !== name) {
            updates.name = name;
          }
          if (userId && !record.userId) {
            updates.userId = userId;
          }

          if (Object.keys(updates).length > 0) {
            record = await this.prisma.subscription.update({
              where: { phoneNumber: cleanPhone },
              data: updates,
            });
          }
        }

        return {
          phoneNumber: record.phoneNumber,
          name: record.name || undefined,
          plan: record.plan as SubscriptionPlan,
          monthlyLimit: record.monthlyLimit,
          currentUsage: record.currentUsage,
          billingCycleMonth: record.billingCycleMonth,
          status: record.status as 'activo' | 'suspendido',
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString(),
        };
      } catch (err) {
        console.warn('⚠️ [Prisma] Error en getOrCreateSubscription, usando memoria fallback:', (err as Error).message);
      }
    }

    // Fallback en memoria
    let sub = this.inMemorySubscriptions.get(cleanPhone);

    if (!sub) {
      sub = {
        phoneNumber: cleanPhone,
        name,
        plan: 'gratuito',
        monthlyLimit: PLAN_CONFIGS.gratuito.monthlyLimit,
        currentUsage: 0,
        billingCycleMonth: currentCycle,
        status: 'activo',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      this.inMemorySubscriptions.set(cleanPhone, sub);
      return sub;
    }

    if (sub.billingCycleMonth !== currentCycle) {
      sub.currentUsage = 0;
      sub.billingCycleMonth = currentCycle;
      sub.updatedAt = nowIso;
      this.inMemorySubscriptions.set(cleanPhone, sub);
    }

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
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const currentSub = await this.getOrCreateSubscription(cleanPhone);

    if (this.prisma) {
      try {
        const updated = await this.prisma.subscription.update({
          where: { phoneNumber: cleanPhone },
          data: {
            currentUsage: { increment: 1 },
          },
        });

        return {
          phoneNumber: updated.phoneNumber,
          name: updated.name || undefined,
          plan: updated.plan as SubscriptionPlan,
          monthlyLimit: updated.monthlyLimit,
          currentUsage: updated.currentUsage,
          billingCycleMonth: updated.billingCycleMonth,
          status: updated.status as 'activo' | 'suspendido',
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        };
      } catch (err) {
        console.warn('⚠️ [Prisma] Error en incrementUsage, usando memoria:', (err as Error).message);
      }
    }

    currentSub.currentUsage += 1;
    currentSub.updatedAt = new Date().toISOString();
    this.inMemorySubscriptions.set(cleanPhone, currentSub);
    return currentSub;
  }

  /**
   * Asigna un plan de suscripción a un número de teléfono y opcionalmente registra la transacción de pago en PostgreSQL.
   */
  async upgradePlan(
    phoneNumber: string,
    plan: SubscriptionPlan,
    transaction?: PaymentTransactionRecord
  ): Promise<UserSubscription> {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const config = PLAN_CONFIGS[plan];
    await this.getOrCreateSubscription(cleanPhone);

    if (this.prisma) {
      try {
        const updated = await this.prisma.subscription.update({
          where: { phoneNumber: cleanPhone },
          data: {
            plan,
            monthlyLimit: config.monthlyLimit,
            status: 'activo',
          },
        });

        if (transaction) {
          await this.prisma.paymentTransaction.create({
            data: {
              phoneNumber: cleanPhone,
              plan,
              amountCOP: transaction.amountCOP,
              paymentMethod: transaction.paymentMethod,
              reference: transaction.reference,
              status: transaction.status || 'APROBADA',
              customerName: transaction.customerName || null,
              customerEmail: transaction.customerEmail || null,
              customerDocNumber: transaction.customerDocNumber || null,
              userId: transaction.userId || null,
            },
          });
        }

        return {
          phoneNumber: updated.phoneNumber,
          name: updated.name || undefined,
          plan: updated.plan as SubscriptionPlan,
          monthlyLimit: updated.monthlyLimit,
          currentUsage: updated.currentUsage,
          billingCycleMonth: updated.billingCycleMonth,
          status: updated.status as 'activo' | 'suspendido',
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        };
      } catch (err) {
        console.warn('⚠️ [Prisma] Error en upgradePlan, usando memoria:', (err as Error).message);
      }
    }

    const sub = this.inMemorySubscriptions.get(cleanPhone) || {
      phoneNumber: cleanPhone,
      plan,
      monthlyLimit: config.monthlyLimit,
      currentUsage: 0,
      billingCycleMonth: this.getCurrentBillingCycle(),
      status: 'activo' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    sub.plan = plan;
    sub.monthlyLimit = config.monthlyLimit;
    sub.status = 'activo';
    sub.updatedAt = new Date().toISOString();
    this.inMemorySubscriptions.set(cleanPhone, sub);

    return sub;
  }

  /**
   * Consulta todas las suscripciones registradas (útil para auditoría / admin).
   */
  async getAllSubscriptions(): Promise<UserSubscription[]> {
    if (this.prisma) {
      try {
        const records = await this.prisma.subscription.findMany();
        return records.map((r) => ({
          phoneNumber: r.phoneNumber,
          name: r.name || undefined,
          plan: r.plan as SubscriptionPlan,
          monthlyLimit: r.monthlyLimit,
          currentUsage: r.currentUsage,
          billingCycleMonth: r.billingCycleMonth,
          status: r.status as 'activo' | 'suspendido',
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
      } catch (err) {
        console.warn('⚠️ [Prisma] Error en getAllSubscriptions, usando memoria:', (err as Error).message);
      }
    }

    return Array.from(this.inMemorySubscriptions.values());
  }
}
