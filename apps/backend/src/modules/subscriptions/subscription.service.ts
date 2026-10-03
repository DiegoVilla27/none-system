import { PrismaClient, Prisma } from '@prisma/client';
import {
  SubscriptionPlan,
  UserSubscription,
  PLAN_CONFIGS,
  normalizePlan,
  toDbPlan,
} from './subscription.entity.js';
import { calendarMonthPeriod, anchoredPeriod, cycleLabel } from './billing-period.js';
import { normalizePhone } from '../../core/security/privacy.js';

export interface QuotaReservation {
  allowed: boolean;
  subscription: UserSubscription;
  remaining: number;
}

type SubscriptionRecord = Prisma.SubscriptionGetPayload<object>;

export class SubscriptionService {
  private readonly inMemorySubscriptions = new Map<string, UserSubscription>();

  constructor(private readonly prisma?: PrismaClient | null) {}

  private toEntity(record: SubscriptionRecord): UserSubscription {
    const plan = normalizePlan(record.plan);
    return {
      userId: record.userId || undefined,
      phoneNumber: record.phoneNumber,
      name: record.name || undefined,
      plan,
      monthlyLimit: record.monthlyLimit,
      currentUsage: record.currentUsage,
      manualUsage: record.manualUsage,
      manualMonthlyLimit: PLAN_CONFIGS[plan].manualMonthlyLimit,
      billingCycleMonth: cycleLabel(record.currentPeriodStart),
      billingCycleAnchor: record.billingCycleAnchor,
      currentPeriodStart: record.currentPeriodStart.toISOString(),
      currentPeriodEnd: record.currentPeriodEnd.toISOString(),
      status: record.status === 'active' ? 'activo' : 'suspendido',
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  /**
   * Cambios necesarios cuando el periodo actual terminó:
   * - Plan gratuito: nuevo mes calendario con cupo en 0.
   * - Plan pagado: al no existir cobro recurrente, el plan vence y vuelve al gratuito.
   */
  private rolloverUpdates(plan: SubscriptionPlan, periodEnd: Date, now: Date) {
    if (now < periodEnd) return null;
    const free = calendarMonthPeriod(now);
    return {
      plan: 'gratuito' as SubscriptionPlan,
      monthlyLimit: PLAN_CONFIGS.gratuito.monthlyLimit,
      currentUsage: 0,
      manualUsage: 0,
      billingCycleAnchor: 1,
      currentPeriodStart: free.start,
      currentPeriodEnd: free.end,
      downgraded: plan !== 'gratuito',
    };
  }

  /**
   * Obtiene la suscripción asociada a un número de WhatsApp o crea una en el Plan Gratuito.
   * Aplica automáticamente el cambio de ciclo (reinicio de cupo o vencimiento de plan pagado).
   */
  async getOrCreateSubscription(phoneNumber: string, name?: string, userId?: string): Promise<UserSubscription> {
    const cleanPhone = normalizePhone(phoneNumber);
    const now = new Date();
    const freePeriod = calendarMonthPeriod(now);

    if (this.prisma) {
      let record = await this.prisma.subscription.findUnique({ where: { phoneNumber: cleanPhone } });

      if (!record) {
        try {
          record = await this.prisma.subscription.create({
            data: {
              phoneNumber: cleanPhone,
              name: name || null,
              userId: userId || null,
              plan: toDbPlan('gratuito'),
              monthlyLimit: PLAN_CONFIGS.gratuito.monthlyLimit,
              currentUsage: 0,
              billingCycleAnchor: 1,
              currentPeriodStart: freePeriod.start,
              currentPeriodEnd: freePeriod.end,
              status: 'active',
            },
          });
        } catch (err) {
          // Creación concurrente del mismo número: leer la que ganó
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            record = await this.prisma.subscription.findUniqueOrThrow({ where: { phoneNumber: cleanPhone } });
          } else {
            throw err;
          }
        }
        return this.toEntity(record);
      }

      const data: Prisma.SubscriptionUpdateInput = {};
      const rollover = this.rolloverUpdates(normalizePlan(record.plan), record.currentPeriodEnd, now);
      if (rollover) {
        data.plan = toDbPlan(rollover.plan);
        data.monthlyLimit = rollover.monthlyLimit;
        data.currentUsage = rollover.currentUsage;
        data.manualUsage = rollover.manualUsage;
        data.billingCycleAnchor = rollover.billingCycleAnchor;
        data.currentPeriodStart = rollover.currentPeriodStart;
        data.currentPeriodEnd = rollover.currentPeriodEnd;
      }
      if (name && record.name !== name) data.name = name;
      if (userId && record.userId !== userId) data.user = { connect: { id: userId } };

      if (Object.keys(data).length > 0) {
        record = await this.prisma.subscription.update({ where: { phoneNumber: cleanPhone }, data });
      }
      return this.toEntity(record);
    }

    // Persistencia en memoria (solo desarrollo)
    let sub = this.inMemorySubscriptions.get(cleanPhone);
    if (!sub) {
      sub = {
        userId,
        phoneNumber: cleanPhone,
        name,
        plan: 'gratuito',
        monthlyLimit: PLAN_CONFIGS.gratuito.monthlyLimit,
        currentUsage: 0,
        manualUsage: 0,
        manualMonthlyLimit: PLAN_CONFIGS.gratuito.manualMonthlyLimit,
        billingCycleMonth: freePeriod.cycle,
        billingCycleAnchor: 1,
        currentPeriodStart: freePeriod.start.toISOString(),
        currentPeriodEnd: freePeriod.end.toISOString(),
        status: 'activo',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      this.inMemorySubscriptions.set(cleanPhone, sub);
      return { ...sub };
    }

    const rollover = this.rolloverUpdates(sub.plan, new Date(sub.currentPeriodEnd || freePeriod.end), now);
    if (rollover) {
      sub.plan = rollover.plan;
      sub.monthlyLimit = rollover.monthlyLimit;
      sub.manualMonthlyLimit = PLAN_CONFIGS.gratuito.manualMonthlyLimit;
      sub.currentUsage = 0;
      sub.manualUsage = 0;
      sub.billingCycleAnchor = 1;
      sub.currentPeriodStart = rollover.currentPeriodStart.toISOString();
      sub.currentPeriodEnd = rollover.currentPeriodEnd.toISOString();
      sub.billingCycleMonth = cycleLabel(rollover.currentPeriodStart);
      sub.updatedAt = now.toISOString();
    }
    if (name && sub.name !== name) sub.name = name;
    if (userId && sub.userId !== userId) sub.userId = userId;
    return { ...sub };
  }

  async findByPhone(phoneNumber: string): Promise<UserSubscription | null> {
    const cleanPhone = normalizePhone(phoneNumber);
    if (this.prisma) {
      const exists = await this.prisma.subscription.findUnique({ where: { phoneNumber: cleanPhone } });
      return exists ? this.getOrCreateSubscription(cleanPhone) : null;
    }
    return this.inMemorySubscriptions.has(cleanPhone) ? this.getOrCreateSubscription(cleanPhone) : null;
  }

  /**
   * Reserva de forma atómica 1 comprobante del cupo mensual antes de procesar un documento.
   * Si el procesamiento falla, debe liberarse con releaseQuota().
   */
  async tryConsumeQuota(phoneNumber: string, name?: string, userId?: string): Promise<QuotaReservation> {
    const cleanPhone = normalizePhone(phoneNumber);
    // Aplica primero el cambio de ciclo si corresponde
    await this.getOrCreateSubscription(cleanPhone, name, userId);

    if (this.prisma) {
      const affected = await this.prisma.$executeRaw`
        UPDATE "subscriptions"
        SET "current_usage" = "current_usage" + 1, "updated_at" = NOW()
        WHERE "phone_number" = ${cleanPhone}
          AND "status" = 'active'
          AND "current_usage" < "monthly_limit"`;
      const record = await this.prisma.subscription.findUniqueOrThrow({ where: { phoneNumber: cleanPhone } });
      const subscription = this.toEntity(record);
      return {
        allowed: affected === 1,
        subscription,
        remaining: Math.max(0, subscription.monthlyLimit - subscription.currentUsage),
      };
    }

    const sub = this.inMemorySubscriptions.get(cleanPhone)!;
    const allowed = sub.status === 'activo' && sub.currentUsage < sub.monthlyLimit;
    if (allowed) {
      sub.currentUsage += 1;
      sub.updatedAt = new Date().toISOString();
    }
    return {
      allowed,
      subscription: { ...sub },
      remaining: Math.max(0, sub.monthlyLimit - sub.currentUsage),
    };
  }

  /** Devuelve al cupo un comprobante reservado cuyo procesamiento falló. */
  async releaseQuota(phoneNumber: string): Promise<void> {
    const cleanPhone = normalizePhone(phoneNumber);
    if (this.prisma) {
      await this.prisma.$executeRaw`
        UPDATE "subscriptions"
        SET "current_usage" = GREATEST("current_usage" - 1, 0), "updated_at" = NOW()
        WHERE "phone_number" = ${cleanPhone}`;
      return;
    }
    const sub = this.inMemorySubscriptions.get(cleanPhone);
    if (sub && sub.currentUsage > 0) sub.currentUsage -= 1;
  }

  /**
   * Reserva de forma atómica `count` gastos escritos. En planes con gastos escritos ilimitados
   * siempre se permite (solo se contabiliza); en el gratuito no se supera el límite mensual.
   */
  async tryConsumeManualQuota(
    phoneNumber: string,
    count: number,
    name?: string,
    userId?: string
  ): Promise<{ allowed: boolean; subscription: UserSubscription; remaining: number | null }> {
    const cleanPhone = normalizePhone(phoneNumber);
    const current = await this.getOrCreateSubscription(cleanPhone, name, userId);
    const limit = current.manualMonthlyLimit;
    const remainingOf = (sub: UserSubscription) =>
      sub.manualMonthlyLimit === null ? null : Math.max(0, sub.manualMonthlyLimit - sub.manualUsage);

    if (current.status !== 'activo') {
      return { allowed: false, subscription: current, remaining: remainingOf(current) };
    }

    if (this.prisma) {
      const affected =
        limit === null
          ? await this.prisma.$executeRaw`
              UPDATE "subscriptions" SET "manual_usage" = "manual_usage" + ${count}, "updated_at" = NOW()
              WHERE "phone_number" = ${cleanPhone} AND "status" = 'active'`
          : await this.prisma.$executeRaw`
              UPDATE "subscriptions" SET "manual_usage" = "manual_usage" + ${count}, "updated_at" = NOW()
              WHERE "phone_number" = ${cleanPhone} AND "status" = 'active'
                AND "plan" = ${toDbPlan(current.plan)} AND "manual_usage" + ${count} <= ${limit}`;
      const record = await this.prisma.subscription.findUniqueOrThrow({ where: { phoneNumber: cleanPhone } });
      const subscription = this.toEntity(record);
      return { allowed: affected === 1, subscription, remaining: remainingOf(subscription) };
    }

    const sub = this.inMemorySubscriptions.get(cleanPhone)!;
    const allowed = limit === null || sub.manualUsage + count <= limit;
    if (allowed) sub.manualUsage += count;
    return { allowed, subscription: { ...sub }, remaining: remainingOf(sub) };
  }

  /** Devuelve gastos escritos al cupo (DESHACER). */
  async releaseManualQuota(phoneNumber: string, count: number): Promise<void> {
    const cleanPhone = normalizePhone(phoneNumber);
    if (this.prisma) {
      await this.prisma.$executeRaw`
        UPDATE "subscriptions" SET "manual_usage" = GREATEST("manual_usage" - ${count}, 0), "updated_at" = NOW()
        WHERE "phone_number" = ${cleanPhone}`;
      return;
    }
    const sub = this.inMemorySubscriptions.get(cleanPhone);
    if (sub) sub.manualUsage = Math.max(0, sub.manualUsage - count);
  }

  /**
   * Asigna un plan pagado tras un pago aprobado, con un ciclo de un mes
   * anclado a la fecha exacta del pago (ej: del 15 de oct al 15 de nov).
   * El registro del pago lo gestiona PaymentService.
   */
  async upgradePlan(phoneNumber: string, plan: SubscriptionPlan, userId?: string): Promise<UserSubscription> {
    const cleanPhone = normalizePhone(phoneNumber);
    const config = PLAN_CONFIGS[plan];
    const now = new Date();
    const anchorDay = now.getDate();
    const period = anchoredPeriod(now, anchorDay);
    await this.getOrCreateSubscription(cleanPhone, undefined, userId);

    if (this.prisma) {
      const updated = await this.prisma.subscription.update({
        where: { phoneNumber: cleanPhone },
        data: {
          plan: toDbPlan(plan),
          monthlyLimit: config.monthlyLimit,
          currentUsage: 0, // Reinicia el cupo al comprar o renovar
          manualUsage: 0,
          billingCycleAnchor: anchorDay,
          currentPeriodStart: period.start,
          currentPeriodEnd: period.end,
          status: 'active',
        },
      });
      return this.toEntity(updated);
    }

    const sub = this.inMemorySubscriptions.get(cleanPhone)!;
    sub.plan = plan;
    sub.monthlyLimit = config.monthlyLimit;
    sub.manualMonthlyLimit = config.manualMonthlyLimit;
    sub.currentUsage = 0;
    sub.manualUsage = 0;
    sub.billingCycleAnchor = anchorDay;
    sub.currentPeriodStart = period.start.toISOString();
    sub.currentPeriodEnd = period.end.toISOString();
    sub.billingCycleMonth = cycleLabel(period.start);
    sub.status = 'activo';
    sub.updatedAt = now.toISOString();
    return { ...sub };
  }

  /** Elimina la suscripción de un número (derecho de supresión). */
  async deleteByPhone(phoneNumber: string): Promise<void> {
    const cleanPhone = normalizePhone(phoneNumber);
    if (this.prisma) {
      await this.prisma.subscription.deleteMany({ where: { phoneNumber: cleanPhone } });
      return;
    }
    this.inMemorySubscriptions.delete(cleanPhone);
  }

  /**
   * Consulta todas las suscripciones registradas (útil para auditoría / admin).
   */
  async getAllSubscriptions(): Promise<UserSubscription[]> {
    if (this.prisma) {
      const records = await this.prisma.subscription.findMany({ orderBy: { createdAt: 'desc' } });
      return records.map((r) => this.toEntity(r));
    }
    return Array.from(this.inMemorySubscriptions.values()).map((s) => ({ ...s }));
  }
}
