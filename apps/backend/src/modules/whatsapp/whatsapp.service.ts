import { randomUUID } from 'node:crypto';
import { IOcrExtractor } from '../../providers/ocr/ocr.interface.js';
import { IStorageService } from '../../core/storage/storage.interface.js';
import { IExpenseRepository } from '../expenses/repositories/expense.repository.interface.js';
import { Expense, ExtractionConfidence } from '../expenses/entities/expense.entity.js';
import { SummaryService } from '../summaries/services/summary.service.js';
import { SubscriptionService } from '../subscriptions/subscription.service.js';
import { PLAN_CONFIGS } from '../subscriptions/subscription.entity.js';
import { env } from '../../config/env.js';
import { WhatsAppMessage, MetaMediaResponse } from './whatsapp.types.js';

export class WhatsAppService {
  constructor(
    private readonly ocrExtractor: IOcrExtractor,
    private readonly storageService: IStorageService,
    private readonly expenseRepository: IExpenseRepository,
    private readonly summaryService: SummaryService,
    private readonly subscriptionService: SubscriptionService
  ) {}

  /**
   * Formatea valores monetarios en Pesos Colombianos (COP) para el chat de WhatsApp.
   */
  private formatCOP(amount: number): string {
    return `$ ${amount.toLocaleString('es-CO')} COP`;
  }

  /**
   * Envía un mensaje de texto por WhatsApp usando la Meta Cloud API oficial.
   */
  async sendTextMessage(to: string, messageText: string): Promise<boolean> {
    if (!env.WHATSAPP_API_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
      console.log(`[WhatsApp Mock Dispatch] Destino: ${to}\nMensaje:\n${messageText}\n`);
      return true;
    }

    try {
      const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: {
            preview_url: false,
            body: messageText,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Error enviando mensaje por WhatsApp Meta API:', errorData);
        return false;
      }

      return true;
    } catch (err) {
      console.error('❌ Excepción al enviar mensaje por WhatsApp:', err);
      return false;
    }
  }

  /**
   * Descarga un archivo multimedia (imagen o PDF) desde los servidores seguros de Meta.
   */
  async downloadMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    if (!env.WHATSAPP_API_TOKEN) {
      throw new Error('WHATSAPP_API_TOKEN no está configurado en las variables de entorno');
    }

