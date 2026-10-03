import { Expense, Actor, ExpenseCategory, EXPENSE_CATEGORIES } from '../expenses/entities/expense.entity.js';
import { ExpenseService } from '../expenses/services/expense.service.js';
import { UpdateExpenseDto } from '../expenses/dtos/expense.dto.js';
import { normalizeText, parseAmount } from '../expenses/manual/manual-expense.parser.js';
import { normalizeDocumentDate, shiftIsoDate, todayInBogota } from '../../core/utils/dates.js';
import { IConversationStateStore } from './conversation-state.js';
import { InteractiveButton, InteractiveListRow } from './whatsapp.messenger.js';

/** Datos que se pueden corregir por WhatsApp. NIT, impuestos y CUFE solo desde el panel web. */
export type CorrectableField = 'comercio' | 'total' | 'fecha' | 'categoria' | 'tipo';

/** Identificadores de los botones y listas interactivas del flujo. */
export const CORRECTION_IDS = {
  start: 'fix:start',
  done: 'fix:done',
  cancel: 'fix:cancel',
  undo: 'undo',
  field: (f: CorrectableField) => `fix:field:${f}`,
  item: (expenseId: string) => `fix:item:${expenseId}`,
  category: (index: number) => `fix:cat:${index}`,
};

/** Botones que acompañan cada registro nuevo o corregido. */
export const RECORD_BUTTONS: InteractiveButton[] = [
  { id: CORRECTION_IDS.start, title: '✏️ Corregir' },
  { id: CORRECTION_IDS.undo, title: '🗑️ Deshacer' },
];

const CATEGORY_TITLES: Partial<Record<ExpenseCategory, string>> = {
  'Transferencias y Finanzas': 'Transferencias/Finanzas',
};

const FIELD_ALIASES: Array<[CorrectableField, RegExp]> = [
  ['comercio', /^(comercio|beneficiario|descripcion|nombre|concepto)$/],
  ['total', /^(valor|total|monto|precio|valor total)$/],
  ['fecha', /^(fecha|dia)$/],
  ['categoria', /^(categoria|categorias)$/],
  ['tipo', /^(tipo|tipo de documento)$/],
];

export interface CorrectionUi {
  sendText(to: string, text: string): Promise<unknown>;
  sendButtons(to: string, body: string, buttons: InteractiveButton[]): Promise<unknown>;
  sendList(to: string, body: string, buttonText: string, rows: InteractiveListRow[], footer?: string): Promise<unknown>;
  formatCOP(value: number): string;
}

/**
 * Corrección guiada del ÚLTIMO registro enviado (ventana de 24 horas):
 * elegir el dato → escribir/elegir el valor nuevo → confirmación con botones.
 * Registros anteriores se corrigen en el panel web.
 */
export class ExpenseCorrectionFlow {
  constructor(
    private readonly ui: CorrectionUi,
    private readonly conversation: IConversationStateStore,
    private readonly expenseService: ExpenseService,
    private readonly panelUrl: string
  ) {}

  private actor(userId: string): Actor {
    return { userId, role: 'user' };
  }

  private fieldLabel(field: CorrectableField, expense: Expense): string {
    switch (field) {
      case 'comercio':
        return expense.tipoDocumento === 'manual' ? 'Descripción' : expense.tipoDocumento === 'transferencia' ? 'Beneficiario' : 'Comercio';
      case 'total':
        return 'Valor';
      case 'fecha':
        return 'Fecha';
      case 'categoria':
        return 'Categoría';
      case 'tipo':
        return 'Tipo de documento';
    }
  }

  summaryLine(expense: Expense): string {
    const icon = expense.tipoDocumento === 'transferencia' ? '🏦' : expense.tipoDocumento === 'manual' ? '✍️' : '🧾';
    const [y, m, d] = expense.fecha.split('-');
    return `${icon} ${expense.comercio} · ${this.ui.formatCOP(expense.total)} · ${expense.categoria} · ${d}/${m}/${y}`;
  }

