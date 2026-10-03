import { IOcrExtractor, IMessageInterpreter, RequestedScanType } from '../../providers/ocr/ocr.interface.js';
import { IStorageService, StoredFile } from '../../core/storage/storage.interface.js';
import { IExpenseRepository } from '../expenses/repositories/expense.repository.interface.js';
import { Expense, Actor } from '../expenses/entities/expense.entity.js';
import {
  ExpenseService,
  ManualQuotaExceededError,
  DuplicateExpenseError,
  buildExpenseFromExtraction,
} from '../expenses/services/expense.service.js';
import { DuplicateMatch, fileFingerprint } from '../expenses/duplicates/duplicate-detector.js';
import { CaptionInstructions, parseCaption } from './caption-instructions.js';
import { ManualExpenseDraft, normalizeText } from '../expenses/manual/manual-expense.parser.js';
import { SummaryService, QueryResult } from '../summaries/services/summary.service.js';
import { MessageInterpretation, fallbackInterpret } from '../expenses/query/expense-query.js';
import { SubscriptionService } from '../subscriptions/subscription.service.js';
import { PLAN_CONFIGS, USAGE_ALERT_THRESHOLD, UserSubscription } from '../subscriptions/subscription.entity.js';
import { formatDateEsCO } from '../subscriptions/billing-period.js';
import { AccountService } from '../auth/services/account.service.js';
import { User, isWhatsAppOnlyAccount } from '../auth/entities/user.entity.js';
import { env } from '../../config/env.js';
import { detectFileType } from '../../core/security/file-signature.js';
import { maskPhone, normalizePhone } from '../../core/security/privacy.js';
import { todayInBogota, shiftIsoDate, monthFromName, MONTH_NAMES_ES } from '../../core/utils/dates.js';
import { FixedWindowLimiter } from '../../core/middlewares/rate-limit.middleware.js';
import { WhatsAppMessage, MetaMediaResponse } from './whatsapp.types.js';
import { WhatsAppMessenger, InteractiveListRow } from './whatsapp.messenger.js';
import { IConversationStateStore } from './conversation-state.js';
import { ExpenseCorrectionFlow, CORRECTION_IDS, RECORD_BUTTONS } from './expense-correction.flow.js';
import { WelcomeImageProvider } from './welcome-image.js';
import { ICE_BREAKERS } from './bot-profile.js';

const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
const ALLOWED_MEDIA_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

type Command =
  | 'resumen'
  | 'cupo'
  | 'ayuda'
  | 'deshacer'
  | 'corregir'
  | 'cancelar'
  | 'privacidad'
  | 'eliminar'
  | 'confirmar_eliminar'
  | 'aceptar'
  | 'rechazar'
  | 'web'
  | 'meses'
  | 'detalle'
  | 'guia_foto'
  | 'guia_texto';

const COMMANDS: Record<string, Command> = {
  ayudame: 'ayuda',
  'como funciona': 'ayuda',
  resumen: 'resumen',
  'resumen del mes': 'resumen',
  cupo: 'cupo',
  saldo: 'cupo',
  plan: 'cupo',
  'mi plan': 'cupo',
  'mi cupo': 'cupo',
  ayuda: 'ayuda',
  menu: 'ayuda',
  hola: 'ayuda',
  buenas: 'ayuda',
  'buenos dias': 'ayuda',
  'buenas tardes': 'ayuda',
  'buenas noches': 'ayuda',
  info: 'ayuda',
  inicio: 'ayuda',
  deshacer: 'deshacer',
  'borrar ultimo': 'deshacer',
  'eliminar ultimo': 'deshacer',
  anular: 'deshacer',
  cambiar: 'corregir',
  corregir: 'corregir',
  editar: 'corregir',
  modificar: 'corregir',
  cancelar: 'cancelar',
  privacidad: 'privacidad',
  'mis datos': 'privacidad',
  politica: 'privacidad',
  'eliminar mis datos': 'eliminar',
  'borrar mis datos': 'eliminar',
  'eliminar cuenta': 'eliminar',
  'borrar cuenta': 'eliminar',
  'eliminar mi cuenta': 'eliminar',
  baja: 'eliminar',
  'confirmar eliminar': 'confirmar_eliminar',
  acepto: 'aceptar',
  'si acepto': 'aceptar',
  autorizo: 'aceptar',
  'no acepto': 'rechazar',
  'no autorizo': 'rechazar',
  web: 'web',
  backoffice: 'web',
  panel: 'web',
  meses: 'meses',
  historial: 'meses',
  detalle: 'detalle',
  ultimos: 'detalle',
  lista: 'detalle',
};

/** Tamaño máximo seguro de un mensaje de WhatsApp (límite de Meta: 4.096 caracteres). */
const MAX_MESSAGE_CHARS = 3800;
const TOP_CATEGORIES = 5;
const DETAIL_LIMIT = 10;
const MONTHS_LIMIT = 6;

