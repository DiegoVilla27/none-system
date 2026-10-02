import { Request, Response } from 'express';
import { z } from 'zod';
import { SummaryService } from '../services/summary.service.js';
import { asyncHandler } from '../../../core/middlewares/async-handler.js';

const monthlyQuerySchema = z.object({
  year: z.string().optional().default(() => new Date().getFullYear().toString()).transform((val) => parseInt(val, 10)),
  month: z.string().optional().default(() => (new Date().getMonth() + 1).toString()).transform((val) => parseInt(val, 10)),
  presupuesto: z.string().optional().transform((val) => (val ? parseFloat(val) : undefined)),
});

export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  getMonthly = asyncHandler(async (req: Request, res: Response) => {
    const { year, month, presupuesto } = monthlyQuerySchema.parse(req.query);
    const summary = await this.summaryService.getMonthlySummary(year, month, presupuesto);

    res.json({
      success: true,
      data: summary,
    });
  });

  getWhatsAppFormat = asyncHandler(async (req: Request, res: Response) => {
    const { year, month, presupuesto } = monthlyQuerySchema.parse(req.query);
    const summary = await this.summaryService.getMonthlySummary(year, month, presupuesto);
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
