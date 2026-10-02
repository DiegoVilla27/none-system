import { randomUUID } from 'node:crypto';
import { IOcrExtractor, RequestedScanType } from '../../../providers/ocr/ocr.interface.js';
import { IStorageService } from '../../../core/storage/storage.interface.js';
import { IExpenseRepository } from '../repositories/expense.repository.interface.js';
import { Expense, ExtractionConfidence } from '../entities/expense.entity.js';
import { UpdateExpenseDto, FilterExpenseDto } from '../dtos/expense.dto.js';
import { BadRequestError, NotFoundError } from '../../../core/errors/index.js';

export class ExpenseService {
  constructor(
    private readonly ocrExtractor: IOcrExtractor,
    private readonly storageService: IStorageService,
    private readonly expenseRepository: IExpenseRepository
  ) {}

  async scanAndCreate(
    file: Express.Multer.File,
    requestedType: RequestedScanType = 'auto',
    userId?: string
  ): Promise<Expense> {
    if (!file || !file.buffer) {
      throw new BadRequestError('Es necesario adjuntar una imagen o PDF del documento');
    }

    // 1. Guardar la imagen en almacenamiento
    const storedFile = await this.storageService.save(file);

    // 2. Extraer datos con el OCR de IA (Gemini Flash con prompt especializado para Colombia)
    const extracted = await this.ocrExtractor.extractFromBuffer(file.buffer, file.mimetype, requestedType);

    // 3. Crear entidad de gasto en COP
    const now = new Date().toISOString();
    const expense: Expense = {
      id: randomUUID(),
      userId,
      tipoDocumento: extracted.tipoDocumento,
      comercio: extracted.comercio,
      entidadFinanciera: extracted.entidadFinanciera,
      cifNif: extracted.cifNif,
      numeroReferencia: extracted.numeroReferencia,
      fecha: extracted.fecha,
      subtotal: extracted.subtotal,
      impuestos: extracted.impuestos,
      total: extracted.total,
      moneda: 'COP',
      categoria: extracted.categoria,
      lineasArticulos: extracted.lineasArticulos,
      confianzaExtraccion: extracted.confianzaExtraccion as ExtractionConfidence,
      notas: extracted.notas,
      imageUrl: storedFile.url,
      imageOriginalName: storedFile.originalName,
      estado: extracted.confianzaExtraccion === 'alta' ? 'confirmado' : 'borrador',
      createdAt: now,
      updatedAt: now,
    };

    // 4. Persistir en repositorio
    return this.expenseRepository.create(expense);
  }

  async getById(id: string): Promise<Expense> {
    const expense = await this.expenseRepository.findById(id);
    if (!expense) {
      throw new NotFoundError(`Gasto con ID ${id} no encontrado`);
    }
    return expense;
  }

  async list(filter?: FilterExpenseDto): Promise<Expense[]> {
    return this.expenseRepository.findAll(filter);
  }

  async update(id: string, dto: UpdateExpenseDto): Promise<Expense> {
    await this.getById(id);

    const updated = await this.expenseRepository.update(id, {
      ...dto,
      updatedAt: new Date().toISOString(),
    });

    if (!updated) {
      throw new NotFoundError(`Gasto con ID ${id} no encontrado`);
    }

    return updated;
  }

  async delete(id: string): Promise<void> {
    const expense = await this.getById(id);

    if (expense.imageUrl) {
      const filename = expense.imageUrl.split('/').pop();
      if (filename) {
        await this.storageService.delete(filename);
      }
    }

    await this.expenseRepository.delete(id);
  }
}
