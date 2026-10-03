import bcrypt from 'bcryptjs';
import { User, HABEAS_DATA_POLICY_VERSION } from '../entities/user.entity.js';
import { IUserRepository } from './user.repository.interface.js';

export class InMemoryUserRepository implements IUserRepository {
  private readonly users = new Map<string, User>();

  /**
   * @param seedDemoAdmin Crea un administrador de demostración (solo desarrollo / pruebas).
   */
  constructor(seedDemoAdmin = false) {
    if (!seedDemoAdmin) return;

    const now = new Date().toISOString();
    const demoUser: User = {
      id: 'usr-admin-demo-colombia',
      email: 'admin@none-system.com',
      passwordHash: bcrypt.hashSync('Admin123*', 10),
      name: 'Administrador Demo',
      phoneNumber: '573001234567',
      phoneVerified: true,
      sessionVersion: 0,
      role: 'admin',
      emailVerified: true,
      habeasDataConsent: {
        accepted: true,
        acceptedAt: now,
        ipAddress: '127.0.0.1',
        version: HABEAS_DATA_POLICY_VERSION,
        channel: 'web',
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

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    const existing = this.users.get(id);
    if (!existing) return null;

    const updated: User = {
      ...existing,
      ...updates,
      habeasDataConsent: updates.habeasDataConsent
        ? { ...updates.habeasDataConsent }
        : existing.habeasDataConsent,
      updatedAt: new Date().toISOString(),
    };

    this.users.set(id, updated);
    return { ...updated };
  }

  async delete(id: string): Promise<boolean> {
    return this.users.delete(id);
  }
}