/** Normaliza un mensaje para reconocer comandos exactos (sin tildes, signos ni mayúsculas). */
/** Texto comparable para comandos: sin tildes, emojis, signos ni "/" inicial (comandos del menú de WhatsApp). */
function normalizeCommandText(text: string): string {
  return normalizeText(text)
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Las sugerencias iniciales (ice breakers) llegan como texto: cada una equivale a un comando
const ICE_BREAKER_COMMANDS: Command[] = ['guia_foto', 'guia_texto', 'resumen', 'cupo'];
ICE_BREAKERS.forEach((prompt, i) => {
  COMMANDS[normalizeCommandText(prompt)] = ICE_BREAKER_COMMANDS[i];
});

export function parseCommand(text: string): Command | null {
  return COMMANDS[normalizeCommandText(text)] ?? null;
}

/** El pie de foto puede indicar el tipo: "transferencia", "factura" o "recibo". */
export function scanTypeFromCaption(caption?: string): RequestedScanType {
  if (!caption) return 'auto';
  const text = normalizeText(caption);
  if (/\b(transferencia|transferi|consignacion|pago bancario|comprobante de pago)\b/.test(text)) return 'transferencia';
  if (/\b(factura|recibo|tiquete|ticket|compra)\b/.test(text)) return 'factura';
  return 'auto';
}

export interface PeriodRequest {
  command: 'resumen' | 'detalle';
  year: number;
  /** null = año completo (solo RESUMEN). */
  month: number | null;
}

/**
 * Interpreta "RESUMEN <periodo>" y "DETALLE <periodo>": "resumen septiembre", "resumen sep 2025",
 * "resumen 2025-10", "resumen 10/2025", "resumen mes pasado" y, solo para RESUMEN, el año completo
 * ("resumen 2025"). Un mes sin año se toma como el más reciente que no sea futuro.
 */
export function parsePeriodRequest(text: string, today: string): PeriodRequest | null {
  const normalized = normalizeText(text).replace(/[¿?¡!.,;:*_~"'()]/g, ' ').replace(/\s+/g, ' ').trim();
  const match = normalized.match(/^(resumen|detalle)(?: de| del)? (.+)$/);
  if (!match) return null;
  const command = match[1] as PeriodRequest['command'];
  const arg = match[2].trim();
  const [currentYear, currentMonth] = today.split('-').map(Number);
  const withCommand = (p: { year: number; month: number | null } | null) => (p ? { command, ...p } : null);

  if (arg === 'mes pasado' || arg === 'anterior' || arg === 'mes anterior') {
    return withCommand(currentMonth === 1 ? { year: currentYear - 1, month: 12 } : { year: currentYear, month: currentMonth - 1 });
  }
  if (arg === 'este mes' || arg === 'mes actual') return withCommand({ year: currentYear, month: currentMonth });

  let m: RegExpMatchArray | null;
  if ((m = arg.match(/^(?:ano |año )?(\d{4})$/))) {
    const year = +m[1];
    return command === 'resumen' && year >= 2000 && year <= currentYear ? { command, year, month: null } : null;
  }
  if ((m = arg.match(/^(\d{4})[-/](\d{1,2})$/))) return withCommand(validPeriod(+m[1], +m[2], today));
  if ((m = arg.match(/^(\d{1,2})[-/](\d{4})$/))) return withCommand(validPeriod(+m[2], +m[1], today));
  if ((m = arg.match(/^([a-z]+)(?: de| del)?(?: (\d{4}))?$/))) {
    const month = monthFromName(m[1]);
    if (!month) return null;
    const year = m[2] ? +m[2] : month > currentMonth ? currentYear - 1 : currentYear;
    return withCommand(validPeriod(year, month, today));
  }
  return null;
}

function validPeriod(year: number, month: number, today: string): { year: number; month: number } | null {
  if (month < 1 || month > 12 || year < 2000) return null;
  const period = `${year}-${String(month).padStart(2, '0')}`;
  return period <= today.slice(0, 7) ? { year, month } : null;
}

const periodLabel = (isoDate: string): string => {
  const [y, m] = isoDate.split('-').map(Number);
  return `${MONTH_NAMES_ES[m - 1].toLowerCase()} ${y}`;
};

export class WhatsAppService {
  private readonly senderLimiter = new FixedWindowLimiter(40, 10 * 60 * 1000);
  private readonly limitNotified = new FixedWindowLimiter(1, 10 * 60 * 1000);

  constructor(
    private readonly messenger: WhatsAppMessenger,
    private readonly ocrExtractor: IOcrExtractor,
    private readonly interpreter: IMessageInterpreter,
    private readonly storageService: IStorageService,
    private readonly expenseRepository: IExpenseRepository,
    private readonly expenseService: ExpenseService,
    private readonly summaryService: SummaryService,
    private readonly subscriptionService: SubscriptionService,
    private readonly accountService: AccountService,
    private readonly conversation: IConversationStateStore
  ) {
    this.welcomeImage = new WelcomeImageProvider(this.messenger);
    this.correction = new ExpenseCorrectionFlow(
      {
        sendText: (to, text) => this.sendTextMessage(to, text),
        sendButtons: (to, body, buttons) => this.messenger.sendButtons(to, this.fitMessage(body), buttons),
        sendList: (to, body, buttonText, rows, footer) => this.messenger.sendList(to, body, buttonText, rows, footer),
        formatCOP: (value) => this.formatCOP(value),
      },
      this.conversation,
      this.expenseService,
      `${env.BACKOFFICE_URL}/expenses`
    );
  }

  private readonly correction: ExpenseCorrectionFlow;
  private readonly welcomeImage: WelcomeImageProvider;

  /**
   * Formatea valores monetarios en Pesos Colombianos (COP) para el chat de WhatsApp.
   */
  private formatCOP(amount: number): string {
    return `$ ${amount.toLocaleString('es-CO')} COP`;
  }

  private formatDay(isoDate: string): string {
    const today = todayInBogota();
    if (isoDate === today) return 'Hoy';
    if (isoDate === shiftIsoDate(today, -1)) return 'Ayer';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  }

  private get privacyUrl(): string {
    return `${env.LANDING_URL}/privacidad`;
  }

  private get termsUrl(): string {
    return `${env.LANDING_URL}/terminos`;
  }

  private get billingUrl(): string {
    return `${env.BACKOFFICE_URL}/billing`;
  }

  async sendTextMessage(to: string, messageText: string): Promise<boolean> {
    return this.messenger.sendText(to, this.fitMessage(messageText));
  }

  /** Garantiza que ningún mensaje supere el límite de WhatsApp: corta en un salto de línea y remite al panel. */
  private fitMessage(text: string): string {
    if (text.length <= MAX_MESSAGE_CHARS) return text;
    const footer = `\n…\n📄 Ver todo en el panel web: ${env.BACKOFFICE_URL}/expenses`;
    const room = MAX_MESSAGE_CHARS - footer.length;
    const cut = text.lastIndexOf('\n', room);
    return text.slice(0, cut > 0 ? cut : room) + footer;
  }

  /**
   * Descarga un archivo multimedia (imagen o PDF) desde los servidores seguros de Meta.
   */
  async downloadMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string }> {
    if (!env.WHATSAPP_API_TOKEN) {
      throw new Error('WHATSAPP_API_TOKEN no está configurado en las variables de entorno');
    }

    const infoResponse = await fetch(`https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${encodeURIComponent(mediaId)}`, {
      headers: { Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!infoResponse.ok) {
      throw new Error(`Error obteniendo metadatos del medio (${infoResponse.status})`);
    }

    const mediaInfo = (await infoResponse.json()) as MetaMediaResponse;
    if (!ALLOWED_MEDIA_MIME.includes(mediaInfo.mime_type)) {
      throw new UnsupportedMediaError();
    }
    if (mediaInfo.file_size && mediaInfo.file_size > MAX_MEDIA_BYTES) {
      throw new MediaTooLargeError();
    }
    // Solo se descargan medios alojados por Meta (evita SSRF con URLs manipuladas)
    const mediaUrl = new URL(mediaInfo.url);
    if (mediaUrl.protocol !== 'https:' || !/(^|\.)(fbsbx\.com|fbcdn\.net|facebook\.com|whatsapp\.net)$/.test(mediaUrl.hostname)) {
      throw new Error('URL de medio no confiable');
    }

    const fileResponse = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}` },
      signal: AbortSignal.timeout(30000),
    });
    if (!fileResponse.ok) {
      throw new Error(`Error descargando el medio (${fileResponse.status})`);
    }

    const buffer = Buffer.from(await fileResponse.arrayBuffer());
    if (buffer.length > MAX_MEDIA_BYTES) throw new MediaTooLargeError();
    return { buffer, mimeType: mediaInfo.mime_type };
  }

  /**
   * Procesa de forma asíncrona un mensaje entrante de un usuario.
   */
  async processIncomingMessage(message: WhatsAppMessage, senderName?: string): Promise<void> {
    const sender = normalizePhone(message.from);
    if (!sender) return;

    if (!this.senderLimiter.consume(sender)) {
      if (this.limitNotified.consume(sender)) {
        await this.sendTextMessage(sender, '⏳ Recibimos muchos mensajes seguidos. Espera unos minutos y vuelve a intentarlo.');
      }
      return;
    }

    const user = await this.accountService.resolveWhatsAppUser(sender, senderName);
    const textBody = message.type === 'text' ? message.text?.body?.trim().slice(0, 2000) || '' : '';
    const command = textBody ? parseCommand(textBody) : null;

    // Número reclamado por una cuenta web que nunca lo verificó: no se mezclan datos
    if (!user.phoneVerified) {
      await this.sendTextMessage(
        sender,
        `⚠️ Este número aparece registrado en una cuenta web que aún no lo ha verificado.\n\n` +
          `Si esa cuenta es tuya, inicia sesión en ${env.BACKOFFICE_URL}/profile y verifica tu número.\n` +
          `Si no reconoces ese registro, escríbenos para revisarlo. Por seguridad no procesaremos documentos desde este número hasta resolverlo.`
      );
      return;
    }

    // Autorización previa, expresa e informada (Ley 1581 de 2012, art. 9)
    if (!user.habeasDataConsent.accepted) {
      await this.handleConsentGate(user, sender, senderName, message, command);
      return;
    }

    // Primera apertura del chat (evento de bienvenida de Meta) de alguien que ya autorizó, p. ej. desde la web
    if (message.type === 'request_welcome') {
      if (!user.welcomeSentAt) await this.sendWelcome(user, sender, senderName, false);
      return;
    }

    // Respuestas a botones y listas (Corregir, Deshacer, elección de dato o categoría)
    if (message.type === 'interactive') {
      const reply = message.interactive?.button_reply ?? message.interactive?.list_reply;
      if (!reply?.id) return;
      if (reply.id === CORRECTION_IDS.undo) {
        await this.handleCommand('deshacer', user, sender, senderName);
        return;
      }
      if (reply.id.startsWith('cmd:') || reply.id.startsWith('consent:')) {
        const target = reply.id === 'consent:accept' ? 'aceptar' : reply.id === 'consent:reject' ? 'rechazar' : reply.id.slice(4);
        const known = parseCommand(target) ?? (target as Command);
        await this.handleCommand(known, user, sender, senderName);
        return;
      }
      if (!(await this.correction.handleInteractive(sender, user.id, reply.id))) {
        await this.sendMainMenu(sender, this.greeting(senderName));
      }
      return;
    }

    const pendingEdit = await this.conversation.getEdit(sender);

    if (message.type === 'image' || message.type === 'document') {
      const media = message.image || message.document;
      if (!media?.id) return;
      // Enviar un comprobante nuevo cancela cualquier corrección en curso
      if (pendingEdit) await this.conversation.clearEdit(sender);
      await this.handleDocument(user, sender, senderName, media.id, parseCaption(media.caption));
      return;
    }

    if (message.type === 'audio' || message.type === 'voice') {
      await this.sendTextMessage(
        sender,
        '🎙️ Por ahora no proceso notas de voz.\n\nEscríbeme el gasto, por ejemplo: *almuerzo 25000*, o envíame la foto del recibo.'
      );
      return;
    }

    if (message.type !== 'text' || !textBody) {
      await this.sendMainMenu(sender, this.greeting(senderName));
      return;
    }

    if (command) {
      // Cualquier comando (salvo los de la propia corrección) cancela la corrección en curso
      if (pendingEdit && command !== 'corregir' && command !== 'cancelar') await this.conversation.clearEdit(sender);
      await this.handleCommand(command, user, sender, senderName);
      return;
    }

    // Respuesta a una corrección en curso (ej. el valor nuevo); si no aplica, se cancela y sigue el flujo normal
    if (pendingEdit) {
      if (await this.correction.handleText(sender, user.id, textBody)) return;
      await this.conversation.clearEdit(sender);
    }

    const period = parsePeriodRequest(textBody, todayInBogota());
    if (period) {
      const reply =
        period.command === 'detalle'
          ? await this.detailText(user, period.year, period.month!)
          : period.month === null
          ? await this.yearSummaryText(user, period.year)
          : await this.summaryText(user, period.year, period.month);
      await this.sendTextMessage(sender, reply);
      return;
    }

    await this.handleFreeText(user, sender, textBody);
  }

  // ---------------------------------------------------------------------------
  // Consentimiento
  // ---------------------------------------------------------------------------

  private consentBlock(): string {
    return (
      `🔐 *Antes de empezar necesito tu autorización* (Ley 1581 de 2012) para guardar tu número, tu nombre y los comprobantes y gastos que envíes, y analizarlos con IA de Google (proveedor fuera de Colombia). Puedes eliminar tus datos cuando quieras.\n\n` +
      `📄 Política de datos: ${this.privacyUrl}\n` +
      `📄 Términos: ${this.termsUrl}`
    );
  }

  /**
   * Mensaje de bienvenida con imagen. Se envía una sola vez por persona: al abrir el chat por primera vez
   * (evento de Meta) o, si ese evento no llega, con su primer mensaje.
   */
  private async sendWelcome(user: User, sender: string, senderName: string | undefined, askConsent: boolean): Promise<void> {
    const name = senderName || (isWhatsAppOnlyAccount(user) ? '' : user.name.split(' ')[0]);
    let body = `¡Hola${name ? ` ${name}` : ''}! 👋 Soy tu asistente contable de *none-system* 🇨🇴\n\n`;
    body += `📸 Envíame fotos o PDF de tus facturas y transferencias\n`;
    body += `✍️ Escríbeme gastos sin recibo, como *arroz 5000*\n`;
    body += `📊 Pide tu *RESUMEN* cuando quieras`;
    if (askConsent) body += `\n\n${this.consentBlock()}`;

    const buttons = askConsent
      ? [
          { id: 'consent:accept', title: '✅ Acepto' },
          { id: 'consent:reject', title: 'No acepto' },
        ]
      : [
          { id: 'cmd:guia_foto', title: '📸 Cómo empiezo' },
          { id: 'cmd:resumen', title: '📊 Ver resumen' },
        ];

    await this.messenger.sendImageButtons(sender, await this.welcomeImage.resolve(), body, buttons);
    await this.accountService.markWelcomeSent(user.id);
  }

  private async handleConsentGate(
    user: User,
    sender: string,
    senderName: string | undefined,
    message: WhatsAppMessage,
    command: Command | null
  ): Promise<void> {
    const replyId = message.interactive?.button_reply?.id ?? message.interactive?.list_reply?.id;
    const action = replyId === 'consent:accept' ? 'aceptar' : replyId === 'consent:reject' ? 'rechazar' : command;

    if (action === 'aceptar') {
      await this.accountService.recordWhatsAppConsent(user.id);
      await this.sendMainMenu(sender, `✅ ¡Listo${senderName ? `, ${senderName}` : ''}! Ya puedes empezar.`);
      return;
    }

    if (action === 'rechazar') {
      if (isWhatsAppOnlyAccount(user)) {
        await this.accountService.deleteAccount(user.id);
      }
      await this.conversation.forget(sender);
      await this.sendTextMessage(
        sender,
        'Entendido. No guardaremos ni procesaremos tus datos. Si cambias de opinión, escríbenos *ACEPTO* cuando quieras.'
      );
      return;
    }

    // Primera vez: bienvenida con imagen + autorización en un solo mensaje
    if (!user.welcomeSentAt) {
      await this.sendWelcome(user, sender, senderName, true);
      if (message.type === 'image' || message.type === 'document') {
        await this.sendTextMessage(sender, '_Por tu privacidad no procesé el documento que enviaste. Reenvíalo después de tocar *Acepto*._');
      }
      return;
    }
    if (message.type === 'request_welcome') return;

    // Ya vio la bienvenida pero no ha respondido: recordatorio corto, sin imagen
    let reminder = `${this.consentBlock()}\n\nToca *Acepto* (o escribe ACEPTO) para empezar.`;
    if (message.type === 'image' || message.type === 'document') {
      reminder += `\n\n_Por tu privacidad no procesé el documento que enviaste. Reenvíalo después de aceptar._`;
    }
    await this.messenger.sendButtons(sender, reminder, [
      { id: 'consent:accept', title: '✅ Acepto' },
      { id: 'consent:reject', title: 'No acepto' },
    ]);
  }

  // ---------------------------------------------------------------------------
  // Documentos (facturas, recibos y transferencias)
  // ---------------------------------------------------------------------------

  private async handleDocument(
    user: User,
    sender: string,
    senderName: string | undefined,
    mediaId: string,
    caption: CaptionInstructions
  ): Promise<void> {
    // 1. Descargar y validar el archivo (antes de gastar cupo o IA)
    let buffer: Buffer;
    let detected: NonNullable<ReturnType<typeof detectFileType>>;
    try {
      ({ buffer } = await this.downloadMedia(mediaId));
      const type = detectFileType(buffer);
      if (!type) throw new UnsupportedMediaError();
      detected = type;
    } catch (err) {
      await this.sendTextMessage(sender, this.mediaErrorText(err));
      return;
    }

    // 2. ¿Es exactamente el mismo archivo que ya envió?
    const fileHash = fileFingerprint(buffer);
    const sameFile = await this.expenseService.findFileDuplicate(user.id, fileHash);
    if (sameFile) {
      await this.sendTextMessage(sender, this.duplicateText(sameFile));
      return;
    }

    const reservation = await this.subscriptionService.tryConsumeQuota(sender, senderName, user.id);
    if (!reservation.allowed) {
      await this.sendTextMessage(sender, this.quotaExceededText(reservation.subscription, senderName));
      return;
    }

    await this.sendTextMessage(
      sender,
      '🔍 *Digitalizando comprobante con IA...*\nEstoy extrayendo valores, NIT, comercio y fecha.'
    );

    let stored: StoredFile | null = null;
    try {
      stored = await this.storageService.save({
        buffer,
        originalName: `whatsapp.${detected.extension}`,
        mimeType: detected.mimeType,
        extension: detected.extension,
      });

      // 3. Lectura con IA + datos indicados por el usuario en el pie de foto (prevalecen)
      const extracted = await this.ocrExtractor.extractFromBuffer(buffer, detected.mimeType, caption.tipo);
      const draft = buildExpenseFromExtraction({
        extracted,
        stored,
        userId: user.id,
        source: 'whatsapp',
        fileHash,
        notes: ['Registrado vía WhatsApp.', extracted.notas].filter(Boolean).join(' '),
      });
      const applied = this.applyCaption(draft, caption, Boolean(extracted.fechaRequiereRevision));

      // 4. ¿Es el mismo comprobante por su contenido (CUFE o referencia + valor)?
      const duplicate = await this.expenseService.findContentDuplicate(user.id, draft);
      if (duplicate?.level === 'strong') throw new DuplicateExpenseError(duplicate);

      const expense = await this.expenseRepository.create(draft);
      await this.conversation.setLastAction(sender, { kind: 'document', expenseIds: [expense.id] });

      const sub = reservation.subscription;
      let responseText = this.documentSummaryText(expense, '✅ *¡Comprobante procesado con éxito!*');
      if (applied.fields.length > 0) {
        responseText += `\n✍️ _Usé los datos que indicaste: ${applied.fields.join(', ')}._\n`;
      }
      for (const invalid of caption.invalid) {
        const label = { categoria: 'la categoría', valor: 'el valor', fecha: 'la fecha', comercio: 'el nombre' }[invalid.field];
        responseText += `\n⚠️ _No entendí ${label} «${invalid.value}»; dejé lo que leyó la IA. Puedes cambiarlo con *Corregir*._\n`;
      }
      if (extracted.fechaRequiereRevision && !applied.dateFixed) {
        responseText += `\n⚠️ _No pude leer bien la fecha del documento; usé la de hoy. Corrígela con *Corregir* si no es correcta._\n`;
      } else {
        responseText += this.otherMonthNotice(expense.fecha);
      }
      if (duplicate?.level === 'possible') {
        const e = duplicate.existing;
        responseText += `\n⚠️ _Ya tienes un registro muy parecido (${e.comercio} · ${this.formatCOP(e.total)} · ${e.fecha.split('-').reverse().join('/')}). Si es repetido, toca *Deshacer*._\n`;
      }
      responseText += `\n📊 *Cupo restante:* ${reservation.remaining} de ${sub.monthlyLimit} comprobantes.`;

      const alertAt = Math.ceil(sub.monthlyLimit * USAGE_ALERT_THRESHOLD);
      if (sub.currentUsage === alertAt && reservation.remaining > 0) {
        responseText += `\n⚠️ Ya usaste el ${Math.round(USAGE_ALERT_THRESHOLD * 100)}% de tu cupo. Puedes ampliarlo en ${this.billingUrl}`;
      }

      responseText += `\n\n${this.correctionHint()}`;
      await this.messenger.sendButtons(sender, this.fitMessage(responseText), RECORD_BUTTONS);
    } catch (err) {
      await this.subscriptionService.releaseQuota(sender);
      if (stored) await this.storageService.delete(stored.filename);

      if (err instanceof DuplicateExpenseError) {
        await this.sendTextMessage(sender, this.duplicateText(err.match));
        return;
      }

      console.error(`❌ Error procesando comprobante de WhatsApp (${maskPhone(sender)}):`, (err as Error).message);
      await this.sendTextMessage(
        sender,
        '⚠️ *No logré extraer la información del comprobante.*\n\nVerifica que la imagen esté enfocada y legible, o que el PDF no tenga contraseña, y vuelve a intentarlo. No se descontó de tu cupo.'
      );
    }
  }

  private mediaErrorText(err: unknown): string {
    if (err instanceof UnsupportedMediaError) return '⚠️ Solo puedo leer imágenes (JPG, PNG, WEBP, HEIC) o PDF. No se descontó de tu cupo.';
    if (err instanceof MediaTooLargeError) return '⚠️ El archivo supera 10 MB. Envía una foto o un PDF más liviano. No se descontó de tu cupo.';
    console.error('❌ Error descargando medio de WhatsApp:', (err as Error).message);
    return '⚠️ No pude descargar el archivo que enviaste. Intenta enviarlo de nuevo. No se descontó de tu cupo.';
  }

  /**
   * Aplica al borrador los datos que el usuario escribió en el pie de foto.
   * Devuelve qué datos se usaron y si con ello quedó resuelta una fecha ilegible.
   */
  private applyCaption(draft: Expense, caption: CaptionInstructions, dateNeedsReview: boolean): { fields: string[]; dateFixed: boolean } {
    const fields: string[] = [];
    let dateFixed = false;
    if (caption.comercio) {
      draft.comercio = caption.comercio;
      fields.push(draft.tipoDocumento === 'transferencia' ? 'beneficiario' : 'comercio');
    }
    if (caption.categoria) {
      draft.categoria = caption.categoria;
      fields.push('categoría');
    }
    if (caption.total) {
      draft.total = caption.total;
      fields.push('valor');
    }
    if (caption.fecha) {
      draft.fecha = caption.fecha;
      fields.push('fecha');
      if (dateNeedsReview) {
        dateFixed = true;
        draft.notas = (draft.notas ?? '').replace(/\s*Fecha no legible[^.]*\./, '').trim() || null;
        if (draft.confianzaExtraccion === 'alta') draft.estado = 'confirmado';
      }
    }
    if (caption.nota) {
      draft.notas = [draft.notas, `Nota: ${caption.nota}`].filter(Boolean).join(' ');
      fields.push('nota');
    }
    return { fields, dateFixed };
  }

  private duplicateText(match: DuplicateMatch): string {
    const e = match.existing;
    const registered = new Date(e.createdAt).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
    const reasons: Record<DuplicateMatch['reason'], string> = {
      archivo: 'Es el mismo archivo que ya enviaste',
      cufe: 'Tiene el mismo CUFE de una factura que ya registraste',
      referencia: `Tiene la misma referencia${e.numeroReferencia ? ` (${e.numeroReferencia})` : ''} y el mismo valor que uno que ya registraste`,
      datos: 'Coincide con uno que ya registraste',
    };
    const icon = e.tipoDocumento === 'transferencia' ? '🏦' : '🧾';
    return (
      `⚠️ *Este comprobante ya está registrado*\n\n${reasons[match.reason]}:\n` +
      `${icon} ${e.comercio} · ${this.formatCOP(e.total)} · ${e.fecha.split('-').reverse().join('/')}\n` +
      `_Registrado el ${registered}._\n\n` +
      `No lo guardé de nuevo y *no se descontó de tu cupo*.`
    );
  }

  private documentSummaryText(expense: Expense, header: string): string {
    const isTransfer = expense.tipoDocumento === 'transferencia';
    let text = `${header}\n\n`;
    text += `📋 *Tipo:* ${isTransfer ? 'Transferencia / pago bancario' : 'Factura o recibo de compra'}\n`;
    text += `🏪 *${isTransfer ? 'Beneficiario' : 'Comercio'}:* ${expense.comercio}\n`;
    if (expense.entidadFinanciera) text += `🏦 *Medio / banco:* ${expense.entidadFinanciera}\n`;
    text += `💰 *Total:* ${this.formatCOP(expense.total)}\n`;

    if (expense.baseGravable) text += `💵 *Base gravable:* ${this.formatCOP(expense.baseGravable)}\n`;
    if (expense.iva) text += `📊 *IVA:* ${this.formatCOP(expense.iva)}\n`;
    if (expense.impoconsumo) text += `🍽️ *Impoconsumo (8%):* ${this.formatCOP(expense.impoconsumo)}\n`;

    text += `📅 *Fecha:* ${expense.fecha}\n`;
    text += `🏷️ *Categoría:* ${expense.categoria}\n`;
    if (expense.nit) text += `🆔 *NIT:* ${expense.nit}\n`;
    if (expense.numeroReferencia) text += `🔢 *Referencia:* ${expense.numeroReferencia}\n`;
    if (expense.cufe) text += `🛡️ *CUFE:* ${expense.cufe.slice(0, 16)}...\n`;
    if (expense.isDianCompliant) {
      text += `🏛️ *Requisitos formales de factura (Art. 771-2 E.T.):* identificados\n`;
    }

    if (expense.lineasArticulos.length > 0 && !isTransfer) {
      text += `\n📦 *Conceptos:*\n`;
      expense.lineasArticulos.slice(0, 4).forEach((item) => {
        text += `• ${item.cantidad && item.cantidad > 1 ? `${item.cantidad}x ` : ''}${item.descripcion} (${this.formatCOP(item.precio)})\n`;
      });
      if (expense.lineasArticulos.length > 4) {
        text += `• _...y ${expense.lineasArticulos.length - 4} conceptos más._\n`;
      }
    }

    if (expense.confianzaExtraccion === 'baja') {
      text += `\n🔎 _La imagen no era muy clara: revisa los valores en tu panel web._\n`;
    }
    return text;
  }

  /** Aviso cuando la fecha del documento no es del mes actual (el registro va al resumen de su mes). */
  private otherMonthNotice(isoDate: string): string {
    if (isoDate.slice(0, 7) === todayInBogota().slice(0, 7)) return '';
    const label = periodLabel(isoDate);
    return `\n📅 _La fecha es de ${label}: quedó en el resumen de ${label}, no en el de este mes. Si la fecha está mal, corrígela en el panel web._\n`;
  }

  private correctionHint(): string {
    return `¿Algo quedó mal? Toca *Corregir* (o escribe CORREGIR) durante las próximas 24 horas.`;
  }

  private quotaExceededText(sub: UserSubscription, senderName?: string): string {
    const config = PLAN_CONFIGS[sub.plan];
    let msg = `⚠️ *Límite de comprobantes alcanzado*\n\n`;
    msg += `¡Hola${senderName ? ` ${senderName}` : ''}! Usaste los *${sub.monthlyLimit} comprobantes* de tu *${config.name}* en este periodo.\n\n`;
    msg += sub.manualMonthlyLimit === null
      ? `✍️ Puedes seguir registrando *gastos escritos* sin límite (ej: *arroz 5000*).\n\n`
      : `✍️ Aún puedes registrar *${Math.max(0, sub.manualMonthlyLimit - sub.manualUsage)} gastos escritos* este mes (ej: *arroz 5000*).\n\n`;
    msg += `🚀 Para seguir digitalizando facturas y transferencias, amplía tu plan en:\n${this.billingUrl}\n\n`;
    msg += `🔄 ${this.renewalText(sub)}`;
    return msg;
  }

  private renewalText(sub: UserSubscription): string {
    const end = formatDateEsCO(sub.currentPeriodEnd);
    return sub.plan === 'gratuito'
      ? `Tu cupo gratuito se renueva el ${end}.`
      : `Tu plan está activo hasta el ${end}. Si no lo renuevas, pasarás al Plan Gratuito.`;
  }

  // ---------------------------------------------------------------------------
  // Gastos manuales (texto)
  // ---------------------------------------------------------------------------

  /**
   * Texto libre que no es un comando: la IA decide si es un gasto para registrar, una consulta
   * sobre sus gastos u otra cosa. Si la IA no está disponible se usa el intérprete de respaldo.
   */
  private async handleFreeText(user: User, sender: string, text: string): Promise<void> {
    // Solo signos o emojis: no vale la pena consultar a la IA
    if (!/[a-z0-9]/i.test(normalizeText(text))) {
      await this.sendMainMenu(sender, '🤔 No entendí tu mensaje.');
      return;
    }

    const today = todayInBogota();
    let interpretation: MessageInterpretation;
    try {
      interpretation = await this.interpreter.interpretMessage(text, today);
    } catch {
      interpretation = fallbackInterpret(text, today);
    }

    if (interpretation.intent === 'gasto') {
      await this.handleManualExpense(user, sender, interpretation.gastos);
    } else if (interpretation.intent === 'consulta') {
      const result = await this.summaryService.runQuery(user.id, interpretation.consulta);
      await this.sendTextMessage(sender, this.queryText(result));
    } else {
      await this.sendMainMenu(sender, '🤔 No entendí tu mensaje.');
    }
  }

  private async handleManualExpense(user: User, sender: string, drafts: ManualExpenseDraft[]): Promise<void> {
    let registration;
    try {
      registration = await this.expenseService.createManualFromDrafts(drafts, user.id, 'whatsapp');
    } catch (err) {
      if (err instanceof ManualQuotaExceededError) {
        let msg = `⚠️ *Límite de gastos escritos*\n\n${err.message}\n\n`;
        msg += `🚀 Con un plan pago tus gastos escritos son ilimitados: ${this.billingUrl}`;
        await this.sendTextMessage(sender, msg);
        return;
      }
      throw err;
    }
    const created = registration.expenses;
    await this.conversation.setLastAction(sender, { kind: 'manual', expenseIds: created.map((e) => e.id) });

    const total = created.reduce((acc, e) => acc + e.total, 0);
    let reply = created.length === 1 ? '✅ *Gasto registrado*\n\n' : `✅ *${created.length} gastos registrados*\n\n`;
    for (const e of created) {
      const qty = e.lineasArticulos[0]?.cantidad && e.lineasArticulos[0].cantidad > 1 ? `${e.lineasArticulos[0].cantidad}x ` : '';
      const desc = e.lineasArticulos[0]?.descripcion || e.comercio;
      reply += `✍️ ${qty}${desc} · ${this.formatCOP(e.total)} · ${e.categoria} · ${this.formatDay(e.fecha)}\n`;
    }
    if (created.length > 1) reply += `\n💰 *Total:* ${this.formatCOP(total)}\n`;
    const otherMonth = created.find((e) => e.fecha.slice(0, 7) !== todayInBogota().slice(0, 7));
    if (otherMonth) reply += this.otherMonthNotice(otherMonth.fecha);
    reply += `\n_Gasto sin soporte: sirve para tu control personal, no como soporte ante la DIAN._`;
    if (registration.remaining !== null) {
      reply += `\n✍️ Te quedan *${registration.remaining} de ${registration.limit}* gastos escritos este mes.`;
    }
    reply += `\n\n${this.correctionHint()}`;
    await this.messenger.sendButtons(sender, this.fitMessage(reply), RECORD_BUTTONS);
  }

  // ---------------------------------------------------------------------------
  // Comandos
  // ---------------------------------------------------------------------------

  private async handleCommand(command: Command, user: User, sender: string, senderName?: string): Promise<void> {
    const actor: Actor = { userId: user.id, role: 'user' };

    switch (command) {
      case 'resumen': {
        const [year, month] = todayInBogota().split('-').map(Number);
        await this.sendTextMessage(sender, await this.summaryText(user, year, month));
        return;
      }

      case 'cupo': {
        const sub = await this.subscriptionService.getOrCreateSubscription(sender, senderName, user.id);
        const remaining = Math.max(0, sub.monthlyLimit - sub.currentUsage);
        let msg = `📊 *Estado de tu cuenta*\n\n`;
        msg += `📦 *Plan:* ${PLAN_CONFIGS[sub.plan].name}\n`;
        msg += `📸 *Comprobantes con foto o PDF:* ${sub.currentUsage} de ${sub.monthlyLimit} (te quedan ${remaining})\n`;
        msg +=
          sub.manualMonthlyLimit === null
            ? `✍️ *Gastos escritos:* ${sub.manualUsage} este mes (ilimitados)\n`
            : `✍️ *Gastos escritos:* ${sub.manualUsage} de ${sub.manualMonthlyLimit} (te quedan ${Math.max(0, sub.manualMonthlyLimit - sub.manualUsage)})\n`;
        msg += `🔄 ${this.renewalText(sub)}`;
        if (sub.plan === 'gratuito') {
          msg += `\n\n💡 ¿Necesitas más? Los planes pagos amplían los comprobantes y hacen ilimitados los gastos escritos: ${this.billingUrl}`;
        }
        await this.sendTextMessage(sender, msg);
        return;
      }

      case 'deshacer': {
        await this.conversation.clearEdit(sender);
        const last = await this.conversation.getLastAction(sender);
        if (!last) {
          await this.sendTextMessage(
            sender,
            `Por aquí solo puedo deshacer *el último registro que enviaste*, durante las 24 horas siguientes.\n\nPara eliminar un registro anterior entra a tu panel web:\n${env.BACKOFFICE_URL}/expenses`
          );
          return;
        }
        let removed = 0;
        for (const id of last.expenseIds) {
          try {
            await this.expenseService.delete(id, actor);
            removed += 1;
          } catch {
            // Ya eliminado desde el panel web
          }
        }
        await this.conversation.clearLastAction(sender);
        let msg = removed === 1 ? '🗑️ Eliminé el último registro.' : `🗑️ Eliminé ${removed} registros.`;
        if (last.kind === 'document') {
          msg += '\n_El comprobante ya procesado por la IA no se reintegra al cupo._';
        } else if (removed > 0) {
          // Los gastos escritos deshechos sí se devuelven al cupo
          await this.subscriptionService.releaseManualQuota(sender, removed);
        }
        await this.sendTextMessage(sender, msg);
        return;
      }

      case 'corregir':
        await this.correction.start(sender, user.id);
        return;

      case 'cancelar':
        await this.correction.cancel(sender);
        return;

      case 'privacidad':
        await this.sendTextMessage(
          sender,
          `🔐 *Tus datos personales*\n\n` +
            `Tratamos tus datos según la Ley 1581 de 2012. Tienes derecho a conocer, actualizar, rectificar y suprimir tu información, y a revocar tu autorización.\n\n` +
            `• Para eliminar tu cuenta y todos tus comprobantes escribe *ELIMINAR MIS DATOS*.\n` +
            `• Política de tratamiento de datos: ${this.privacyUrl}`
        );
        return;

      case 'eliminar':
        await this.conversation.requestDeletion(sender);
        await this.sendTextMessage(
          sender,
          `⚠️ *Vas a eliminar tu cuenta*\n\nSe borrarán de forma permanente tus comprobantes, imágenes, gastos y tu plan. Esta acción no se puede deshacer.\n\n` +
            `Para confirmar responde *CONFIRMAR ELIMINAR* en los próximos 10 minutos.`
        );
        return;

      case 'confirmar_eliminar': {
        const confirmed = await this.conversation.consumeDeletionRequest(sender);
        if (!confirmed) {
          await this.sendTextMessage(sender, 'No hay una solicitud de eliminación pendiente. Escribe *ELIMINAR MIS DATOS* para iniciarla.');
          return;
        }
        const { deletedExpenses } = await this.accountService.deleteAccount(user.id);
        await this.conversation.forget(sender);
        await this.sendTextMessage(
          sender,
          `✅ Eliminamos tu cuenta y ${deletedExpenses} registro(s) de forma permanente.\n\nSi vuelves a escribirnos, te pediremos de nuevo tu autorización. ¡Gracias por usar none-system!`
        );
        return;
      }

      case 'aceptar':
        await this.sendTextMessage(sender, '✅ Ya tenemos registrada tu autorización. ¡Envíame un comprobante o escribe un gasto!');
        return;

      case 'rechazar':
        await this.sendTextMessage(
          sender,
          'Si deseas revocar tu autorización y eliminar tus datos, escribe *ELIMINAR MIS DATOS*.'
        );
        return;

      case 'web':
        await this.sendTextMessage(
          sender,
          isWhatsAppOnlyAccount(user)
            ? `💻 Para ver tus gastos en el panel web, crea tu acceso con este mismo número en:\n${env.BACKOFFICE_URL}/register\n\nTus registros de WhatsApp aparecerán automáticamente.`
            : `💻 Ingresa a tu panel web en:\n${env.BACKOFFICE_URL}`
        );
        return;

      case 'guia_foto':
        await this.sendTextMessage(
          sender,
          `📸 *Cómo registrar una factura o transferencia*\n\n` +
            `1. Toma una foto nítida del comprobante (o envía el PDF).\n` +
            `2. Envíamela por aquí.\n` +
            `3. En segundos te muestro comercio, valor, IVA y fecha.\n\n` +
            `💡 En el texto de la foto puedes indicarme datos: *categoria transporte*, *beneficiario Juan Pérez*, *valor 50 mil*.\n\n` +
            `Si algo queda mal, toca *Corregir* en la confirmación.`
        );
        return;

      case 'guia_texto':
        await this.sendTextMessage(
          sender,
          `✍️ *Cómo anotar un gasto sin recibo*\n\n` +
            `Escríbeme el concepto y el valor:\n• *arroz 5000*\n• *almuerzo 25 mil*\n• *ayer taxi 12.000*\n• *arroz 5000, aceite 12000* (varios a la vez)\n\n` +
            `Quedan en tu resumen, aunque sin recibo no sirven como soporte ante la DIAN.`
        );
        return;

      case 'meses':
        await this.sendTextMessage(sender, await this.monthsText(user));
        return;

      case 'detalle': {
        const [year, month] = todayInBogota().split('-').map(Number);
        await this.sendTextMessage(sender, await this.detailText(user, year, month));
        return;
      }

      case 'ayuda':
      default:
        await this.sendMainMenu(sender, this.greeting(senderName));
    }
  }

  /**
   * Resumen de un mes según la FECHA DEL DOCUMENTO (criterio contable). Para el mes en curso
   * también avisa cuántos registros de este mes pertenecen a otros meses.
   */
  private async summaryText(user: User, year: number, month: number): Promise<string> {
    const summary = await this.summaryService.getMonthlySummary(year, month, user.id);
    const [currentYear, currentMonth] = todayInBogota().split('-').map(Number);
    const isCurrent = year === currentYear && month === currentMonth;

    let text = `📊 *Resumen · ${MONTH_NAMES_ES[month - 1]} ${year}*\n`;
    text += `_Según la fecha de cada factura, recibo o gasto._\n\n`;

    if (summary.numGastos === 0) {
      text += isCurrent ? `_Aún no tienes registros con fecha de este mes._\n` : `_No tienes registros con fecha de ese mes._\n`;
    } else {
      text += `💰 *Total:* ${this.formatCOP(summary.totalGastado)} (${summary.numGastos} ${summary.numGastos === 1 ? 'registro' : 'registros'})\n`;
      if (summary.numFacturas > 0) text += `🧾 *Facturas y recibos:* ${this.formatCOP(summary.totalFacturas)} (${summary.numFacturas})\n`;
      if (summary.numTransferencias > 0) text += `🏦 *Transferencias:* ${this.formatCOP(summary.totalTransferencias)} (${summary.numTransferencias})\n`;
      if (summary.numManuales > 0) text += `✍️ *Gastos escritos:* ${this.formatCOP(summary.totalManuales)} (${summary.numManuales})\n`;

      if (summary.categorias.length > 0) {
        text += `\n📌 *Por categoría:*\n`;
        summary.categorias.slice(0, TOP_CATEGORIES).forEach((cat) => {
          text += `• ${cat.categoria}: ${this.formatCOP(cat.total)} (${cat.porcentaje}%)\n`;
        });
        const rest = summary.categorias.slice(TOP_CATEGORIES);
        if (rest.length > 0) {
          const restTotal = rest.reduce((acc, c) => acc + c.total, 0);
          const restPct = rest.reduce((acc, c) => acc + c.porcentaje, 0);
          text += `• Otras categorías: ${this.formatCOP(restTotal)} (${restPct}%)\n`;
        }
      }
      text += `\n📄 Escribe *DETALLE${isCurrent ? '' : ` ${MONTH_NAMES_ES[month - 1].toUpperCase()} ${year}`}* para ver los últimos registros.`;
    }

    if (isCurrent) {
      const outside = await this.summaryService.getOutOfPeriodRegistrations(user.id, year, month);
      if (outside.count > 0) {
        const noun = outside.count === 1 ? 'comprobante' : 'comprobantes';
        text += `\n\n📥 Este mes también registraste *${outside.count} ${noun} con fecha de otros meses* (${this.formatCOP(outside.total)}). Escribe *MESES* para ver a cuáles pertenecen.`;
      } else if (summary.numGastos === 0) {
        text += `\n📸 Envíame la foto o PDF de una factura, recibo o transferencia, o escribe un gasto como *arroz 5000*.`;
      }
    }
    return text.trimEnd();
  }

  /** Últimos meses con registros (tamaño fijo). */
  private async monthsText(user: User): Promise<string> {
    const { months, totalMonths } = await this.summaryService.getMonthsOverview(user.id, MONTHS_LIMIT);
    if (months.length === 0) {
      return `📅 Aún no tienes registros.\n\n📸 Envíame la foto de un comprobante o escribe un gasto como *arroz 5000*.`;
    }
    let text = `📅 *Tus meses con registros*\n_Según la fecha de cada documento._\n\n`;
    for (const m of months) {
      text += `• ${MONTH_NAMES_ES[Number(m.month.slice(5, 7)) - 1]} ${m.month.slice(0, 4)}: ${this.formatCOP(Math.round(m.total))} (${m.count})\n`;
    }
    if (totalMonths > months.length) {
      text += `• _…y ${totalMonths - months.length} meses más en el panel web: ${env.BACKOFFICE_URL}/expenses_\n`;
    }
    const example = months.find((m) => m.month !== todayInBogota().slice(0, 7)) ?? months[0];
    text += `\nEscribe *RESUMEN ${MONTH_NAMES_ES[Number(example.month.slice(5, 7)) - 1].toUpperCase()} ${example.month.slice(0, 4)}* para ver uno, o *RESUMEN ${example.month.slice(0, 4)}* para el año.`;
    return text;
  }

  /** Totales de un año, un renglón por mes (máximo 12). */
  private async yearSummaryText(user: User, year: number): Promise<string> {
    const overview = await this.summaryService.getYearOverview(user.id, year);
    let text = `📊 *Resumen del año ${year}*\n_Según la fecha de cada documento._\n\n`;
    if (overview.count === 0) return `${text}_No tienes registros con fecha de ${year}._`;
    for (const m of overview.months) {
      text += `• ${MONTH_NAMES_ES[Number(m.month.slice(5, 7)) - 1]}: ${this.formatCOP(Math.round(m.total))} (${m.count})\n`;
    }
    text += `\n💰 *Total ${year}:* ${this.formatCOP(Math.round(overview.total))} (${overview.count} ${overview.count === 1 ? 'registro' : 'registros'})`;
    text += `\n\nEscribe *RESUMEN <MES> ${year}* para ver el detalle de un mes.`;
    return text;
  }

  /** Últimos registros de un mes (máximo 10) y enlace al panel para el resto. */
  private async detailText(user: User, year: number, month: number): Promise<string> {
    const { items, totalCount } = await this.summaryService.getRecentInMonth(user.id, year, month, DETAIL_LIMIT);
    let text = `🧾 *Registros de ${MONTH_NAMES_ES[month - 1]} ${year}*\n\n`;
    if (items.length === 0) return `${text}_No tienes registros con fecha de ese mes._`;
    const icons: Record<string, string> = { factura: '🧾', transferencia: '🏦', manual: '✍️' };
    for (const e of items) {
      const [, mm, dd] = e.fecha.split('-');
      const name = e.comercio.length > 28 ? `${e.comercio.slice(0, 27)}…` : e.comercio;
      text += `${icons[e.tipoDocumento] ?? '•'} ${dd}/${mm} · ${name} · ${this.formatCOP(e.total)}\n`;
    }
    if (totalCount > items.length) {
      text += `\n_Mostrando los últimos ${items.length} de ${totalCount}. Ver todos en el panel web: ${env.BACKOFFICE_URL}/expenses_`;
    }
    return text.trimEnd();
  }

  // ---------------------------------------------------------------------------
  // Consultas en lenguaje natural
  // ---------------------------------------------------------------------------

  private rangeLabel(from: string, to: string): string {
    const short = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const [fy, fm, fd] = from.split('-').map(Number);
    const [ty, tm, td] = to.split('-').map(Number);
    if (from === to) return `${fd} ${short[fm - 1]} ${fy}`;
    const lastDay = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
    if (fy === ty && fm === tm && fd === 1 && td === lastDay) return `${MONTH_NAMES_ES[fm - 1]} ${fy}`;
    return fy === ty
      ? `${fd} ${short[fm - 1]} – ${td} ${short[tm - 1]} ${ty}`
      : `${fd} ${short[fm - 1]} ${fy} – ${td} ${short[tm - 1]} ${ty}`;
  }

  /** Respuesta a una consulta: plantilla fija con cifras calculadas en el backend (tamaño acotado). */
  private queryText(result: QueryResult): string {
    const { spec } = result;
    const typeLabels = { factura: 'Facturas y recibos', transferencia: 'Transferencias', manual: 'Gastos escritos' };
    const filters = [
      spec.tipoDocumento ? typeLabels[spec.tipoDocumento] : null,
      spec.categoria ?? null,
      spec.comercio ? `«${spec.comercio}»` : null,
    ].filter(Boolean);
    const title =
      spec.metric === 'impuestos'
        ? 'Impuestos pagados'
        : spec.view === 'lista'
        ? spec.sort === 'mayor'
          ? 'Tus gastos más grandes'
          : spec.sort === 'menor'
          ? 'Tus gastos más pequeños'
          : 'Tus registros'
        : 'Tus gastos';

    let text = `🔎 *${title}*\n📅 ${this.rangeLabel(spec.from, spec.to)}\n`;
    if (filters.length > 0) text += `🏷️ ${filters.join(' · ')}\n`;
    text += `\n`;

    if (result.count === 0) {
      text += `No encontré registros${filters.length > 0 ? ' con ese filtro' : ''} en ese periodo.\n\n`;
      text += `💬 Prueba con otro periodo, por ejemplo: *¿cuánto gasté el mes pasado?*`;
      return text;
    }

    if (spec.metric === 'impuestos') {
      text += `🧾 *IVA:* ${this.formatCOP(result.taxes.iva)}\n`;
      text += `🍽️ *Impoconsumo:* ${this.formatCOP(result.taxes.impoconsumo)}\n`;
      text += `💰 *Total impuestos:* ${this.formatCOP(result.taxes.total)}\n`;
      text += `\n_Calculado sobre ${result.taxes.documents} ${result.taxes.documents === 1 ? 'factura' : 'facturas'} con impuestos discriminados (de ${result.count} registros)._`;
      if (result.byType.manual.count > 0) text += `\n_Los gastos escritos no tienen impuestos registrados._`;
      return text;
    }

    if (spec.view === 'lista') {
      const icons = { factura: '🧾', transferencia: '🏦', manual: '✍️' } as const;
      for (const e of result.items) {
        const [, mm, dd] = e.fecha.split('-');
        const name = e.comercio.length > 26 ? `${e.comercio.slice(0, 25)}…` : e.comercio;
        text += `${icons[e.tipoDocumento]} ${dd}/${mm} · ${name} · ${this.formatCOP(e.total)}\n`;
      }
      text += `\n💰 *Total del periodo:* ${this.formatCOP(result.total)} (${result.count} ${result.count === 1 ? 'registro' : 'registros'})`;
      if (result.count > result.items.length) {
        text += `\n_Mostrando ${result.items.length} de ${result.count}. Ver todos en el panel web: ${env.BACKOFFICE_URL}/expenses_`;
      }
      return text;
    }

    text += `💰 *Total:* ${this.formatCOP(result.total)} (${result.count} ${result.count === 1 ? 'registro' : 'registros'})\n`;
    if (!spec.tipoDocumento) {
      const { factura, transferencia, manual } = result.byType;
      if (factura.count > 0) text += `🧾 Facturas y recibos: ${this.formatCOP(factura.total)} (${factura.count})\n`;
      if (transferencia.count > 0) text += `🏦 Transferencias: ${this.formatCOP(transferencia.total)} (${transferencia.count})\n`;
      if (manual.count > 0) text += `✍️ Gastos escritos: ${this.formatCOP(manual.total)} (${manual.count})\n`;
    }

    if (result.byMonth.length > 1) {
      const months = result.byMonth.slice(-12);
      text += `\n📅 *Por mes:*\n`;
      for (const m of months) {
        text += `• ${MONTH_NAMES_ES[Number(m.month.slice(5, 7)) - 1]} ${m.month.slice(0, 4)}: ${this.formatCOP(Math.round(m.total))} (${m.count})\n`;
      }
      if (result.byMonth.length > months.length) text += `_…y ${result.byMonth.length - months.length} meses anteriores._\n`;
    }

    if (!spec.categoria && result.byCategory.length > 0) {
      text += `\n📌 *Por categoría:*\n`;
      for (const c of result.byCategory.slice(0, 5)) {
        text += `• ${c.categoria}: ${this.formatCOP(Math.round(c.total))} (${Math.round((c.total / result.total) * 100)}%)\n`;
      }
      const rest = result.byCategory.slice(5);
      if (rest.length > 0) {
        text += `• Otras categorías: ${this.formatCOP(Math.round(rest.reduce((acc, c) => acc + c.total, 0)))}\n`;
      }
    }
    return text.trimEnd();
  }

  /** Opciones del menú principal (lista nativa de WhatsApp: se tocan en vez de escribirse). */
  private mainMenuRows(): InteractiveListRow[] {
    return [
      { id: 'cmd:resumen', title: '📊 Resumen del mes', description: 'Total por tipo y categoría' },
      { id: 'cmd:detalle', title: '🧾 Últimos registros', description: 'Lo que registraste este mes' },
      { id: 'cmd:meses', title: '📅 Mis meses', description: 'Meses en los que tienes registros' },
      { id: 'cmd:cupo', title: '📦 Mi cupo', description: 'Comprobantes y gastos disponibles' },
      { id: 'cmd:guia_foto', title: '📸 Registrar factura', description: 'Cómo enviar fotos o PDF' },
      { id: 'cmd:guia_texto', title: '✍️ Gasto sin recibo', description: 'Cómo anotar gastos escritos' },
      { id: 'cmd:web', title: '💻 Panel web', description: 'Ver y exportar todo' },
      { id: 'cmd:privacidad', title: '🔐 Mis datos', description: 'Privacidad y eliminar cuenta' },
    ];
  }

  /**
   * Mensaje principal: corto, con las dos acciones clave y un botón "Ver opciones" con el menú.
   * Se usa tras aceptar, con AYUDA y cuando el mensaje no corresponde a nada conocido.
   */
  private async sendMainMenu(sender: string, intro: string): Promise<void> {
    const body =
      `${intro}\n\n` +
      `📸 Envíame la foto o PDF de una factura o transferencia\n` +
      `✍️ Escríbeme un gasto: *arroz 5000*\n` +
      `💬 O pregúntame: *¿cuánto gasté el mes pasado?*`;
    await this.messenger.sendList(sender, body, 'Ver opciones', this.mainMenuRows());
  }

  private greeting(senderName?: string): string {
    return `¡Hola${senderName ? ` ${senderName}` : ''}! 👋 ¿Qué quieres hacer?`;
  }

}

class UnsupportedMediaError extends Error {}
class MediaTooLargeError extends Error {}
