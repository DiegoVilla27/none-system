import { randomUUID } from 'node:crypto';
import { PrismaClient, Prisma } from '@prisma/client';

export type VerificationPurpose = 'register' | 'verify_phone' | 'reset_password';

export interface PhoneVerificationRecord {
  id: string;
  phoneNumber: string;
  purpose: VerificationPurpose;
  userId?: string | null;
  codeHash: string;
  attempts: number;
  payload?: Record<string, unknown> | null;
  expiresAt: Date;
  consumedAt?: Date | null;
  createdAt: Date;
}

export type NewPhoneVerification = Omit<PhoneVerificationRecord, 'id' | 'attempts' | 'consumedAt' | 'createdAt'>;

export interface IPhoneVerificationRepository {
  create(record: NewPhoneVerification): Promise<PhoneVerificationRecord>;
  findById(id: string): Promise<PhoneVerificationRecord | null>;
  findLatestActive(phoneNumber: string, purpose: VerificationPurpose): Promise<PhoneVerificationRecord | null>;
  countCreatedSince(phoneNumber: string, purpose: VerificationPurpose, since: Date): Promise<number>;
  incrementAttempts(id: string): Promise<void>;
  /** Marca el código como usado solo si no lo estaba (operación atómica). */
  consume(id: string): Promise<boolean>;
  invalidateActive(phoneNumber: string, purpose: VerificationPurpose): Promise<void>;
}

export class InMemoryPhoneVerificationRepository implements IPhoneVerificationRepository {
  private readonly records = new Map<string, PhoneVerificationRecord>();

  async create(record: NewPhoneVerification): Promise<PhoneVerificationRecord> {
    const created: PhoneVerificationRecord = {
      ...record,
      id: randomUUID(),
      attempts: 0,
      consumedAt: null,
      createdAt: new Date(),
    };
    this.records.set(created.id, created);
    return { ...created };
  }

  async findById(id: string): Promise<PhoneVerificationRecord | null> {
    const rec = this.records.get(id);
    return rec ? { ...rec } : null;
  }

  async findLatestActive(phoneNumber: string, purpose: VerificationPurpose): Promise<PhoneVerificationRecord | null> {
    const now = Date.now();
    const candidates = [...this.records.values()]
      .filter((r) => r.phoneNumber === phoneNumber && r.purpose === purpose && !r.consumedAt && r.expiresAt.getTime() > now)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return candidates[0] ? { ...candidates[0] } : null;
  }

  async countCreatedSince(phoneNumber: string, purpose: VerificationPurpose, since: Date): Promise<number> {
    return [...this.records.values()].filter(
      (r) => r.phoneNumber === phoneNumber && r.purpose === purpose && r.createdAt >= since
    ).length;
  }

  async incrementAttempts(id: string): Promise<void> {
    const rec = this.records.get(id);
    if (rec) rec.attempts += 1;
  }

  async consume(id: string): Promise<boolean> {
    const rec = this.records.get(id);
    if (!rec || rec.consumedAt) return false;
    rec.consumedAt = new Date();
    return true;
  }

  async invalidateActive(phoneNumber: string, purpose: VerificationPurpose): Promise<void> {
    for (const rec of this.records.values()) {
      if (rec.phoneNumber === phoneNumber && rec.purpose === purpose && !rec.consumedAt) {
        rec.consumedAt = new Date();
      }
    }
  }
}

export class PrismaPhoneVerificationRepository implements IPhoneVerificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private map(r: Prisma.PhoneVerificationGetPayload<object>): PhoneVerificationRecord {
    return {
      id: r.id,
      phoneNumber: r.phoneNumber,
      purpose: r.purpose as VerificationPurpose,
      userId: r.userId,
      codeHash: r.codeHash,
      attempts: r.attempts,
      payload: (r.payload as Record<string, unknown> | null) ?? null,
      expiresAt: r.expiresAt,
      consumedAt: r.consumedAt,
      createdAt: r.createdAt,
    };
  }

  async create(record: NewPhoneVerification): Promise<PhoneVerificationRecord> {
    const created = await this.prisma.phoneVerification.create({
      data: {
        phoneNumber: record.phoneNumber,
        purpose: record.purpose,
        userId: record.userId ?? null,
        codeHash: record.codeHash,
        payload: (record.payload ?? undefined) as Prisma.InputJsonValue | undefined,
        expiresAt: record.expiresAt,
      },
    });
    return this.map(created);
  }

  async findById(id: string): Promise<PhoneVerificationRecord | null> {
    const r = await this.prisma.phoneVerification.findUnique({ where: { id } });
    return r ? this.map(r) : null;
  }

  async findLatestActive(phoneNumber: string, purpose: VerificationPurpose): Promise<PhoneVerificationRecord | null> {
    const r = await this.prisma.phoneVerification.findFirst({
      where: { phoneNumber, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    return r ? this.map(r) : null;
  }

  async countCreatedSince(phoneNumber: string, purpose: VerificationPurpose, since: Date): Promise<number> {
    return this.prisma.phoneVerification.count({
      where: { phoneNumber, purpose, createdAt: { gte: since } },
    });
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.prisma.phoneVerification.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  async consume(id: string): Promise<boolean> {
    const result = await this.prisma.phoneVerification.updateMany({
      where: { id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return result.count === 1;
  }

  async invalidateActive(phoneNumber: string, purpose: VerificationPurpose): Promise<void> {
    await this.prisma.phoneVerification.updateMany({
      where: { phoneNumber, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });
  }
}
