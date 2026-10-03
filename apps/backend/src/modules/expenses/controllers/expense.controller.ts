import { Request, Response } from 'express';
import { ExpenseService } from '../services/expense.service.js';
import { updateExpenseSchema, filterExpenseSchema, createManualExpenseSchema } from '../dtos/expense.dto.js';
import { RequestedScanType } from '../../../providers/ocr/ocr.interface.js';
import { asyncHandler } from '../../../core/middlewares/async-handler.js';
import { Actor } from '../entities/expense.entity.js';
import { UnauthorizedError } from '../../../core/errors/index.js';

const actorFrom = (req: Request): Actor => {
  if (!req.user?.sub) throw new UnauthorizedError('Debes iniciar sesión');
  return { userId: req.user.sub, role: req.user.role };
};

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

    const { expense, possibleDuplicateOf } = await this.expenseService.scanAndCreate(
      { buffer: file.buffer, originalName: file.originalname },
      validTipo,
      actorFrom(req)
    );

    res.status(201).json({
      success: true,
      message: `Documento (${expense.tipoDocumento}) escaneado y procesado con éxito`,
      data: expense,
      warning: possibleDuplicateOf
        ? {
            code: 'POSSIBLE_DUPLICATE',
            message: `Ya tienes un registro muy parecido: ${possibleDuplicateOf.comercio} · $ ${possibleDuplicateOf.total.toLocaleString('es-CO')} · ${possibleDuplicateOf.fecha}. Si es repetido, elimínalo.`,
            existingExpenseId: possibleDuplicateOf.id,
          }
        : undefined,
    });
  });

  createManual = asyncHandler(async (req: Request, res: Response) => {
    const dto = createManualExpenseSchema.parse(req.body);
    const expense = await this.expenseService.createManual(dto, actorFrom(req), 'web');

    res.status(201).json({
      success: true,
      message: 'Gasto manual registrado',
      data: expense,
    });
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const filters = filterExpenseSchema.parse(req.query);
    const expenses = await this.expenseService.list(filters, actorFrom(req));

    res.json({
      success: true,
      data: expenses,
      meta: {
        total: expenses.length,
      },
    });
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const expense = await this.expenseService.getById(String(req.params.id), actorFrom(req));

    res.json({
      success: true,
      data: expense,
    });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const body = updateExpenseSchema.parse(req.body);
    const updated = await this.expenseService.update(String(req.params.id), body, actorFrom(req));

    res.json({
      success: true,
      message: 'Gasto actualizado con éxito',
      data: updated,
    });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await this.expenseService.delete(String(req.params.id), actorFrom(req));

    res.json({
      success: true,
      message: 'Gasto eliminado con éxito',
    });
  });

  /**
   * GET /uploads/:filename — sirve el soporte descifrado solo a su dueño.
   */
  getDocumentFile = asyncHandler(async (req: Request, res: Response) => {
    const { buffer, contentType } = await this.expenseService.getDocumentFile(String(req.params.filename), actorFrom(req));

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length.toString());
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, no-store');
    // Permite el visor de PDF embebido del backoffice (mismo origen vía proxy)
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
    res.send(buffer);
  });
}