  private async notAvailable(sender: string): Promise<void> {
    await this.ui.sendText(
      sender,
      `📝 Por aquí solo puedo corregir *el último registro que enviaste*, durante las 24 horas siguientes.\n\n` +
        `Para corregir un registro anterior entra a tu panel web:\n${this.panelUrl}`
    );
  }

  /** Expense del último envío, si sigue existiendo y está dentro de la ventana. */
  private async loadFromLastAction(sender: string, userId: string, expenseId: string): Promise<Expense | null> {
    const last = await this.conversation.getLastAction(sender);
    if (!last || !last.expenseIds.includes(expenseId)) return null;
    try {
      return await this.expenseService.getById(expenseId, this.actor(userId));
    } catch {
      return null;
    }
  }

  /** CORREGIR / CAMBIAR / botón "Corregir". */
  async start(sender: string, userId: string): Promise<void> {
    const last = await this.conversation.getLastAction(sender);
    if (!last) {
      await this.conversation.clearEdit(sender);
      return this.notAvailable(sender);
    }

    const expenses: Expense[] = [];
    for (const id of last.expenseIds) {
      const e = await this.loadFromLastAction(sender, userId, id);
      if (e) expenses.push(e);
    }
    if (expenses.length === 0) {
      await this.conversation.clearEdit(sender);
      return this.notAvailable(sender);
    }
    if (expenses.length === 1) return this.showFieldMenu(sender, expenses[0]);

    // El último envío tuvo varios gastos ("arroz 5000, aceite 12000"): primero elegir cuál
    await this.conversation.clearEdit(sender);
    await this.ui.sendList(
      sender,
      '✏️ *¿Cuál de estos gastos quieres corregir?*',
      'Elegir gasto',
      [
        ...expenses.slice(0, 9).map((e) => ({
          id: CORRECTION_IDS.item(e.id),
          title: e.comercio,
          description: `${this.ui.formatCOP(e.total)} · ${e.categoria}`,
        })),
        { id: CORRECTION_IDS.cancel, title: 'Cancelar' },
      ]
    );
  }

  private async showFieldMenu(sender: string, expense: Expense): Promise<void> {
    await this.conversation.setEdit(sender, { expenseId: expense.id, field: null });

    const fields: CorrectableField[] =
      expense.tipoDocumento === 'manual' ? ['comercio', 'total', 'fecha', 'categoria'] : ['comercio', 'total', 'fecha', 'categoria', 'tipo'];
    const rows: InteractiveListRow[] = fields.map((f) => ({
      id: CORRECTION_IDS.field(f),
      title: this.fieldLabel(f, expense),
      description:
        f === 'tipo'
          ? expense.tipoDocumento === 'transferencia'
            ? 'Es una factura o recibo'
            : 'Es una transferencia'
          : f === 'total'
          ? this.ui.formatCOP(expense.total)
          : f === 'fecha'
          ? expense.fecha.split('-').reverse().join('/')
          : f === 'categoria'
          ? expense.categoria
          : expense.comercio,
    }));
    rows.push({ id: CORRECTION_IDS.cancel, title: 'Cancelar' });

    await this.ui.sendList(
      sender,
      `✏️ *¿Qué dato quieres corregir?*\n\n${this.summaryLine(expense)}`,
      'Elegir dato',
      rows,
      expense.tipoDocumento === 'manual' ? undefined : 'NIT e impuestos: corrígelos en el panel web'
    );
  }

