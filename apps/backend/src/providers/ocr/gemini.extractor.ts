import { GoogleGenAI, Type } from '@google/genai';
import { IOcrExtractor, ExtractedReceiptData, RequestedScanType } from './ocr.interface.js';
import { env } from '../../config/env.js';
import {
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  ExtractionConfidence,
  DocumentType,
} from '../../modules/expenses/entities/expense.entity.js';
import { AppError } from '../../core/errors/index.js';

export class GeminiExtractor implements IOcrExtractor {
  private readonly ai: GoogleGenAI;
  private readonly primaryModel: string;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    this.primaryModel = env.GEMINI_MODEL;
  }

  async extractFromBuffer(
    buffer: Buffer,
    mimeType: string,
    requestedType: RequestedScanType = 'auto'
  ): Promise<ExtractedReceiptData> {
    const base64Data = buffer.toString('base64');
    const prompt = this.buildPrompt(requestedType);
    const schemaConfig = this.buildSchemaConfig();

    let rawText = '';
    let lastError: unknown;

    const modelsToTry = Array.from(new Set([
      this.primaryModel,
      'gemini-3.5-flash',
      'gemini-flash-latest',
    ]));

    for (const model of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await this.ai.models.generateContent({
            model,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      data: base64Data,
                      mimeType,
                    },
                  },
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            config: schemaConfig,
          });

          if (response.text) {
            rawText = response.text;
            break;
          }
        } catch (err: any) {
          lastError = err;
          const isOverloaded =
            err.status === 503 ||
            String(err.message || '').includes('503') ||
            String(err.message || '').includes('high demand');

          if (isOverloaded) {
            console.warn(
              `[GeminiExtractor] Modelo ${model} saturado temporalmente (503). Saltando inmediatamente al siguiente modelo...`
            );
            break;
          }

          console.warn(`[GeminiExtractor] Intento ${attempt} con modelo ${model} falló:`, err.message || err);
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
      }

      if (rawText) break;
    }

    if (!rawText) {
      throw new AppError(
        'No se pudo extraer la información del documento tras varios intentos con la IA',
        502,
        lastError
      );
    }

    return this.parseAndSanitizeResponse(rawText, requestedType);
  }

  private buildPrompt(requestedType: RequestedScanType): string {
    const baseColombianRules = `
CONTEXTO FISCAL Y FINANCIERO:
- País: COLOMBIA.
- Moneda obligatoria: "COP" (Pesos Colombianos).
- IMPORTANTE FORMATEO NUMÉRICO EN COLOMBIA:
  En Colombia se usan puntos para separar miles y comas para decimales.
  Ejemplos:
  - "$50.000,00" equivale a cincuenta mil pesos -> número: 50000
  - "$4.798.950" equivale a cuatro millones setecientos noventa y ocho mil novecientos cincuenta pesos -> número: 4798950
  - "$10.300" equivale a diez mil trescientos pesos -> número: 10300
  Devuelve SIEMPRE el número entero o flotante real en COP sin puntos ni comas de formateo en el JSON.
`;

    if (requestedType === 'transferencia') {
      return `
${baseColombianRules}
ESTE DOCUMENTO ES UN COMPROBANTE BANCARIO / TRANSFERENCIA / RECAUDO / CONSIGNACIÓN.
(Ejemplos: Corresponsal Bancolombia, Wompi, Nequi, Daviplata, Efecty, Baloto, PSE, Voucher Datafono, Transferencia bancaria).

INSTRUCCIONES ESPECÍFICAS PARA COMPROBANTE BANCARIO:
1. "tipoDocumento": Obligatoriamente "transferencia".
2. "comercio": El BENEFICIARIO o NOMBRE DEL CONVENIO que recibe el dinero (ej: "Funeraria San Vicente", "EPM", "Empresa de Energía", "Juan Pérez").
   REGLA DE ORO: NO pongas como comercio el nombre del banco ni el punto corresponsal (ej: NO pongas 'Districampo' ni 'Bancolombia' como comercio si hay un convenio o beneficiario específico).
3. "entidadFinanciera": El banco, pasarela o red que procesó el pago (ej: "Bancolombia / Wompi", "Nequi", "Daviplata", "Redeban", "BBVA").
4. "cifNif": NIT del convenio si aparece, o null.
5. "numeroReferencia": Referencia de recaudo, número de aprobación, recibo o RRN (ej: "Ref: 42756870, Aprob: 807611").
6. "fecha": Fecha de la transacción en formato YYYY-MM-DD (ej: "SEP 26 2026" -> "2026-09-26").
7. "subtotal": null (los comprobantes bancarios no tienen subtotal).
8. "impuestos": null (los comprobantes bancarios no tienen IVA).
9. "total": El monto exacto consignado o pagado en COP (ej: 50000).
10. "categoria": "Transferencias y Finanzas" o la que mejor aplique al destino ("Hogar y Servicios" para servicios públicos o funeraria, etc.).
11. "lineasArticulos": Una sola línea describiendo el concepto de la transacción (ej: [{ "descripcion": "Recaudo de factura - Funeraria San Vicente", "precio": 50000 }]).
12. "confianzaExtraccion": "alta", "media" o "baja".
`;
    }

    if (requestedType === 'factura') {
      return `
${baseColombianRules}
ESTE DOCUMENTO ES UNA FACTURA DE VENTA / TICKET DE COMPRA COMERCIAL.
(Ejemplos: Factura Electrónica de Venta Alkomprar, Éxito, D1, Ara, Falabella, supermercados, tiendas, restaurantes).

INSTRUCCIONES ESPECÍFICAS PARA FACTURA COMERCIAL:
1. "tipoDocumento": Obligatoriamente "factura".
2. "comercio": Nombre comercial del establecimiento o razón social (ej: "Alkomprar", "Colombiana de Comercio S.A.", "Almacenes Éxito").
3. "entidadFinanciera": Medio de pago si aparece (ej: "Tarjeta Crédito Redeban", "Contado", "PSE") o null.
4. "cifNif": NIT de la empresa colombiana (ej: "890900943-1").
5. "numeroReferencia": Número de Factura Electrónica de Venta o Prefijo (ej: "X9722525757").
6. "fecha": Fecha de emisión en formato YYYY-MM-DD.
7. "subtotal": Base imponible antes de impuestos en COP (ej: 4032731) o null si no se desglosa.
8. "impuestos": Valor total del IVA en COP (ej: 766219) o null.
9. "total": Valor Total a pagar en COP (ej: 4798950).
10. "categoria": Categoría apropiada ("Tecnología", "Supermercado", "Hogar y Servicios", "Restauración", etc.).
11. "lineasArticulos": Desglose de cada producto comprado con su descripción y precio final después de descuentos (ej: TV Samsung, Lavadora, etc.).
12. "confianzaExtraccion": "alta", "media" o "baja".
`;
    }

    // Modo "auto": Determinar primero si es factura o comprobante bancario
    return `
${baseColombianRules}
Analiza la imagen adjunta y determina primero si es:
- "factura": Factura de venta, ticket de compra, almacén o restaurante con artículos e IVA.
- "transferencia": Comprobante bancario, recaudo de corresponsal (Bancolombia, Wompi, Nequi), depósito o voucher de pago.

REGLAS SEGÚN EL TIPO:
- Si es "transferencia":
  * "comercio": El nombre del convenio o persona que recibe el dinero (ej. "Funeraria San Vicente").
  * "entidadFinanciera": El banco o pasarela (ej. "Bancolombia / Wompi").
  * "numeroReferencia": Referencia o código de aprobación.
  * "subtotal" e "impuestos": null.
  * "total": El monto neto pagado en COP.
- Si es "factura":
  * "comercio": La tienda o emisor comercial (ej. "Alkomprar").
  * "cifNif": NIT de la empresa con dígito de verificación si está visible.
  * "numeroReferencia": No. de factura electrónica.
  * "subtotal", "impuestos" (IVA) y "total" en COP.
  * "lineasArticulos": Productos desglosados.
`;
  }

  private buildSchemaConfig() {
    return {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tipoDocumento: {
            type: Type.STRING,
            enum: ['factura', 'transferencia'],
          },
          comercio: { type: Type.STRING },
          entidadFinanciera: { type: Type.STRING, nullable: true },
          cifNif: { type: Type.STRING, nullable: true },
          numeroReferencia: { type: Type.STRING, nullable: true },
          fecha: { type: Type.STRING },
          subtotal: { type: Type.NUMBER, nullable: true },
          impuestos: { type: Type.NUMBER, nullable: true },
          total: { type: Type.NUMBER },
          moneda: { type: Type.STRING, enum: ['COP'] },
          categoria: {
            type: Type.STRING,
            enum: [...EXPENSE_CATEGORIES],
          },
          lineasArticulos: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                descripcion: { type: Type.STRING },
                precio: { type: Type.NUMBER },
                cantidad: { type: Type.NUMBER, nullable: true },
              },
              required: ['descripcion', 'precio'],
            },
          },
          confianzaExtraccion: {
            type: Type.STRING,
            enum: ['alta', 'media', 'baja'],
          },
          notas: { type: Type.STRING, nullable: true },
        },
        required: ['tipoDocumento', 'comercio', 'fecha', 'total', 'moneda', 'categoria', 'confianzaExtraccion'],
      },
    };
  }

  private parseAndSanitizeResponse(raw: string, requestedType: RequestedScanType): ExtractedReceiptData {
    try {
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleaned);

      let tipoDoc: DocumentType = requestedType === 'factura' || requestedType === 'transferencia'
        ? requestedType
        : parsed.tipoDocumento === 'transferencia'
        ? 'transferencia'
        : 'factura';

      const categoria: ExpenseCategory = EXPENSE_CATEGORIES.includes(parsed.categoria)
        ? parsed.categoria
        : tipoDoc === 'transferencia'
        ? 'Transferencias y Finanzas'
        : 'Otros';

      const confianza: ExtractionConfidence = ['alta', 'media', 'baja'].includes(parsed.confianzaExtraccion)
        ? parsed.confianzaExtraccion
        : 'media';

      return {
        tipoDocumento: tipoDoc,
        comercio: parsed.comercio || (tipoDoc === 'transferencia' ? 'Destinatario Desconocido' : 'Comercio Desconocido'),
        entidadFinanciera: parsed.entidadFinanciera || null,
        cifNif: parsed.cifNif || null,
        numeroReferencia: parsed.numeroReferencia || null,
        fecha: parsed.fecha || new Date().toISOString().split('T')[0],
        subtotal: typeof parsed.subtotal === 'number' ? parsed.subtotal : null,
        impuestos: typeof parsed.impuestos === 'number' ? parsed.impuestos : null,
        total: typeof parsed.total === 'number' ? parsed.total : 0,
        moneda: 'COP',
        categoria,
        lineasArticulos: Array.isArray(parsed.lineasArticulos) ? parsed.lineasArticulos : [],
        confianzaExtraccion: confianza,
        notas: parsed.notas || null,
      };
    } catch (parseErr) {
      console.error('[GeminiExtractor] Error al parsear JSON devuelto por Gemini:', raw);
      throw new AppError('Error al interpretar el JSON generado por el modelo de IA', 500, parseErr);
    }
  }
}
