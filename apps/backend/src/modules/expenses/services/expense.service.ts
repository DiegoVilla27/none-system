import { randomUUID } from 'node:crypto';
import { IOcrExtractor, ExtractedReceiptData, RequestedScanType } from '../../../providers/ocr/ocr.interface.js';
import { IStorageService, StoredFile, filenameFromUploadUrl } from '../../../core/storage/storage.interface.js';
import { IExpenseRepository } from '../repositories/expense.repository.interface.js';
import {
  Expense,
  Actor,
  isAdmin,
  ExpenseSource,
  ScannedDocumentType,
  ExpenseCategory,
} from '../entities/expense.entity.js';
import { UpdateExpenseDto, FilterExpenseDto, CreateManualExpenseDto } from '../dtos/expense.dto.js';
import { ManualExpenseDraft, guessCategory } from '../manual/manual-expense.parser.js';
import { DuplicateMatch, classifyDuplicate, fileFingerprint } from '../duplicates/duplicate-detector.js';
import { BadRequestError, NotFoundError, UnauthorizedError, AppError } from '../../../core/errors/index.js';
import { detectFileType, contentTypeForFilename } from '../../../core/security/file-signature.js';
import { todayInBogota } from '../../../core/utils/dates.js';
import { SubscriptionService } from '../../subscriptions/subscription.service.js';
import { IUserRepository } from '../../auth/repositories/user.repository.interface.js';

export class QuotaExceededError extends AppError {
  constructor(message: string) {
    super(message, 402);
  }
}

/** El comprobante ya estaba registrado (mismo archivo, CUFE o referencia). No se guarda ni consume cupo. */
export class DuplicateExpenseError extends AppError {
  constructor(public readonly match: DuplicateMatch) {
    const e = match.existing;
    const registered = new Date(e.createdAt).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
    super(
      `Este comprobante ya está registrado (${e.comercio} · $ ${e.total.toLocaleString('es-CO')} · registrado el ${registered}). No se guardó de nuevo ni se descontó de tu cupo.`,
      409,
      { existingExpenseId: e.id, reason: match.reason }
    );
  }
}

/** El plan alcanzó su límite de gastos escritos del periodo. */
export class ManualQuotaExceededError extends QuotaExceededError {
  constructor(
    public readonly limit: number,
    public readonly remaining: number,
    public readonly requested: number
  ) {
    super(
      requested > 1 && remaining > 0
        ? `Solo te quedan ${remaining} gastos escritos este mes en tu plan (intentaste registrar ${requested}).`
        : `Alcanzaste el límite de ${limit} gastos escritos de tu plan este mes. Los planes pagados tienen gastos escritos ilimitados.`
    );
  }
}

export interface ManualRegistration {
  expenses: Expense[];
  /** Gastos escritos que quedan en el periodo; null = ilimitados. */
  remaining: number | null;
  limit: number | null;
}

export interface UploadedDocument {
  buffer: Buffer;
  originalName: string;
}

/**
 * Construye la entidad de gasto a partir de los datos extraídos por la IA.
 */
