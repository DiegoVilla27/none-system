import { GoogleGenAI, Type } from '@google/genai';
import { IOcrExtractor, ExtractedReceiptData } from './ocr.interface.js';
import { env } from '../../config/env.js';
import { EXPENSE_CATEGORIES, ExpenseCategory, ExtractionConfidence } from '../../modules/expenses/entities/expense.entity.js';
import { AppError } from '../../core/errors/index.js';

export class GeminiExtractor implements IOcrExtractor {
  private readonly ai: GoogleGenAI;
  private readonly primaryModel: string;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    this.primaryModel = env.GEMINI_MODEL;
  }

  async extractFromBuffer(buffer: Buffer, mimeType: string): Promise<ExtractedReceiptData> {
    const base64Data = buffer.toString('base64');

    const prompt = `
Eres un sistema experto en auditoría contable y extracción automatizada de tickets, recibos y facturas en tiempo real.
Analiza con total precisión la imagen adjunta y extrae la información contable.

Instrucciones estrictas:
1. "comercio": Nombre del establecimiento o proveedor comercial (ej. "Mercadona", "Repsol", "Uber"). Si no se lee claramente, usa "Desconocido".
2. "cifNif": CIF, NIF, RFC, RUT o identificador fiscal si está visible. Si no aparece, usa null.
3. "fecha": Fecha de emisión en formato YYYY-MM-DD. Si no se distingue el año o la fecha completa, usa la fecha de hoy aproximada o null.
4. "subtotal": Base imponible antes de impuestos si está visible, o null.
5. "impuestos": Importe total de IVA / impuestos desglosados, o null.
6. "total": El importe total pagado final (obligatorio, número flotante).
7. "moneda": Código ISO de la moneda (ej. "EUR", "USD", "COP", "MXN"). Por defecto "EUR".
8. "categoria": Debe ser una de las siguientes opciones exactas:
   - "Supermercado" (alimentos, víveres, compras de tienda)
   - "Restauración" (bares, cafeterías, restaurantes, delivery)
   - "Transporte" (gasolina, peajes, taxi, uber, billetes de tren/vuelo)
   - "Hogar y Servicios" (electricidad, agua, telecomunicaciones, reparaciones)
   - "Tecnología" (electrónica, software, suscripciones SaaS)
   - "Salud y Bienestar" (farmacia, médico, deporte)
   - "Ocio y Viajes" (hoteles, cine, eventos)
   - "Otros" (cualquier gasto no categorizado)
9. "lineasArticulos": Lista de artículos o conceptos desglosados si son legibles, con "descripcion" y "precio".
10. "confianzaExtraccion":
    - "alta": El ticket es nítido, total y comercio claramente legibles.
    - "media": Algún dato secundario no se distingue bien pero el total es seguro.
    - "baja": La imagen está borrosa, cortada o faltan datos esenciales.
11. "notas": Cualquier observación relevante sobre el ticket o null.
`;

    const schemaConfig = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          comercio: { type: Type.STRING },
          cifNif: { type: Type.STRING, nullable: true },
          fecha: { type: Type.STRING },
          subtotal: { type: Type.NUMBER, nullable: true },
          impuestos: { type: Type.NUMBER, nullable: true },
          total: { type: Type.NUMBER },
          moneda: { type: Type.STRING },
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
        required: ['comercio', 'fecha', 'total', 'moneda', 'categoria', 'confianzaExtraccion'],
      },
    };

    let rawText = '';
    let lastError: unknown;

    // Orden de modelos para resiliencia: primario -> gemini-3.5-flash -> gemini-flash-latest
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
              `[GeminiExtractor] Modelo ${model} saturado temporalmente (503 High Demand). Saltando inmediatamente al siguiente modelo sin delay...`
            );
            // Salir del bucle interno para cambiar de modelo inmediatamente
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
        'No se pudo extraer la información del ticket tras varios intentos con la IA',
        502,
        lastError
      );
    }

    return this.parseAndSanitizeResponse(rawText);
  }

  private parseAndSanitizeResponse(raw: string): ExtractedReceiptData {
    try {
      // Limpiar posibles bloques markdown ```json ... ``` si el modelo los incluyera
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleaned);

      // Validar categoría válida
      const categoria: ExpenseCategory = EXPENSE_CATEGORIES.includes(parsed.categoria)
        ? parsed.categoria
        : 'Otros';

      const confianza: ExtractionConfidence = ['alta', 'media', 'baja'].includes(parsed.confianzaExtraccion)
        ? parsed.confianzaExtraccion
        : 'media';

      return {
        comercio: parsed.comercio || 'Desconocido',
        cifNif: parsed.cifNif || null,
        fecha: parsed.fecha || new Date().toISOString().split('T')[0],
        subtotal: typeof parsed.subtotal === 'number' ? parsed.subtotal : null,
        impuestos: typeof parsed.impuestos === 'number' ? parsed.impuestos : null,
        total: typeof parsed.total === 'number' ? parsed.total : 0,
        moneda: parsed.moneda || 'EUR',
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
