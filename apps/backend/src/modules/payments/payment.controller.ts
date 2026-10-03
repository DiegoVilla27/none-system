import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../core/middlewares/async-handler.js';
import { PaymentService } from './payment.service.js';
import { WompiEvent } from './wompi.client.js';

const confirmSchema = z.object({ id: z.string().min(1).max(100) });

export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /** POST /payments/wompi/webhook — eventos firmados de Wompi. */
  wompiWebhook = asyncHandler(async (req: Request, res: Response) => {
    await this.paymentService.handleWompiEvent(req.body as WompiEvent);
    res.status(200).json({ received: true });
  });

  /** GET /payments/wompi/confirm?id=<transactionId> — conciliación al volver del checkout. */
  confirm = asyncHandler(async (req: Request, res: Response) => {
    const { id } = confirmSchema.parse(req.query);
    const payment = await this.paymentService.confirmFromRedirect(id, req.user!.sub);
    res.json({ status: 'success', data: payment });
  });

  /** GET /payments/:reference — estado de una orden propia. */
  getByReference = asyncHandler(async (req: Request, res: Response) => {
    const payment = await this.paymentService.getPayment(String(req.params.reference), req.user!.sub);
    res.json({ status: 'success', data: payment });
  });
}
