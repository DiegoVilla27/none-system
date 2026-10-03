import { Request, Response } from 'express';
import { z } from 'zod';
import { SubscriptionService } from './subscription.service.js';
import { PLAN_CONFIGS, PAID_PLANS, SubscriptionPlan } from './subscription.entity.js';
import { IUserRepository } from '../auth/repositories/user.repository.interface.js';
import { PaymentService } from '../payments/payment.service.js';
import { asyncHandler } from '../../core/middlewares/async-handler.js';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../core/errors/index.js';
import { normalizePhone } from '../../core/security/privacy.js';

const checkoutSchema = z.object({
  plan: z.enum(PAID_PLANS as [Exclude<SubscriptionPlan, 'gratuito'>, ...Exclude<SubscriptionPlan, 'gratuito'>[]]),
});

export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly userRepository: IUserRepository,
    private readonly paymentService: PaymentService
  ) {}

  /**
   * Obtiene la lista de planes disponibles y sus precios en COP.
   */
  getPlans = asyncHandler(async (_req: Request, res: Response) => {
    const mode = this.paymentService.mode;
    res.json({
      status: 'success',
      data: {
        plans: Object.entries(PLAN_CONFIGS).map(([key, config]) => ({
          id: key as SubscriptionPlan,
          ...config,
        })),
        currency: 'COP',
        paymentMode: mode,
        onlinePaymentsEnabled: mode !== 'disabled',
        simulatedPayments: mode === 'simulated',
      },
    });
  });

  /**
   * Suscripción del usuario autenticado.
   */
  getMine = asyncHandler(async (req: Request, res: Response) => {
    const user = await this.userRepository.findById(req.user!.sub);
    if (!user) throw new UnauthorizedError('Tu sesión ya no es válida');
    const sub = await this.subscriptionService.getOrCreateSubscription(user.phoneNumber, user.name, user.id);
    res.json({ status: 'success', data: sub });
  });

  /**
   * Consulta administrativa del estado de suscripción de un teléfono.
   */
  getSubscriptionByPhone = asyncHandler(async (req: Request, res: Response) => {
    const phoneNumber = normalizePhone(String(req.params.phoneNumber || ''));
    if (!phoneNumber) {
      throw new BadRequestError('Número de teléfono inválido');
    }

    const sub = await this.subscriptionService.findByPhone(phoneNumber);
    if (!sub) throw new NotFoundError('No existe una suscripción para ese número');
    res.json({ status: 'success', data: sub });
  });

  /**
   * Inicia la compra de un plan para el usuario autenticado.
   * Con Wompi devuelve la URL del checkout; en modo simulado (desarrollo) activa el plan sin cobro.
   */
  processCheckout = asyncHandler(async (req: Request, res: Response) => {
    const { plan } = checkoutSchema.parse(req.body);
    const result = await this.paymentService.startCheckout(req.user!.sub, plan);

    res.status(200).json({
      status: 'success',
      message:
        result.mode === 'wompi'
          ? 'Te llevaremos a Wompi para completar el pago'
          : `${PLAN_CONFIGS[plan].name} activado en modo de prueba (sin cobro real)`,
      data: { ...result, simulated: result.mode === 'simulated' },
    });
  });
}