  private async chooseField(sender: string, userId: string, expenseId: string, field: CorrectableField): Promise<void> {
    const expense = await this.loadFromLastAction(sender, userId, expenseId);
    if (!expense) return this.notAvailable(sender);
    if (field === 'tipo' && expense.tipoDocumento === 'manual') return this.showFieldMenu(sender, expense);

    if (field === 'tipo') {
      await this.conversation.clearEdit(sender);
      const newType = expense.tipoDocumento === 'transferencia' ? 'factura' : 'transferencia';
      await this.ui.sendText(sender, '🔄 Volviendo a leer el comprobante...');
      try {
        const updated = await this.expenseService.reclassify(expense.id, newType, this.actor(userId));
        await this.confirm(sender, updated, `Tipo → ${newType === 'factura' ? 'Factura o recibo' : 'Transferencia'}`);
      } catch {
        await this.ui.sendText(sender, `⚠️ No pude volver a leer el comprobante. Puedes corregirlo en el panel web:\n${this.panelUrl}`);
      }
      return;
    }

    await this.conversation.setEdit(sender, { expenseId: expense.id, field });

    if (field === 'categoria') {
      await this.ui.sendList(
        sender,
        `🏷️ *Elige la categoría correcta*\nActual: ${expense.categoria}`,
        'Ver categorías',
        EXPENSE_CATEGORIES.map((cat, index) => ({ id: CORRECTION_IDS.category(index), title: CATEGORY_TITLES[cat] ?? cat }))
      );
      return;
    }

    const prompts: Record<Exclude<CorrectableField, 'categoria' | 'tipo'>, string> = {
      comercio:
        expense.tipoDocumento === 'manual'
          ? 'Escribe la descripción correcta, ej: *Arroz*.'
          : expense.tipoDocumento === 'transferencia'
          ? 'Escribe el nombre correcto del beneficiario.'
          : 'Escribe el nombre correcto del comercio.',
      total: 'Escribe el valor correcto, ej: *25.000* o *25 mil*.',
      fecha: 'Escribe la fecha correcta, ej: *29/10/2026* o *ayer*.',
    };
    await this.ui.sendText(sender, `✏️ ${prompts[field]}\n\n_Escribe CANCELAR para salir._`);
  }

  /** Respuestas a botones y listas del flujo. Devuelve false si el id no es del flujo. */
  async handleInteractive(sender: string, userId: string, id: string): Promise<boolean> {
    if (id === CORRECTION_IDS.start) {
      await this.start(sender, userId);
      return true;
    }
    if (id === CORRECTION_IDS.done) {
      await this.conversation.clearEdit(sender);
      await this.ui.sendText(sender, '👍 ¡Listo! Quedó guardado.');
      return true;
    }
    if (id === CORRECTION_IDS.cancel) {
      await this.cancel(sender);
      return true;
    }
    if (id.startsWith('fix:item:')) {
      const expense = await this.loadFromLastAction(sender, userId, id.slice('fix:item:'.length));
      if (!expense) await this.notAvailable(sender);
      else await this.showFieldMenu(sender, expense);
      return true;
    }

    const edit = await this.conversation.getEdit(sender);
    if (id.startsWith('fix:field:')) {
      if (!edit) await this.start(sender, userId);
      else await this.chooseField(sender, userId, edit.expenseId, id.slice('fix:field:'.length) as CorrectableField);
      return true;
    }
    if (id.startsWith('fix:cat:')) {
      const category = EXPENSE_CATEGORIES[Number(id.slice('fix:cat:'.length))];
      if (!edit || !category) await this.start(sender, userId);
      else await this.apply(sender, userId, edit.expenseId, 'categoria', category);
      return true;
    }
    return false;
  }