export function buildExpenseFromExtraction(params: {
  extracted: ExtractedReceiptData;
  stored: StoredFile;
  userId: string;
  source: ExpenseSource;
  notes?: string | null;
  fileHash?: string | null;
}): Expense {
  const { extracted, stored } = params;
  const now = new Date().toISOString();
  const nit = extracted.nit || extracted.cifNif || null;
  return {
    id: randomUUID(),
    userId: params.userId,
    tipoDocumento: extracted.tipoDocumento,
    comercio: extracted.comercio,
    entidadFinanciera: extracted.entidadFinanciera,
    cifNif: extracted.cifNif,
    nit,
    numeroReferencia: extracted.numeroReferencia,
    cufe: extracted.cufe,
    fecha: extracted.fecha,
    subtotal: extracted.subtotal,
    baseGravable: extracted.baseGravable ?? extracted.subtotal,
    impuestos: extracted.impuestos,
    iva: extracted.iva,
    impoconsumo: extracted.impoconsumo,
    total: extracted.total,
    moneda: 'COP',
    categoria: extracted.categoria,
    lineasArticulos: extracted.lineasArticulos || [],
    confianzaExtraccion: extracted.confianzaExtraccion,
    notas: [
      params.notes ?? extracted.notas ?? null,
      extracted.fechaRequiereRevision ? 'Fecha no legible en el documento: se asignó la fecha de registro, verifícala.' : null,
    ]
      .filter(Boolean)
      .join(' ') || null,
    imageUrl: stored.url,
    imageOriginalName: stored.originalName,
    source: params.source,
    fileHash: params.fileHash ?? null,
    estado: extracted.confianzaExtraccion === 'alta' && !extracted.fechaRequiereRevision ? 'confirmado' : 'borrador',
    isDianCompliant: extracted.tipoDocumento === 'factura' && Boolean(nit) && (extracted.isDianCompliant ?? true),
    encryptedAtRest: true, // El soporte se guarda cifrado con AES-256-GCM
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Construye un gasto manual (sin soporte documental). Nunca es deducible ante la DIAN.
 */
export function buildManualExpense(params: {
  userId: string;
  source: ExpenseSource;
  descripcion: string;
  total: number;
  fecha: string;
  categoria: ExpenseCategory;
  cantidad?: number | null;
  comercio?: string | null;
  notas?: string | null;
}): Expense {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    userId: params.userId,
    tipoDocumento: 'manual',
    comercio: params.comercio?.trim() || params.descripcion,
    entidadFinanciera: null,
    cifNif: null,
    nit: null,
    numeroReferencia: null,
    cufe: null,
    fecha: params.fecha,
    subtotal: null,
    baseGravable: null,
    impuestos: null,
    iva: null,
    impoconsumo: null,
    total: params.total,
    moneda: 'COP',
    categoria: params.categoria,
    lineasArticulos: [{ descripcion: params.descripcion, precio: params.total, cantidad: params.cantidad ?? null }],
    confianzaExtraccion: 'alta',
    notas: params.notas ?? null,
    imageUrl: null,
    imageOriginalName: null,
    source: params.source,
    estado: 'confirmado',
    isDianCompliant: false,
    encryptedAtRest: false,
    createdAt: now,
    updatedAt: now,
  };
}

export class ExpenseService {
  constructor(
    private readonly ocrExtractor: IOcrExtractor,
    private readonly storageService: IStorageService,
    private readonly expenseRepository: IExpenseRepository,
    private readonly subscriptionService: SubscriptionService,
    private readonly userRepository: IUserRepository
  ) {}

  /** Devuelve el gasto solo si pertenece al actor (o si es administrador). */
  private async getOwned(id: string, actor: Actor): Promise<Expense> {
    const expense = await this.expenseRepository.findById(id);
    // Se responde 404 (no 403) para no revelar la existencia de gastos ajenos
    if (!expense || (!isAdmin(actor) && expense.userId !== actor.userId)) {
      throw new NotFoundError('Comprobante no encontrado');
    }
    return expense;
  }

  /** Mismo archivo ya enviado por el usuario (huella SHA-256). Se revisa antes de gastar cupo e IA. */
  async findFileDuplicate(userId: string, fileHash: string): Promise<DuplicateMatch | null> {
    const candidates = await this.expenseRepository.findDuplicateCandidates(userId, { fileHash });
    const existing = candidates.find((e) => e.fileHash === fileHash && e.tipoDocumento !== 'manual');
    return existing ? { level: 'strong', reason: 'archivo', existing } : null;
  }

  /** Mismo comprobante por contenido (CUFE, referencia + valor) o posible duplicado (valor + fecha + comercio). */
  async findContentDuplicate(userId: string, expense: Expense): Promise<DuplicateMatch | null> {
    const candidates = await this.expenseRepository.findDuplicateCandidates(userId, {
      cufe: expense.cufe,
      total: expense.total,
    });
    return classifyDuplicate(expense, candidates.filter((e) => e.id !== expense.id));
  }

  /**
   * Valida, guarda cifrado y extrae con IA un soporte (imagen/PDF), consumiendo 1 comprobante del cupo.
   * Rechaza comprobantes ya registrados (sin cobrar cupo) y avisa si hay uno muy parecido.
   */
  async scanAndCreate(
    file: UploadedDocument,
    requestedType: RequestedScanType,
    actor: Actor
  ): Promise<{ expense: Expense; possibleDuplicateOf?: Expense }> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestError('Es necesario adjuntar una imagen o PDF del documento');
    }

    const detected = detectFileType(file.buffer);
    if (!detected) {
      throw new BadRequestError('El archivo no es una imagen (JPG, PNG, WEBP, HEIC) o PDF válido');
    }

    const user = await this.userRepository.findById(actor.userId);
    if (!user) throw new UnauthorizedError('Tu sesión ya no es válida');
    if (!user.phoneVerified) {
      throw new BadRequestError('Verifica tu número de WhatsApp desde tu perfil para usar tu cupo de comprobantes.');
    }

    const fileHash = fileFingerprint(file.buffer);
    const sameFile = await this.findFileDuplicate(user.id, fileHash);
    if (sameFile) throw new DuplicateExpenseError(sameFile);

    const reservation = await this.subscriptionService.tryConsumeQuota(user.phoneNumber, user.name, user.id);
    if (!reservation.allowed) {
      throw new QuotaExceededError(
        `Alcanzaste el límite de ${reservation.subscription.monthlyLimit} comprobantes de tu plan este periodo. ` +
          'Aún puedes registrar gastos escritos.'
      );
    }

    let stored: StoredFile | null = null;
    try {
      stored = await this.storageService.save({
        buffer: file.buffer,
        originalName: file.originalName,
        mimeType: detected.mimeType,
        extension: detected.extension,
      });

      const extracted = await this.ocrExtractor.extractFromBuffer(file.buffer, detected.mimeType, requestedType);
      const draft = buildExpenseFromExtraction({ extracted, stored, userId: user.id, source: 'web', fileHash });

      const duplicate = await this.findContentDuplicate(user.id, draft);
      if (duplicate?.level === 'strong') throw new DuplicateExpenseError(duplicate);

      const expense = await this.expenseRepository.create(draft);
      return { expense, possibleDuplicateOf: duplicate?.existing };
    } catch (err) {
      // No cobrar el cupo ni conservar archivos de un procesamiento fallido o duplicado
      await this.subscriptionService.releaseQuota(user.phoneNumber);
      if (stored) await this.storageService.delete(stored.filename);
      throw err;
    }
  }

  async createManual(dto: CreateManualExpenseDto, actor: Actor, source: ExpenseSource = 'web'): Promise<Expense> {
    const today = todayInBogota();
    const fecha = dto.fecha ?? today;
    if (fecha > today) {
      throw new BadRequestError('La fecha del gasto no puede ser futura');
    }

    const { expenses } = await this.createManualFromDrafts(
      [
        {
          descripcion: dto.descripcion,
          monto: dto.total,
          cantidad: dto.cantidad,
          fecha,
          categoria: dto.categoria ?? guessCategory(dto.descripcion),
          comercio: dto.comercio,
        },
      ],
      actor.userId,
      source,
      dto.notas
    );
    return expenses[0];
  }

  /**
   * Registra uno o varios gastos escritos descontándolos del cupo de gastos escritos del plan
   * (30 al mes en el gratuito, ilimitados en los pagados). Si no alcanza el cupo no se registra ninguno.
   */
  async createManualFromDrafts(
    drafts: ManualExpenseDraft[],
    userId: string,
    source: ExpenseSource,
    notas?: string | null
  ): Promise<ManualRegistration> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedError('Tu sesión ya no es válida');
    if (!user.phoneVerified) {
      throw new BadRequestError('Verifica tu número de WhatsApp desde tu perfil para registrar gastos.');
    }

    const reservation = await this.subscriptionService.tryConsumeManualQuota(user.phoneNumber, drafts.length, user.name, user.id);
    const limit = reservation.subscription.manualMonthlyLimit;
    if (!reservation.allowed) {
      throw new ManualQuotaExceededError(limit ?? 0, reservation.remaining ?? 0, drafts.length);
    }

    const created: Expense[] = [];
    for (const draft of drafts) {
      created.push(
        await this.expenseRepository.create(
          buildManualExpense({
            userId,
            source,
            descripcion: draft.descripcion,
            total: draft.monto,
            fecha: draft.fecha,
            categoria: draft.categoria,
            cantidad: draft.cantidad,
            comercio: draft.comercio,
            notas,
          })
        )
      );
    }
    return { expenses: created, remaining: reservation.remaining, limit };
  }

  async getById(id: string, actor: Actor): Promise<Expense> {
    return this.getOwned(id, actor);
  }

  async list(filter: FilterExpenseDto, actor: Actor): Promise<Expense[]> {
    // Un usuario normal solo puede ver sus propios gastos; un admin puede filtrar por usuario
    const scoped: FilterExpenseDto = isAdmin(actor) ? filter : { ...filter, userId: actor.userId };
    return this.expenseRepository.findAll(scoped);
  }

  async update(id: string, dto: UpdateExpenseDto, actor: Actor): Promise<Expense> {
    const expense = await this.getOwned(id, actor);
    const changes: UpdateExpenseDto = { ...dto };

    if (expense.tipoDocumento === 'manual') {
      if (changes.tipoDocumento && changes.tipoDocumento !== 'manual') {
        throw new BadRequestError('Un gasto manual no tiene soporte: no puede convertirse en factura o transferencia.');
      }
      // Sin soporte documental nunca es deducible
      changes.isDianCompliant = false;
    } else {
      if (changes.tipoDocumento === 'manual') {
        throw new BadRequestError('Un comprobante con soporte no puede marcarse como gasto manual.');
      }
      const finalType = changes.tipoDocumento ?? expense.tipoDocumento;
      const finalNit = changes.nit !== undefined ? changes.nit : expense.nit;
      if (finalType !== 'factura' || !finalNit) {
        changes.isDianCompliant = false;
      }
    }

    const updated = await this.expenseRepository.update(id, {
      ...changes,
      updatedAt: new Date().toISOString(),
    });

    if (!updated) {
      throw new NotFoundError('Comprobante no encontrado');
    }

    return updated;
  }

  /**
   * Vuelve a leer el soporte forzando el tipo (corrección "CAMBIAR" desde WhatsApp).
   */
  async reclassify(id: string, newType: ScannedDocumentType, actor: Actor): Promise<Expense> {
    const expense = await this.getOwned(id, actor);
    const filename = filenameFromUploadUrl(expense.imageUrl);
    if (expense.tipoDocumento === 'manual' || !filename) {
      throw new BadRequestError('Este gasto no tiene un soporte para reclasificar.');
    }

    const buffer = await this.storageService.get(filename);
    const extracted = await this.ocrExtractor.extractFromBuffer(buffer, contentTypeForFilename(filename), newType);
    const rebuilt = buildExpenseFromExtraction({
      extracted: { ...extracted, tipoDocumento: newType },
      stored: { filename, originalName: expense.imageOriginalName || filename, mimeType: '', size: buffer.length, url: expense.imageUrl! },
      userId: expense.userId!,
      source: expense.source ?? 'web',
      notes: expense.notas,
    });

    const { id: _newId, createdAt: _createdAt, ...fields } = rebuilt;
    const updated = await this.expenseRepository.update(id, fields);
    if (!updated) throw new NotFoundError('Comprobante no encontrado');
    return updated;
  }

  async delete(id: string, actor: Actor): Promise<void> {
    const expense = await this.getOwned(id, actor);
    await this.expenseRepository.delete(id);

    const filename = filenameFromUploadUrl(expense.imageUrl);
    if (filename) {
      await this.storageService.delete(filename);
    }
  }

  /** Elimina todos los gastos y soportes de un usuario (derecho de supresión). */
  async deleteAllForUser(userId: string): Promise<number> {
    const expenses = await this.expenseRepository.findAll({ userId });
    for (const expense of expenses) {
      await this.expenseRepository.delete(expense.id);
      const filename = filenameFromUploadUrl(expense.imageUrl);
      if (filename) await this.storageService.delete(filename);
    }
    return expenses.length;
  }

  /**
   * Devuelve el soporte descifrado solo si pertenece al actor.
   */
  async getDocumentFile(filename: string, actor: Actor): Promise<{ buffer: Buffer; contentType: string }> {
    const url = this.storageService.getUrl(filename);
    const expense = await this.expenseRepository.findByImageUrl(url);
    if (!expense || (!isAdmin(actor) && expense.userId !== actor.userId)) {
      throw new NotFoundError('Archivo no encontrado');
    }
    const buffer = await this.storageService.get(filename);
    return { buffer, contentType: contentTypeForFilename(filename) };
  }
}
