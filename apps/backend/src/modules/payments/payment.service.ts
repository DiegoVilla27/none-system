import { randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError, BadRequestError, NotFoundError, UnauthorizedError } from '../../core/errors/index.js';
import { EmailService, EmailTemplates } from '../../core/email/email.service.js';
import { maskPhone } from '../../core/security/privacy.js';
import { IUserRepository } from '../auth/repositories/user.repository.interface.js';
import { isWhatsAppOnlyAccount } from '../auth/entities/user.entity.js';
import { SubscriptionService } from '../subscriptions/subscription.service.js';
import { PLAN_CONFIGS, SubscriptionPlan, UserSubscription } from '../subscriptions/subscription.entity.js';
import { formatDateEsCO } from '../subscriptions/billing-period.js';
import { WhatsAppMessenger } from '../whatsapp/whatsapp.messenger.js';
import { IPaymentRepository, PaymentRecord, PaymentStatus } from './payment.repository.js';
import { WompiClient, WompiEvent, WompiTransaction } from './wompi.client.js';

export type CheckoutResult =
  | { mode: 'wompi'; checkoutUrl: string; reference: string }
  | { mode: 'simulated'; reference: string; subscription: UserSubscription };

export interface PaymentView {
  reference: string;
  plan: string;
  amountCop: number;
  status: PaymentStatus;
  paymentMethod: string | null;
  paidAt: string | null;
  planApplied: boolean;
}

const toView = (p: PaymentRecord): PaymentView => ({
  reference: p.reference,
  plan: p.plan,
  amountCop: p.amountCop,
  status: p.status,
  paymentMethod: p.paymentMethod,
  paidAt: p.paidAt?.toISOString() ?? null,
  planApplied: Boolean(p.planAppliedAt),
});

const formatCOP = (value: number) => `$ ${value.toLocaleString('es-CO')} COP`;

/**
 * Orquesta la compra de planes: crea la orden, envía al usuario a Wompi y activa el plan
 * únicamente cuando Wompi confirma el pago (evento firmado o consulta directa a su API).
 */
export class PaymentService {
  constructor(
    private readonly payments: IPaymentRepository,
    private readonly wompi: WompiClient,
    private readonly subscriptionService: SubscriptionService,
    private readonly userRepository: IUserRepository,
    private readonly emailService: EmailService,
    private readonly messenger: WhatsAppMessenger
  ) {}

  get mode(): 'wompi' | 'simulated' | 'disabled' {
    if (env.WOMPI_CONFIGURED) return 'wompi';
    if (env.ALLOW_SIMULATED_PAYMENTS) return 'simulated';
    return 'disabled';
  }

  async startCheckout(userId: string, plan: Exclude<SubscriptionPlan, 'gratuito'>): Promise<CheckoutResult> {
    if (this.mode === 'disabled') {
      throw new AppError('Los pagos en línea aún no están habilitados. Escríbenos por WhatsApp para activar tu plan.', 503);
    }

    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedError('Tu sesión ya no es válida');
    if (!user.phoneVerified) throw new BadRequestError('Debes verificar tu número de WhatsApp antes de activar un plan.');

    const config = PLAN_CONFIGS[plan];
    const reference = `NS-${plan.toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`;
    const email = isWhatsAppOnlyAccount(user) ? null : user.email;

    const payment = await this.payments.create({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      plan,
      amountCop: config.priceCOP,
      provider: this.mode === 'wompi' ? 'wompi' : 'simulated',
      reference,
      status: this.mode === 'wompi' ? 'PENDING' : 'SIMULATED',
      customerName: user.name,
      customerEmail: email,
    });

    if (this.mode === 'simulated') {
      const subscription = await this.applyPlan(payment);
      return { mode: 'simulated', reference, subscription: subscription! };
    }

    return {
      mode: 'wompi',
      reference,
      checkoutUrl: this.wompi.buildCheckoutUrl({
        reference,
        amountInCents: Math.round(config.priceCOP * 100),
        redirectUrl: `${env.BACKOFFICE_URL}/billing/result`,
        customerEmail: email ?? undefined,
        customerName: user.name,
        customerPhone: user.phoneNumber,
      }),
    };
  }