  /**
   * Texto escrito mientras hay una corrección en curso.
   * Devuelve false si el texto no corresponde a la corrección (se cancela y se procesa normalmente).
   */
  async handleText(sender: string, userId: string, text: string): Promise<boolean> {
    const edit = await this.conversation.getEdit(sender);
    if (!edit) return false;
    const normalized = normalizeText(text).replace(/[¿?¡!.,;:*_~"'()]/g, ' ').replace(/\s+/g, ' ').trim();

    // Menú abierto: acepta el nombre del dato escrito a mano
    if (!edit.field) {
      const field = FIELD_ALIASES.find(([, pattern]) => pattern.test(normalized))?.[0];
      if (!field) return false;
      await this.chooseField(sender, userId, edit.expenseId, field);
      return true;
    }

    if (edit.field === 'categoria') {
      const category = EXPENSE_CATEGORIES.find((c) => normalizeText(c) === normalized || normalizeText(c).startsWith(normalized));
      if (category && normalized.length >= 3) {
        await this.apply(sender, userId, edit.expenseId, 'categoria', category);
      } else {
        await this.chooseField(sender, userId, edit.expenseId, 'categoria');
      }
      return true;
    }

    const field = edit.field as CorrectableField;
    const value = this.parseValue(field, text);
    if (value === null) {
      const errors: Partial<Record<CorrectableField, string>> = {
        comercio: 'El nombre debe tener entre 2 y 120 caracteres.',
        total: 'No entendí el valor. Escríbelo así: *25.000* o *25 mil*.',
        fecha: 'No entendí la fecha (y no puede ser futura). Escríbela así: *29/10/2026* o *ayer*.',
      };
      await this.ui.sendText(sender, `⚠️ ${errors[field]}\n\n_Escribe CANCELAR para salir._`);
      return true;
    }
    await this.apply(sender, userId, edit.expenseId, field, value);
    return true;
  }

  async cancel(sender: string): Promise<boolean> {
    const edit = await this.conversation.getEdit(sender);
    await this.conversation.clearEdit(sender);
    await this.ui.sendText(sender, edit ? 'Corrección cancelada. No se cambió nada.' : 'No hay ninguna corrección en curso.');
    return Boolean(edit);
  }

  private parseValue(field: CorrectableField, raw: string): string | number | null {
    const text = raw.trim();
    if (field === 'comercio') return text.length >= 2 && text.length <= 120 ? text : null;
    if (field === 'total') return parseAmount(text);
    if (field === 'fecha') {
      const today = todayInBogota();
      const word = normalizeText(text);
      if (word === 'hoy') return today;
      if (word === 'ayer') return shiftIsoDate(today, -1);
      if (word === 'antier' || word === 'anteayer') return shiftIsoDate(today, -2);
      const date = normalizeDocumentDate(text, today);
      return date.needsReview ? null : date.date;
    }
    return null;
  }

  private async apply(sender: string, userId: string, expenseId: string, field: CorrectableField, value: string | number): Promise<void> {
    const expense = await this.loadFromLastAction(sender, userId, expenseId);
    if (!expense) {
      await this.conversation.clearEdit(sender);
      return this.notAvailable(sender);
    }

    const firstLine = expense.lineasArticulos[0];
    const changes: UpdateExpenseDto = { estado: 'confirmado' };
    let shown = String(value);

    if (field === 'comercio') {
      changes.comercio = String(value);
      if (expense.tipoDocumento === 'manual' && firstLine) {
        changes.lineasArticulos = [{ ...firstLine, descripcion: String(value) }, ...expense.lineasArticulos.slice(1)];
      }
    } else if (field === 'total') {
      changes.total = Number(value);
      if (expense.tipoDocumento === 'manual' && firstLine) {
        changes.lineasArticulos = [{ ...firstLine, precio: Number(value) }, ...expense.lineasArticulos.slice(1)];
      }
      shown = this.ui.formatCOP(Number(value));
    } else if (field === 'fecha') {
      changes.fecha = String(value);
      shown = String(value).split('-').reverse().join('/');
    } else if (field === 'categoria') {
      changes.categoria = value as ExpenseCategory;
    }

    const updated = await this.expenseService.update(expense.id, changes, this.actor(userId));
    await this.conversation.clearEdit(sender);
    await this.confirm(sender, updated, `${this.fieldLabel(field, expense)} → ${shown}`);
  }

  private async confirm(sender: string, expense: Expense, change: string): Promise<void> {
    await this.ui.sendButtons(sender, `✅ *Actualizado:* ${change}\n\n${this.summaryLine(expense)}`, [
      { id: CORRECTION_IDS.start, title: '✏️ Corregir otro' },
      { id: CORRECTION_IDS.done, title: '👍 Listo' },
    ]);
  }
}
