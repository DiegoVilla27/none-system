import bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity.js';
import { IUserRepository } from './user.repository.interface.js';

export class InMemoryUserRepository implements IUserRepository {
  private readonly users = new Map<string, User>();

  constructor() {
    // Seed default admin/demo user for development and testing
    const defaultPasswordHash = bcrypt.hashSync('Admin123*', 10);
    const now = new Date().toISOString();

    const demoUser: User = {
      id: 'usr-admin-demo-colombia',
      email: 'admin@none-system.com',
      passwordHash: defaultPasswordHash,
      name: 'Diego Villa (Admin)',
      phoneNumber: '573001234567',
      role: 'admin',
      emailVerified: true,
      habeasDataConsent: {
        accepted: true,
        acceptedAt: now,
        ipAddress: '127.0.0.1',
        version: 'Ley-1581-2012',
      },
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(demoUser.id, demoUser);
  }

  async create(user: User): Promise<User> {
    this.users.set(user.id, { ...user });
    return { ...user };
  }

  async findById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === normalized) {
        return { ...u };
      }
    }
    return null;
  }

  async findByPhone(phoneNumber: string): Promise<User | null> {
    const clean = phoneNumber.replace(/\D/g, '');
    for (const u of this.users.values()) {
      if (u.phoneNumber.replace(/\D/g, '') === clean) {
        return { ...u };
      }
    }
    return null;
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    for (const u of this.users.values()) {
      if (u.verificationToken === token) {
        return { ...u };
      }
    }
    return null;
  }

  async findByResetToken(token: string): Promise<User | null> {
    for (const u of this.users.values()) {
      if (u.resetPasswordToken === token) {
        return { ...u };
      }
    }
    return null;
  }

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    const existing = this.users.get(id);
    if (!existing) return null;

    const updated: User = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.users.set(id, updated);
    return { ...updated };
  }
}
