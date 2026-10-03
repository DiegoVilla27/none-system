import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { IUserRepository } from '../repositories/user.repository.interface.js';
import {
  User,
  HABEAS_DATA_POLICY_VERSION,
  WHATSAPP_ACCOUNT_EMAIL_DOMAIN,
} from '../entities/user.entity.js';
import { SubscriptionService } from '../../subscriptions/subscription.service.js';
import { ExpenseService } from '../../expenses/services/expense.service.js';
import { CryptoService } from '../../../core/security/crypto.service.js';
import { normalizePhone } from '../../../core/security/privacy.js';
import { Prisma } from '@prisma/client';
import { IConversationStateStore } from '../../whatsapp/conversation-state.js';

/**
 * Ciclo de vida de las cuentas: cuentas creadas desde WhatsApp, consentimiento y supresión.
 */
export class AccountService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly subscriptionService: SubscriptionService,
    private readonly expenseService: ExpenseService,
    private readonly conversationStore: IConversationStateStore
  ) {}

  /**
   * Obtiene (o crea) la cuenta asociada a un número que escribe al bot.
   * Que Meta entregue el mensaje demuestra que el remitente controla ese número.
   */
  async resolveWhatsAppUser(phoneNumber: string, profileName?: string): Promise<User> {
    const cleanPhone = normalizePhone(phoneNumber);
    const existing = await this.userRepository.findByPhone(cleanPhone);
    if (existing) return existing;

    const now = new Date().toISOString();
    try {
      return await this.userRepository.create({
        id: `usr-${randomUUID()}`,
        email: `${cleanPhone}${WHATSAPP_ACCOUNT_EMAIL_DOMAIN}`,
        // Contraseña aleatoria imposible de adivinar: estas cuentas no tienen acceso web
        passwordHash: bcrypt.hashSync(CryptoService.generateSecureToken(32), 10),
        name: (profileName || 'Usuario WhatsApp').slice(0, 120),
        phoneNumber: cleanPhone,
        phoneVerified: true,
        sessionVersion: 0,
        role: 'user',
        emailVerified: false,
        // La autorización de datos se pide explícitamente en el primer mensaje
        habeasDataConsent: { accepted: false },
        createdAt: now,
        updatedAt: now,
      });
    } catch (err) {
      // Dos mensajes simultáneos del mismo número: usar la cuenta que se creó primero
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const winner = await this.userRepository.findByPhone(cleanPhone);
        if (winner) return winner;
      }
      throw err;
    }
  }

  async markWelcomeSent(userId: string): Promise<void> {
    await this.userRepository.update(userId, { welcomeSentAt: new Date().toISOString() });
  }

  async recordWhatsAppConsent(userId: string): Promise<User | null> {
    return this.userRepository.update(userId, {
      habeasDataConsent: {
        accepted: true,
        acceptedAt: new Date().toISOString(),
        ipAddress: null,
        version: HABEAS_DATA_POLICY_VERSION,
        channel: 'whatsapp',
      },
    });
  }

  /**
   * Derecho de supresión (Art. 8 Ley 1581): elimina cuenta, suscripción, gastos y soportes.
   * Los registros de pagos se conservan sin vínculo a la cuenta por obligación contable/tributaria.
   */
  async deleteAccount(userId: string): Promise<{ deletedExpenses: number }> {
    const user = await this.userRepository.findById(userId);
    if (!user) return { deletedExpenses: 0 };

    const deletedExpenses = await this.expenseService.deleteAllForUser(user.id);
    await this.subscriptionService.deleteByPhone(user.phoneNumber);
    await this.conversationStore.forget(user.phoneNumber);
    await this.userRepository.delete(user.id);
    return { deletedExpenses };
  }
}
