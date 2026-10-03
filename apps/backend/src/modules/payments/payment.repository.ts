import { randomUUID } from 'node:crypto';
import { PrismaClient, Prisma } from '@prisma/client';

export type PaymentStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR' | 'SIMULATED';

export interface PaymentRecord {
  id: string;
  userId: string | null;
  phoneNumber: string;
  plan: string;
  amountCop: number;
  currency: string;
  provider: 'wompi' | 'simulated';
  providerTransactionId: string | null;
  paymentMethod: string | null;
  reference: string;
  status: PaymentStatus;
  customerName: string | null;
  customerEmail: string | null;
  paidAt: Date | null;
  planAppliedAt: Date | null;
  createdAt: Date;
}

export type NewPayment = Pick<
  PaymentRecord,
  'userId' | 'phoneNumber' | 'plan' | 'amountCop' | 'provider' | 'reference' | 'status' | 'customerName' | 'customerEmail'
>;

export type PaymentUpdate = Partial<Pick<PaymentRecord, 'status' | 'providerTransactionId' | 'paymentMethod' | 'paidAt'>>;

export interface IPaymentRepository {
  create(payment: NewPayment): Promise<PaymentRecord>;
  findByReference(reference: string): Promise<PaymentRecord | null>;
  update(id: string, updates: PaymentUpdate): Promise<PaymentRecord>;
  /** Marca de forma atómica que el plan ya se aplicó. Devuelve false si otro proceso lo hizo antes. */
  claimPlanApplication(id: string): Promise<boolean>;
}

export class PrismaPaymentRepository implements IPaymentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private map(r: Prisma.PaymentTransactionGetPayload<object>): PaymentRecord {
    return {
      id: r.id,
      userId: r.userId,
      phoneNumber: r.phoneNumber,
      plan: r.plan,
      amountCop: r.amountCop,
      currency: r.currency,
      provider: r.provider as PaymentRecord['provider'],
      providerTransactionId: r.providerTransactionId,
      paymentMethod: r.paymentMethod,
      reference: r.reference,
      status: r.status as PaymentStatus,
      customerName: r.customerName,
      customerEmail: r.customerEmail,
      paidAt: r.paidAt,
      planAppliedAt: r.planAppliedAt,
      createdAt: r.createdAt,
    };
  }

  async create(payment: NewPayment): Promise<PaymentRecord> {
    return this.map(await this.prisma.paymentTransaction.create({ data: payment }));
  }

  async findByReference(reference: string): Promise<PaymentRecord | null> {
    const r = await this.prisma.paymentTransaction.findUnique({ where: { reference } });
    return r ? this.map(r) : null;
  }

  async update(id: string, updates: PaymentUpdate): Promise<PaymentRecord> {
    return this.map(await this.prisma.paymentTransaction.update({ where: { id }, data: updates }));
  }

  async claimPlanApplication(id: string): Promise<boolean> {
    const result = await this.prisma.paymentTransaction.updateMany({
      where: { id, planAppliedAt: null },
      data: { planAppliedAt: new Date() },
    });
    return result.count === 1;
  }
}

export class InMemoryPaymentRepository implements IPaymentRepository {
  private readonly records = new Map<string, PaymentRecord>();

  async create(payment: NewPayment): Promise<PaymentRecord> {
    const record: PaymentRecord = {
      ...payment,
      id: randomUUID(),
      currency: 'COP',
      providerTransactionId: null,
      paymentMethod: null,
      paidAt: null,
      planAppliedAt: null,
      createdAt: new Date(),
    };
    this.records.set(record.id, record);
    return { ...record };
  }

  async findByReference(reference: string): Promise<PaymentRecord | null> {
    for (const r of this.records.values()) if (r.reference === reference) return { ...r };
    return null;
  }

  async update(id: string, updates: PaymentUpdate): Promise<PaymentRecord> {
    const r = this.records.get(id)!;
    Object.assign(r, updates);
    return { ...r };
  }

  async claimPlanApplication(id: string): Promise<boolean> {
    const r = this.records.get(id);
    if (!r || r.planAppliedAt) return false;
    r.planAppliedAt = new Date();
    return true;
  }
}
