import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Estado de la conversación por número de WhatsApp: última acción (para DESHACER / CAMBIAR)
 * y solicitud pendiente de borrado de datos. Se persiste en PostgreSQL para sobrevivir
 * reinicios y funcionar con varias réplicas; la versión en memoria es solo para desarrollo/pruebas.
 */
export interface LastAction {
  kind: 'document' | 'manual';
  expenseIds: string[];
  at: number;
}

/** El último registro se puede corregir o deshacer durante 24 horas. */
export const UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Una corrección iniciada espera la respuesta del usuario durante 10 minutos. */
export const EDIT_SESSION_MS = 10 * 60 * 1000;

/** Corrección en curso: registro elegido y, si ya lo eligió, el dato que se está corrigiendo. */
export interface EditSession {
  expenseId: string;
  field: string | null;
  startedAt: number;
}
export const DELETION_CONFIRM_WINDOW_MS = 10 * 60 * 1000;
export const PROCESSED_MESSAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // Meta reintenta hasta 7 días

export interface IConversationStateStore {
  setLastAction(phone: string, action: Omit<LastAction, 'at'>): Promise<void>;
  /** Devuelve la última acción si sigue dentro de la ventana para corregirla. */
  getLastAction(phone: string): Promise<LastAction | null>;
  clearLastAction(phone: string): Promise<void>;
  requestDeletion(phone: string): Promise<void>;
  /** Consume (una sola vez) una solicitud de borrado vigente. */
  consumeDeletionRequest(phone: string): Promise<boolean>;
  forget(phone: string): Promise<void>;
  setEdit(phone: string, edit: { expenseId: string; field: string | null }): Promise<void>;
  /** Corrección en curso, si no ha expirado. */
  getEdit(phone: string): Promise<EditSession | null>;
  clearEdit(phone: string): Promise<void>;
}

export interface IProcessedMessageStore {
  /** Devuelve true si el mensaje es nuevo (y lo registra); false si ya se procesó. */
  markIfNew(messageId: string): Promise<boolean>;
}

// ----------------------------------------------------------------------------
// PostgreSQL
// ----------------------------------------------------------------------------

export class PrismaConversationStateStore implements IConversationStateStore {
  constructor(private readonly prisma: PrismaClient) {}

  async setLastAction(phone: string, action: Omit<LastAction, 'at'>): Promise<void> {
    const data = { lastActionKind: action.kind, lastActionIds: action.expenseIds, lastActionAt: new Date() };
    await this.prisma.conversationState.upsert({
      where: { phoneNumber: phone },
      create: { phoneNumber: phone, ...data },
      update: data,
    });
  }

  async getLastAction(phone: string): Promise<LastAction | null> {
    const row = await this.prisma.conversationState.findUnique({ where: { phoneNumber: phone } });
    if (!row?.lastActionAt || !row.lastActionKind || row.lastActionIds.length === 0) return null;
    if (Date.now() - row.lastActionAt.getTime() > UNDO_WINDOW_MS) return null;
    return { kind: row.lastActionKind as LastAction['kind'], expenseIds: row.lastActionIds, at: row.lastActionAt.getTime() };
  }

  async clearLastAction(phone: string): Promise<void> {
    await this.prisma.conversationState.updateMany({
      where: { phoneNumber: phone },
      data: { lastActionKind: null, lastActionIds: [], lastActionAt: null },
    });
  }

  async requestDeletion(phone: string): Promise<void> {
    await this.prisma.conversationState.upsert({
      where: { phoneNumber: phone },
      create: { phoneNumber: phone, pendingDeletionAt: new Date() },
      update: { pendingDeletionAt: new Date() },
    });
  }

  async consumeDeletionRequest(phone: string): Promise<boolean> {
    const result = await this.prisma.conversationState.updateMany({
      where: { phoneNumber: phone, pendingDeletionAt: { gte: new Date(Date.now() - DELETION_CONFIRM_WINDOW_MS) } },
      data: { pendingDeletionAt: null },
    });
    if (result.count === 0) {
      await this.prisma.conversationState.updateMany({ where: { phoneNumber: phone }, data: { pendingDeletionAt: null } });
    }
    return result.count === 1;
  }

  async forget(phone: string): Promise<void> {
    await this.prisma.conversationState.deleteMany({ where: { phoneNumber: phone } });
  }

