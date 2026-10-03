import { Request, Response } from 'express';
import { z } from 'zod';
import { SummaryService } from '../services/summary.service.js';
import { asyncHandler } from '../../../core/middlewares/async-handler.js';

const monthlyQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).default(() => new Date().getFullYear()),
  month: z.coerce.number().int().min(1).max(12).default(() => new Date().getMonth() + 1),
  userId: z.string().max(100).optional(),
});

export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  /** Un usuario solo ve su resumen; un admin puede consultar el de cualquier usuario. */
  private resolveUserId(req: Request, queryUserId?: string): string | undefined {
    return req.user!.role === 'admin' ? queryUserId : req.user!.sub;
  }

  getMonthly = asyncHandler(async (req: Request, res: Response) => {
    const { year, month, userId } = monthlyQuerySchema.parse(req.query);
    const summary = await this.summaryService.getMonthlySummary(year, month, this.resolveUserId(req, userId));

    res.json({
      success: true,
      data: summary,
    });
  });

  getWhatsAppFormat = asyncHandler(async (req: Request, res: Response) => {
    const { year, month, userId } = monthlyQuerySchema.parse(req.query);
    const summary = await this.summaryService.getMonthlySummary(year, month, this.resolveUserId(req, userId));
    const message = this.summaryService.generateWhatsAppText(summary);

    res.json({
      success: true,
      data: {
        text: message,
        summary,
      },
    });
  });
}