  /** Evento de Wompi (webhook). Lanza error si la firma no es válida. */
  async handleWompiEvent(event: WompiEvent): Promise<void> {
    if (!this.wompi.isValidEvent(event)) {
      throw new UnauthorizedError('Firma de evento inválida');
    }
    if (event.event !== 'transaction.updated' || !event.data.transaction) return;
    await this.processTransaction(event.data.transaction);
  }

  /**
   * Conciliación al volver del checkout: consulta a Wompi el estado real de la transacción.
   * Funciona aunque el webhook no llegue (por ejemplo, en desarrollo local sin túnel).
   */
  async confirmFromRedirect(transactionId: string, userId: string): Promise<PaymentView> {
    const transaction = await this.wompi.fetchTransaction(transactionId);
    if (!transaction) throw new NotFoundError('No encontramos la transacción en Wompi');

    const payment = await this.payments.findByReference(transaction.reference);
    if (!payment || payment.userId !== userId) throw new NotFoundError('Pago no encontrado');

    return toView(await this.processTransaction(transaction));
  }

  async getPayment(reference: string, userId: string): Promise<PaymentView> {
    const payment = await this.payments.findByReference(reference);
    if (!payment || payment.userId !== userId) throw new NotFoundError('Pago no encontrado');
    return toView(payment);
  }

  /**
   * Aplica el resultado de una transacción de forma idempotente.
   * Valida monto y moneda contra la orden original antes de activar cualquier plan.
   */
  private async processTransaction(tx: WompiTransaction): Promise<PaymentRecord> {
    const payment = await this.payments.findByReference(tx.reference);
    if (!payment) throw new NotFoundError('Referencia de pago desconocida');

    const expectedCents = Math.round(payment.amountCop * 100);
    if (tx.amount_in_cents !== expectedCents || tx.currency !== 'COP') {
      console.error(`🚨 Pago ${payment.reference}: monto o moneda no coinciden (recibido ${tx.amount_in_cents} ${tx.currency})`);
      return this.payments.update(payment.id, { status: 'ERROR', providerTransactionId: tx.id });
    }

    // Un pago aprobado nunca retrocede a otro estado
    const status: PaymentStatus = payment.status === 'APPROVED' ? 'APPROVED' : tx.status;
    let updated = await this.payments.update(payment.id, {
      status,
      providerTransactionId: tx.id,
      paymentMethod: tx.payment_method_type ?? payment.paymentMethod,
      paidAt: status === 'APPROVED' ? payment.paidAt ?? new Date(tx.finalized_at ?? Date.now()) : payment.paidAt,
    });

    if (status === 'APPROVED') {
      await this.applyPlan(updated);
      updated = (await this.payments.findByReference(updated.reference))!;
    }
    return updated;
  }

  /** Activa el plan una sola vez por pago, aunque lleguen eventos duplicados o concurrentes. */
  private async applyPlan(payment: PaymentRecord): Promise<UserSubscription | null> {
    const claimed = await this.payments.claimPlanApplication(payment.id);
    if (!claimed) return null;

    const plan = payment.plan as SubscriptionPlan;
    const subscription = await this.subscriptionService.upgradePlan(payment.phoneNumber, plan, payment.userId ?? undefined);
    console.log(`💳 Plan ${plan} activado para ${maskPhone(payment.phoneNumber)} (ref ${payment.reference})`);

    if (payment.provider === 'wompi') {
      const until = formatDateEsCO(subscription.currentPeriodEnd);
      const planName = PLAN_CONFIGS[plan].name;
      if (payment.customerEmail) {
        this.emailService
          .send({
            to: payment.customerEmail,
            ...EmailTemplates.planActivated(payment.customerName || 'cliente', planName, formatCOP(payment.amountCop), payment.reference, until),
          })
          .catch(() => undefined);
      }
      this.messenger
        .sendText(
          payment.phoneNumber,
          `✅ *Pago aprobado*\n\nTu *${planName}* está activo hasta el ${until}.\nTienes ${subscription.monthlyLimit} comprobantes disponibles. ¡Envíame tus facturas!`
        )
        .catch(() => undefined);
    }
    return subscription;
  }
}