    // 1. Obtener la URL temporal de descarga del archivo
    const infoUrl = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${mediaId}`;
    const infoResponse = await fetch(infoUrl, {
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}`,
      },
    });

    if (!infoResponse.ok) {
      const errorText = await infoResponse.text();
      throw new Error(`Error obteniendo metadatos del medio ${mediaId}: ${errorText}`);
    }

    const mediaInfo = (await infoResponse.json()) as MetaMediaResponse;

    // 2. Descargar el archivo binario
    const fileResponse = await fetch(mediaInfo.url, {
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}`,
      },
    });

    if (!fileResponse.ok) {
      throw new Error(`Error descargando bytes multimedia de ${mediaId}`);
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determinar extensión adecuada
    const extension = mediaInfo.mime_type.includes('pdf')
      ? 'pdf'
      : mediaInfo.mime_type.includes('png')
      ? 'png'
      : 'jpg';

    const filename = `whatsapp_${mediaId}.${extension}`;

    return {
      buffer,
      mimeType: mediaInfo.mime_type,
      filename,
    };
  }

  /**
   * Procesa de forma asíncrona un mensaje entrante de un usuario.
   */
  async processIncomingMessage(message: WhatsAppMessage, senderName?: string): Promise<void> {
    const sender = message.from;

    // A. Si el mensaje es una Imagen o Documento (PDF / Factura / Transferencia)
    if (message.type === 'image' || message.type === 'document') {
      const media = message.image || message.document;
      if (!media || !media.id) return;

      // 0. Validar cuota mensual del usuario antes de consumir recursos
      const quota = await this.subscriptionService.canProcessDocument(sender, senderName);
      if (!quota.allowed) {
        const config = PLAN_CONFIGS[quota.plan];
        let limitMsg = `⚠️ *Límite de comprobantes alcanzado*\n\n`;
        limitMsg += `¡Hola${senderName ? ` ${senderName}` : ''}! Has utilizado el 100% de tus *${quota.total} comprobantes mensuales* de tu *${config.name}*.\n\n`;
        limitMsg += `🚀 *Para seguir digitalizando facturas y transferencias sin pausa, elige un plan mensual:*\n`;
        limitMsg += `• *Plan Independiente:* 50 comprobantes por $ 19.900 COP/mes\n`;
        limitMsg += `• *Plan Negocio:* 200 comprobantes por $ 49.900 COP/mes\n`;
        limitMsg += `• *Plan Empresarial:* 600 comprobantes por $ 99.900 COP/mes\n\n`;
        limitMsg += `🔗 *Activa o recarga tu paquete aquí:*\nhttps://none-system.com/planes?phone=${sender}\n\n`;
        limitMsg += `💡 Tu cupo se renovará automáticamente el primer día del próximo mes.\n`;
        limitMsg += `*(Aún puedes escribir *RESUMEN* para consultar tus gastos acumulados o *CUPO* para ver tu saldo).*`;

        await this.sendTextMessage(sender, limitMsg);
        return;
      }

      // Notificar al usuario que comenzó la digitalización
      await this.sendTextMessage(
        sender,
        '🔍 *Digitalizando comprobante con IA...*\nEstamos extrayendo valores, NIT, comercio y fecha en Pesos Colombianos (COP).'
      );

      try {
        // 1. Descargar archivo desde Meta
        const { buffer, mimeType, filename } = await this.downloadMedia(media.id);

        // 2. Guardar en almacenamiento local
        const storedFile = await this.storageService.save({
          buffer,
          originalname: media.filename || filename,
          mimetype: mimeType,
          size: buffer.length,
          fieldname: 'file',
          encoding: '7bit',
          stream: null as any,
          destination: '',
          filename: '',
          path: '',
        });

        // 3. Extraer datos contables con Gemini (Detección inteligente 'auto')
        const extracted = await this.ocrExtractor.extractFromBuffer(buffer, mimeType, 'auto');

        // 4. Crear entidad de gasto y persistir
        const now = new Date().toISOString();
        const expense: Expense = {
          id: randomUUID(),
          userId: sender, // Teléfono del remitente como identificador
          tipoDocumento: extracted.tipoDocumento,
          comercio: extracted.comercio,
          entidadFinanciera: extracted.entidadFinanciera,
          cifNif: extracted.cifNif,
          nit: extracted.nit || extracted.cifNif,
          numeroReferencia: extracted.numeroReferencia,
          cufe: extracted.cufe,
          fecha: extracted.fecha,
          subtotal: extracted.subtotal,
          baseGravable: extracted.baseGravable || extracted.subtotal,
          impuestos: extracted.impuestos,
          iva: extracted.iva,
          impoconsumo: extracted.impoconsumo,
          total: extracted.total,
          moneda: 'COP',
          categoria: extracted.categoria,
          lineasArticulos: extracted.lineasArticulos || [],
          confianzaExtraccion: extracted.confianzaExtraccion as ExtractionConfidence,
          notas: `Ingresado vía WhatsApp por ${senderName || sender}. ${extracted.notas || ''}`.trim(),
          imageUrl: storedFile.url,
          imageOriginalName: storedFile.originalName,
          estado: 'confirmado',
          isDianCompliant: extracted.isDianCompliant ?? Boolean(extracted.tipoDocumento === 'factura' && (extracted.nit || extracted.cifNif)),
          encryptedAtRest: true,
          createdAt: now,
          updatedAt: now,
        };

        await this.expenseRepository.create(expense);

        // 5. Incrementar consumo de la suscripción
        const updatedSub = await this.subscriptionService.incrementUsage(sender);
        const remaining = Math.max(0, updatedSub.monthlyLimit - updatedSub.currentUsage);

        // 6. Enviar mensaje de confirmación al usuario
        let responseText = `✅ *¡Comprobante procesado con éxito!*\n\n`;
        responseText += `📋 *Tipo:* ${expense.tipoDocumento === 'factura' ? 'Factura Comercial (DIAN)' : 'Transferencia Bancaria'}\n`;
        responseText += `🏪 *Comercio / Beneficiario:* ${expense.comercio}\n`;
        responseText += `💰 *Total Pagado:* ${this.formatCOP(expense.total)}\n`;

        if (expense.baseGravable) {
          responseText += `💵 *Base Gravable:* ${this.formatCOP(expense.baseGravable)}\n`;
        }
        if (expense.iva) {
          responseText += `📊 *IVA (19%/5%):* ${this.formatCOP(expense.iva)}\n`;
        }
        if (expense.impoconsumo) {
          responseText += `🍽️ *Impoconsumo (8%):* ${this.formatCOP(expense.impoconsumo)}\n`;
        }

        responseText += `📅 *Fecha:* ${expense.fecha}\n`;
        responseText += `🏷️ *Categoría:* ${expense.categoria}\n`;

        if (expense.nit || expense.cifNif) {
          responseText += `🆔 *NIT Emisor:* ${expense.nit || expense.cifNif}\n`;
        }
        if (expense.numeroReferencia) {
          responseText += `🔢 *No. Ref / Factura:* ${expense.numeroReferencia}\n`;
        }
        if (expense.cufe) {
          responseText += `🛡️ *CUFE DIAN:* ${expense.cufe.slice(0, 16)}...\n`;
        }
        if (expense.isDianCompliant) {
          responseText += `🏛️ *Deducción DIAN (Art. 771-2):* ✅ Válido\n`;
        }

        if (expense.lineasArticulos && expense.lineasArticulos.length > 0) {
          responseText += `\n📦 *Conceptos identificados:*\n`;
          expense.lineasArticulos.slice(0, 4).forEach((item) => {
            responseText += `• ${item.cantidad && item.cantidad > 1 ? `${item.cantidad}x ` : ''}${item.descripcion} (${this.formatCOP(item.precio)})\n`;
          });
          if (expense.lineasArticulos.length > 4) {
            responseText += `• _...y ${expense.lineasArticulos.length - 4} conceptos más._\n`;
          }
        }

        responseText += `\n📊 *Cupo restante este mes:* ${remaining} de ${updatedSub.monthlyLimit} comprobantes.`;
        responseText += `\n✨ *none-system:* Ya está disponible en tu dashboard web.`;
        responseText += `\nEscribe *RESUMEN* para ver gastos o *CUPO* para ver tu saldo.`;

        await this.sendTextMessage(sender, responseText);
      } catch (err) {
        console.error('❌ Error procesando comprobante de WhatsApp:', err);
        await this.sendTextMessage(
          sender,
          '⚠️ *No logramos extraer la información del comprobante.*\n\nPor favor verifica que la imagen esté enfocada y legible, o que el archivo PDF no esté protegido con contraseña, y vuelve a intentarlo.'
        );
      }
      return;
    }

    // B. Si el mensaje es Texto plano
    if (message.type === 'text') {
      const text = message.text?.body.trim().toLowerCase() || '';

      if (text.includes('resumen')) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const summary = await this.summaryService.getMonthlySummary(currentYear, currentMonth);
        const monthNames = [
          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
        ];
        const monthName = monthNames[(summary.month || currentMonth) - 1];

        let summaryText = `📊 *Resumen Contable · ${monthName} ${summary.year}*\n\n`;
        summaryText += `💰 *Total Contabilizado:* ${this.formatCOP(summary.totalGastado)}\n`;
        summaryText += `🧾 *Facturas:* ${this.formatCOP(summary.totalFacturas)} (${summary.numFacturas})\n`;
        summaryText += `🏦 *Transferencias:* ${this.formatCOP(summary.totalTransferencias)} (${summary.numTransferencias})\n`;
        summaryText += `📦 *Total Comprobantes:* ${summary.numGastos}\n`;

        if (summary.categorias && summary.categorias.length > 0) {
          summaryText += `\n📌 *Distribución por Categorías:*\n`;
          summary.categorias.forEach((cat) => {
            summaryText += `• ${cat.categoria}: ${this.formatCOP(cat.total)} (${cat.porcentaje}%)\n`;
          });
        }

        await this.sendTextMessage(sender, summaryText);
        return;
      }

      if (text.includes('plan') || text.includes('cupo') || text.includes('saldo')) {
        const sub = await this.subscriptionService.getOrCreateSubscription(sender, senderName);
        const remaining = Math.max(0, sub.monthlyLimit - sub.currentUsage);
        const config = PLAN_CONFIGS[sub.plan];

        let statusMsg = `📊 *Estado de tu Cuenta y Cupo*\n\n`;
        statusMsg += `👤 *Usuario:* ${senderName || sender}\n`;
        statusMsg += `📦 *Plan Actual:* ${config.name}\n`;
        statusMsg += `📈 *Consumo este mes:* ${sub.currentUsage} de ${sub.monthlyLimit} comprobantes\n`;
        statusMsg += `✅ *Disponibles para usar:* ${remaining} comprobantes\n`;
        statusMsg += `🔄 *Próxima renovación:* Primer día del próximo mes\n\n`;
        if (sub.plan === 'gratuito') {
          statusMsg += `💡 ¿Necesitas más facturas? Adquiere el *Plan Independiente* (50 comprobantes por $ 19.900 COP/mes) en:\nhttps://none-system.com/planes?phone=${sender}`;
        }
        await this.sendTextMessage(sender, statusMsg);
        return;
      }

      // Respuesta de Bienvenida e Instrucciones
      const welcome = `¡Hola${senderName ? ` ${senderName}` : ''}! 👋\nSoy tu asistente contable en *none-system* 🇨🇴.\n\n📸 *¿Cómo funciona?*\nEnvíame una foto o PDF de:\n• Una factura de compra comercial\n• Un comprobante de transferencia (Bancolombia, Nequi, Daviplata, Wompi, etc.)\n\nAutomáticamente extraeré valores, NIT, comercio e IVA y lo registraré en tu contabilidad.\n\n📊 *Comandos disponibles:*\n• Escribe *RESUMEN* para consultar el consolidado del mes.\n• Escribe *CUPO* para ver tus comprobantes disponibles este mes.`;

      await this.sendTextMessage(sender, welcome);
    }
  }
}
