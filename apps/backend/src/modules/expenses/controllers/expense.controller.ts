import { Request, Response } from 'express';
import { ExpenseService } from '../services/expense.service.js';
import { updateExpenseSchema, filterExpenseSchema } from '../dtos/expense.dto.js';
import { RequestedScanType } from '../../../providers/ocr/ocr.interface.js';
import { asyncHandler } from '../../../core/middlewares/async-handler.js';

export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  scan = asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Debes enviar un archivo con el campo "file" o "ticket"',
          code: 'FILE_MISSING',
        },
      });
      return;
    }

    const tipoInput = req.body.tipo || req.query.tipo || 'auto';
    const validTipo: RequestedScanType = ['factura', 'transferencia', 'auto'].includes(tipoInput)
      ? (tipoInput as RequestedScanType)
      : 'auto';

    const expense = await this.expenseService.scanAndCreate(file, validTipo);

    res.status(201).json({
      success: true,
      message: `Documento (${expense.tipoDocumento}) escaneado y procesado con éxito`,
      data: expense,
    });
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const filters = filterExpenseSchema.parse(req.query);
    const expenses = await this.expenseService.list(filters);

    res.json({
      success: true,
      data: expenses,
      meta: {
        total: expenses.length,
      },
    });
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const expense = await this.expenseService.getById(id);

    res.json({
      success: true,
      data: expense,
    });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const body = updateExpenseSchema.parse(req.body);
    const updated = await this.expenseService.update(id, body);

    res.json({
      success: true,
      message: 'Gasto actualizado con éxito',
      data: updated,
    });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    await this.expenseService.delete(id);

    res.json({
      success: true,
      message: 'Gasto eliminado con éxito',
    });
  });
}