  async setEdit(phone: string, edit: { expenseId: string; field: string | null }): Promise<void> {
    const data = { editExpenseId: edit.expenseId, editField: edit.field, editStartedAt: new Date() };
    await this.prisma.conversationState.upsert({
      where: { phoneNumber: phone },
      create: { phoneNumber: phone, ...data },
      update: data,
    });
  }

  async getEdit(phone: string): Promise<EditSession | null> {
    const row = await this.prisma.conversationState.findUnique({ where: { phoneNumber: phone } });
    if (!row?.editExpenseId || !row.editStartedAt) return null;
    if (Date.now() - row.editStartedAt.getTime() > EDIT_SESSION_MS) return null;
    return { expenseId: row.editExpenseId, field: row.editField, startedAt: row.editStartedAt.getTime() };
  }

  async clearEdit(phone: string): Promise<void> {
    await this.prisma.conversationState.updateMany({
      where: { phoneNumber: phone },
      data: { editExpenseId: null, editField: null, editStartedAt: null },
    });
  }
}

export class PrismaProcessedMessageStore implements IProcessedMessageStore {
  private lastPurge = 0;

  constructor(private readonly prisma: PrismaClient) {}

  async markIfNew(messageId: string): Promise<boolean> {
    await this.purgeOldEntries();
    try {
      await this.prisma.processedWebhookMessage.create({ data: { id: messageId } });
      return true;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return false;
      throw err;
    }
  }

  /** Limpieza como máximo una vez por hora de los ids que Meta ya no reintentará. */
  private async purgeOldEntries(): Promise<void> {
    if (Date.now() - this.lastPurge < 60 * 60 * 1000) return;
    this.lastPurge = Date.now();
    await this.prisma.processedWebhookMessage.deleteMany({
      where: { processedAt: { lt: new Date(Date.now() - PROCESSED_MESSAGE_TTL_MS) } },
    });
  }
}

// ----------------------------------------------------------------------------
// Memoria (desarrollo sin base de datos y pruebas)
// ----------------------------------------------------------------------------

export class InMemoryConversationStateStore implements IConversationStateStore {
  private readonly entries = new Map<string, { lastAction?: LastAction; pendingDeletionAt?: number; edit?: EditSession }>();

  private entry(phone: string) {
    let e = this.entries.get(phone);
    if (!e) {
      e = {};
      this.entries.set(phone, e);
    }
    return e;
  }

  async setLastAction(phone: string, action: Omit<LastAction, 'at'>): Promise<void> {
    this.entry(phone).lastAction = { ...action, at: Date.now() };
  }

  async getLastAction(phone: string): Promise<LastAction | null> {
    const action = this.entries.get(phone)?.lastAction;
    if (!action || Date.now() - action.at > UNDO_WINDOW_MS) return null;
    return action;
  }

  async clearLastAction(phone: string): Promise<void> {
    const e = this.entries.get(phone);
    if (e) e.lastAction = undefined;
  }

  async requestDeletion(phone: string): Promise<void> {
    this.entry(phone).pendingDeletionAt = Date.now();
  }

  async consumeDeletionRequest(phone: string): Promise<boolean> {
    const e = this.entries.get(phone);
    const pending = Boolean(e?.pendingDeletionAt && Date.now() - e.pendingDeletionAt <= DELETION_CONFIRM_WINDOW_MS);
    if (e) e.pendingDeletionAt = undefined;
    return pending;
  }

  async forget(phone: string): Promise<void> {
    this.entries.delete(phone);
  }

  async setEdit(phone: string, edit: { expenseId: string; field: string | null }): Promise<void> {
    this.entry(phone).edit = { ...edit, startedAt: Date.now() };
  }

  async getEdit(phone: string): Promise<EditSession | null> {
    const edit = this.entries.get(phone)?.edit;
    if (!edit || Date.now() - edit.startedAt > EDIT_SESSION_MS) return null;
    return edit;
  }

  async clearEdit(phone: string): Promise<void> {
    const e = this.entries.get(phone);
    if (e) e.edit = undefined;
  }
}

export class InMemoryProcessedMessageStore implements IProcessedMessageStore {
  private readonly seen = new Map<string, number>();

  async markIfNew(messageId: string): Promise<boolean> {
    const now = Date.now();
    if (this.seen.has(messageId)) return false;
    this.seen.set(messageId, now);
    if (this.seen.size > 20000) {
      for (const [id, ts] of this.seen) {
        if (now - ts > PROCESSED_MESSAGE_TTL_MS) this.seen.delete(id);
      }
    }
    return true;
  }
}
