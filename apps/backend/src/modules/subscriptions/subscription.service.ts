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
   * Calcula el periodo mensual natural (del 1 al último día de mes) para el plan gratuito.
   */
  private getCalendarMonthPeriod(date: Date = new Date()): { start: Date; end: Date; cycle: string } {
    const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return {
      start,
      end,
      cycle: `${date.getFullYear()}-${month}`,
    };
  }

  /**
   * Calcula el periodo de 1 mes exacto desde la fecha de pago (ej: 15 de oct al 15 de nov).
   */
  private getAnchorPeriod(anchorDate: Date = new Date()): { start: Date; end: Date } {
    const start = new Date(anchorDate);
    const end = new Date(anchorDate);
    end.setMonth(end.getMonth() + 1);
    return { start, end };
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
    const now = new Date();
    const freePeriod = this.getCalendarMonthPeriod(now);

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
              plan: 'free',
              monthlyLimit: PLAN_CONFIGS.gratuito.monthlyLimit,
              currentUsage: 0,
              billingCycleAnchor: 1,
              currentPeriodStart: freePeriod.start,
              currentPeriodEnd: freePeriod.end,
              status: 'active',
            },
          });
        } else {
          const updates: any = {};

          // Verificar si el periodo mensual ya venció (nuevo ciclo mensual)
          if (now >= record.currentPeriodEnd) {
            if (record.plan === 'free' || record.plan === 'gratuito') {
              updates.currentUsage = 0;
              updates.currentPeriodStart = freePeriod.start;
              updates.currentPeriodEnd = freePeriod.end;
            } else {
              // Para planes de pago, avanzar el ciclo al siguiente periodo de 1 mes
              const nextPeriod = this.getAnchorPeriod(record.currentPeriodEnd);
              updates.currentUsage = 0;
              updates.currentPeriodStart = nextPeriod.start;
              updates.currentPeriodEnd = nextPeriod.end;
            }
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

        const planKey = (record.plan === 'free' ? 'gratuito' : record.plan) as SubscriptionPlan;
        const cycleMonth = `${record.currentPeriodStart.getFullYear()}-${String(record.currentPeriodStart.getMonth() + 1).padStart(2, '0')}`;

        return {
          phoneNumber: record.phoneNumber,
          name: record.name || undefined,
          plan: planKey,
          monthlyLimit: record.monthlyLimit,
          currentUsage: record.currentUsage,
          billingCycleMonth: cycleMonth,
          billingCycleAnchor: record.billingCycleAnchor,
          currentPeriodStart: record.currentPeriodStart.toISOString(),
          currentPeriodEnd: record.currentPeriodEnd.toISOString(),
          status: record.status === 'active' ? 'activo' : 'suspendido',
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
        billingCycleMonth: freePeriod.cycle,
        billingCycleAnchor: 1,
        currentPeriodStart: freePeriod.start.toISOString(),
        currentPeriodEnd: freePeriod.end.toISOString(),
        status: 'activo',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      this.inMemorySubscriptions.set(cleanPhone, sub);
      return sub;
    }

    const currentEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : freePeriod.end;
    if (now >= currentEnd) {
      sub.currentUsage = 0;
      sub.currentPeriodStart = freePeriod.start.toISOString();
      sub.currentPeriodEnd = freePeriod.end.toISOString();
      sub.billingCycleMonth = freePeriod.cycle;
      sub.updatedAt = now.toISOString();
      this.inMemorySubscriptions.set(cleanPhone, sub);
    }

    if (name && sub.name !== name) {
      sub.name = name;
      sub.updatedAt = now.toISOString();
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
    periodEnd?: string;
  }> {
    const sub = await this.getOrCreateSubscription(phoneNumber, name);

    if (sub.status !== 'activo') {
      return {
        allowed: false,
        remaining: 0,
        total: sub.monthlyLimit,
        plan: sub.plan,
        currentUsage: sub.currentUsage,
        periodEnd: sub.currentPeriodEnd,
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
      periodEnd: sub.currentPeriodEnd,
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

        const planKey = (updated.plan === 'free' ? 'gratuito' : updated.plan) as SubscriptionPlan;
        const cycleMonth = `${updated.currentPeriodStart.getFullYear()}-${String(updated.currentPeriodStart.getMonth() + 1).padStart(2, '0')}`;

        return {
          phoneNumber: updated.phoneNumber,
          name: updated.name || undefined,
          plan: planKey,
          monthlyLimit: updated.monthlyLimit,
          currentUsage: updated.currentUsage,
          billingCycleMonth: cycleMonth,
          billingCycleAnchor: updated.billingCycleAnchor,
          currentPeriodStart: updated.currentPeriodStart.toISOString(),
          currentPeriodEnd: updated.currentPeriodEnd.toISOString(),
          status: updated.status === 'active' ? 'activo' : 'suspendido',
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
   * Asigna un plan de suscripción tras un pago, estableciendo el ciclo mensual de 30 días
   * anclado a la fecha exacta del pago (ej: del 15 de oct al 15 de nov).
   */
  async upgradePlan(
    phoneNumber: string,
    plan: SubscriptionPlan,
    transaction?: PaymentTransactionRecord
  ): Promise<UserSubscription> {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const config = PLAN_CONFIGS[plan];
    const now = new Date();
    const anchorDay = now.getDate();
    const period = this.getAnchorPeriod(now);
    await this.getOrCreateSubscription(cleanPhone);

    if (this.prisma) {
      try {
        const dbPlan = plan === 'gratuito' ? 'free' : plan;

        const updated = await this.prisma.subscription.update({
          where: { phoneNumber: cleanPhone },
          data: {
            plan: dbPlan,
            monthlyLimit: config.monthlyLimit,
            currentUsage: 0, // Reinicia el cupo al comprar o renovar
            billingCycleAnchor: anchorDay,
            currentPeriodStart: period.start,
            currentPeriodEnd: period.end,
            status: 'active',
          },
        });

        if (transaction) {
          await this.prisma.paymentTransaction.create({
            data: {
              phoneNumber: cleanPhone,
              plan: dbPlan,
              amountCop: transaction.amountCOP,
              paymentMethod: transaction.paymentMethod,
              reference: transaction.reference,
              status: transaction.status || 'APPROVED',
              customerName: transaction.customerName || null,
              customerEmail: transaction.customerEmail || null,
              customerDocNumber: transaction.customerDocNumber || null,
              userId: transaction.userId || null,
            },
          });
        }

        const cycleMonth = `${period.start.getFullYear()}-${String(period.start.getMonth() + 1).padStart(2, '0')}`;

        return {
          phoneNumber: updated.phoneNumber,
          name: updated.name || undefined,
          plan,
          monthlyLimit: updated.monthlyLimit,
          currentUsage: updated.currentUsage,
          billingCycleMonth: cycleMonth,
          billingCycleAnchor: updated.billingCycleAnchor,
          currentPeriodStart: updated.currentPeriodStart.toISOString(),
          currentPeriodEnd: updated.currentPeriodEnd.toISOString(),
          status: 'activo',
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
      billingCycleMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      status: 'activo' as const,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    sub.plan = plan;
    sub.monthlyLimit = config.monthlyLimit;
    sub.currentUsage = 0;
    sub.billingCycleAnchor = anchorDay;
    sub.currentPeriodStart = period.start.toISOString();
    sub.currentPeriodEnd = period.end.toISOString();
    sub.status = 'activo';
    sub.updatedAt = now.toISOString();
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
        return records.map((r) => {
          const planKey = (r.plan === 'free' ? 'gratuito' : r.plan) as SubscriptionPlan;
          const cycleMonth = `${r.currentPeriodStart.getFullYear()}-${String(r.currentPeriodStart.getMonth() + 1).padStart(2, '0')}`;
          return {
            phoneNumber: r.phoneNumber,
            name: r.name || undefined,
            plan: planKey,
            monthlyLimit: r.monthlyLimit,
            currentUsage: r.currentUsage,
            billingCycleMonth: cycleMonth,
            billingCycleAnchor: r.billingCycleAnchor,
            currentPeriodStart: r.currentPeriodStart.toISOString(),
            currentPeriodEnd: r.currentPeriodEnd.toISOString(),
            status: r.status === 'active' ? 'activo' : 'suspendido',
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
          };
        });
      } catch (err) {
        console.warn('⚠️ [Prisma] Error en getAllSubscriptions, usando memoria:', (err as Error).message);
      }
    }

    return Array.from(this.inMemorySubscriptions.values());
  }
}
