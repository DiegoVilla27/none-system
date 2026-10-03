import { PrismaClient, Prisma } from '@prisma/client';
import { User, UserRole, ConsentChannel } from '../entities/user.entity.js';
import { IUserRepository } from './user.repository.interface.js';

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapToEntity(record: Prisma.UserGetPayload<object>): User {
    return {
      id: record.id,
      email: record.email,
      passwordHash: record.passwordHash,
      name: record.name,
      phoneNumber: record.phoneNumber,
      phoneVerified: record.phoneVerified,
      sessionVersion: record.sessionVersion,
      welcomeSentAt: record.welcomeSentAt?.toISOString() ?? null,
      role: record.role as UserRole,
      emailVerified: record.emailVerified,
      verificationToken: record.verificationToken,
      verificationTokenExpires: record.verificationTokenExpires?.toISOString() || null,
      resetPasswordToken: record.resetPasswordToken,
      resetPasswordExpires: record.resetPasswordExpires?.toISOString() || null,
      habeasDataConsent: {
        accepted: record.habeasDataAccepted,
        acceptedAt: record.habeasDataAcceptedAt?.toISOString() || null,
        ipAddress: record.habeasDataIp,
        version: record.habeasDataVersion,
        channel: (record.habeasDataChannel as ConsentChannel | null) ?? null,
      },
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private consentData(consent: User['habeasDataConsent']) {
    return {
      habeasDataAccepted: consent.accepted,
      habeasDataAcceptedAt: consent.acceptedAt ? new Date(consent.acceptedAt) : null,
      habeasDataIp: consent.ipAddress ?? null,
      habeasDataVersion: consent.version ?? null,
      habeasDataChannel: consent.channel ?? null,
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
        phoneVerified: user.phoneVerified,
        sessionVersion: user.sessionVersion,
        role: user.role,
        emailVerified: user.emailVerified,
        verificationToken: user.verificationToken,
        verificationTokenExpires: user.verificationTokenExpires ? new Date(user.verificationTokenExpires) : null,
        resetPasswordToken: user.resetPasswordToken,
        resetPasswordExpires: user.resetPasswordExpires ? new Date(user.resetPasswordExpires) : null,
        ...this.consentData(user.habeasDataConsent),
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
    const record = await this.prisma.user.findUnique({
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

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    const data: Prisma.UserUpdateInput = {};

    if (updates.email !== undefined) data.email = updates.email.toLowerCase();
    if (updates.passwordHash !== undefined) data.passwordHash = updates.passwordHash;
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.phoneNumber !== undefined) data.phoneNumber = updates.phoneNumber;
    if (updates.phoneVerified !== undefined) data.phoneVerified = updates.phoneVerified;
    if (updates.sessionVersion !== undefined) data.sessionVersion = updates.sessionVersion;
    if (updates.welcomeSentAt !== undefined) data.welcomeSentAt = updates.welcomeSentAt ? new Date(updates.welcomeSentAt) : null;
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
    if (updates.habeasDataConsent !== undefined) {
      Object.assign(data, this.consentData(updates.habeasDataConsent));
    }

    try {
      const updated = await this.prisma.user.update({
        where: { id },
        data,
      });
      return this.mapToEntity(updated);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        return null;
      }
      throw err;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.user.delete({ where: { id } });
      return true;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        return false;
      }
      throw err;
    }
  }
}
