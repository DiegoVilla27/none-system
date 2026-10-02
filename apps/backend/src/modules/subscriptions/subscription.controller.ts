import { Request, Response, NextFunction } from 'express';
import { SubscriptionService } from './subscription.service.js';
import { PLAN_CONFIGS, SubscriptionPlan } from './subscription.entity.js';

export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  /**
   * Obtiene la lista de planes disponibles y sus precios en COP.
   */
  getPlans = async (_req: Request, res: Response): Promise<void> => {
    res.json({
      status: 'success',
      data: {
        plans: Object.entries(PLAN_CONFIGS).map(([key, config]) => ({
          id: key as SubscriptionPlan,
          ...config,
        })),
        currency: 'COP',
      },
    });
  };

  /**
   * Consulta el estado de suscripción y saldo de cupos de un teléfono.
   */
  getSubscriptionByPhone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawPhone = Array.isArray(req.params.phoneNumber) ? req.params.phoneNumber[0] : req.params.phoneNumber;
      const phoneNumber = String(rawPhone || '').replace(/\D/g, '');
      if (!phoneNumber) {
        res.status(400).json({ status: 'error', message: 'Número de teléfono inválido' });
        return;
      }

      const sub = await this.subscriptionService.getOrCreateSubscription(phoneNumber);
      res.json({
        status: 'success',
        data: sub,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Simula o procesa la pasarela de pago (PSE, Wompi, Nequi, Tarjeta)
   * y activa el plan para el número de teléfono.
   */
  processCheckout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        phoneNumber,
        plan,
        paymentMethod = 'pse',
        customerName,
        customerEmail,
        customerDocNumber,
      } = req.body;

      if (!phoneNumber || !plan) {
        res.status(400).json({
          status: 'error',
          message: 'Se requieren el número de teléfono y el plan seleccionado',
        });
        return;
      }

      const validPlan = plan as SubscriptionPlan;
      if (!PLAN_CONFIGS[validPlan]) {
        res.status(400).json({
          status: 'error',
          message: `Plan inválido. Opciones: ${Object.keys(PLAN_CONFIGS).join(', ')}`,
        });
        return;
      }

      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const planConfig = PLAN_CONFIGS[validPlan];

      // Actualizar plan del usuario en el servicio
      const updatedSub = await this.subscriptionService.upgradePlan(cleanPhone, validPlan);
      if (customerName) {
        await this.subscriptionService.getOrCreateSubscription(cleanPhone, customerName);
      }

      // Referencia de pago colombiana única (estilo Wompi/Bold)
      const reference = `NONE-${validPlan.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

      res.status(200).json({
        status: 'success',
        message: `${planConfig.name} activado exitosamente para el número +${cleanPhone}`,
        data: {
          transaction: {
            reference,
            amountCOP: planConfig.priceCOP,
            paymentMethod,
            status: 'APROBADA',
            customer: {
              name: customerName || 'Usuario None System',
              email: customerEmail || 'usuario@none-system.com',
              phone: cleanPhone,
              docNumber: customerDocNumber || 'N/A',
            },
            timestamp: new Date().toISOString(),
          },
          subscription: updatedSub,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
