import { PrismaClient } from '@prisma/client';
import { User, UserRole } from '../entities/user.entity.js';
import { IUserRepository } from './user.repository.interface.js';

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapToEntity(record: any): User {
    return {
      id: record.id,
      email: record.email,
      passwordHash: record.passwordHash,
      name: record.name,
      phoneNumber: record.phoneNumber,
      role: record.role as UserRole,
      emailVerified: record.emailVerified,
      verificationToken: record.verificationToken,
      verificationTokenExpires: record.verificationTokenExpires?.toISOString() || null,
      resetPasswordToken: record.resetPasswordToken,
      resetPasswordExpires: record.resetPasswordExpires?.toISOString() || null,
      habeasDataConsent: {
        accepted: record.habeasDataAccepted,
        acceptedAt: record.habeasDataAcceptedAt?.toISOString() || record.createdAt.toISOString(),
        ipAddress: record.habeasDataIp || undefined,
        version: (record.habeasDataVersion || 'Ley-1581-2012') as 'Ley-1581-2012',
      },
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  async create(user: User): Promise<User> {
    const created = await this.prisma.user.create({
      data: {
        id: user.id,
        email: user.email.toLowerCase(),
        passwordHash: user.passwordHash,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        emailVerified: user.emailVerified,
        verificationToken: user.verificationToken,
        verificationTokenExpires: user.verificationTokenExpires ? new Date(user.verificationTokenExpires) : null,
        resetPasswordToken: user.resetPasswordToken,
        resetPasswordExpires: user.resetPasswordExpires ? new Date(user.resetPasswordExpires) : null,
        habeasDataAccepted: user.habeasDataConsent.accepted,
        habeasDataAcceptedAt: new Date(user.habeasDataConsent.acceptedAt),
        habeasDataIp: user.habeasDataConsent.ipAddress,
        habeasDataVersion: user.habeasDataConsent.version,
      },
    });

    return this.mapToEntity(created);
  }

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { id },
    });
    return record ? this.mapToEntity(record) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    return record ? this.mapToEntity(record) : null;
  }

  async findByPhone(phoneNumber: string): Promise<User | null> {
    const clean = phoneNumber.replace(/\D/g, '');
    const record = await this.prisma.user.findFirst({
      where: { phoneNumber: clean },
    });
    return record ? this.mapToEntity(record) : null;
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    const record = await this.prisma.user.findFirst({
      where: { verificationToken: token },
    });
    return record ? this.mapToEntity(record) : null;
  }

  async findByResetToken(token: string): Promise<User | null> {
    const record = await this.prisma.user.findFirst({
      where: { resetPasswordToken: token },
    });
    return record ? this.mapToEntity(record) : null;
  }

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    const data: any = {};

    if (updates.email !== undefined) data.email = updates.email.toLowerCase();
    if (updates.passwordHash !== undefined) data.passwordHash = updates.passwordHash;
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.phoneNumber !== undefined) data.phoneNumber = updates.phoneNumber;
    if (updates.role !== undefined) data.role = updates.role;
    if (updates.emailVerified !== undefined) data.emailVerified = updates.emailVerified;
    if (updates.verificationToken !== undefined) data.verificationToken = updates.verificationToken;
    if (updates.verificationTokenExpires !== undefined) {
      data.verificationTokenExpires = updates.verificationTokenExpires ? new Date(updates.verificationTokenExpires) : null;
    }
    if (updates.resetPasswordToken !== undefined) data.resetPasswordToken = updates.resetPasswordToken;
    if (updates.resetPasswordExpires !== undefined) {
      data.resetPasswordExpires = updates.resetPasswordExpires ? new Date(updates.resetPasswordExpires) : null;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });

    return this.mapToEntity(updated);
  }
}
