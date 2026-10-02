import { EXPENSE_CATEGORIES } from '../modules/expenses/entities/expense.entity.js';

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'none-system Financial & OCR API',
    version: '1.0.0',
    description: `
API REST de **none-system** para el control financiero, extracción automatizada de tickets con IA (**Gemini Flash**) y generación de resúmenes analíticos para WhatsApp y Dashboard Web.

### Características Clave:
- ⚡ **Extracción Ultrarrápida**: Procesamiento de tickets y facturas en menos de 2 segundos.
- 🤖 **IA Multimodal Nativa**: Identificación de comercio, fecha, desglose de impuestos, moneda y categorías.
- 📱 **Integración para WhatsApp**: Generación instantánea de resúmenes mensuales con barras de progreso y emojis.
- 🏛️ **Arquitectura Modular & SOLID**: Totalmente tipado con TypeScript y validado con Zod.
    `,
    contact: {
      name: 'Equipo none-system',
    },
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Servidor Local de Desarrollo',
    },
  ],
  tags: [
    {
      name: 'Gastos & OCR',
      description: 'Escaneo de tickets con IA, listado, consulta y actualización de gastos contables.',
    },
    {
      name: 'Resúmenes & Analítica',
      description: 'Cálculo de métricas mensuales y formato para mensajes de WhatsApp.',
    },
    {
      name: 'Sistema',
      description: 'Monitoreo de estado y healthcheck.',
    },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Verificar estado del servicio',
        description: 'Retorna el estado operativo actual de la API, versión y timestamp.',
        responses: {
          '200': {
            description: 'Servicio operativo y saludable',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', example: '2026-10-02T16:20:00.000Z' },
                    service: { type: 'string', example: '@none-system/backend' },
                    version: { type: 'string', example: '1.0.0' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/v1/expenses/scan': {
      post: {
        tags: ['Gastos & OCR'],
        summary: 'Escanear ticket / factura con IA (Gemini Flash)',
        description: `
Sube una imagen (JPEG, PNG, WEBP) o un documento PDF de un ticket o factura de compra.
El motor de IA extrae automáticamente:
1. Nombre del comercio o proveedor
2. CIF/NIF (si es visible)
3. Fecha de emisión (YYYY-MM-DD)
4. Base imponible e impuestos (IVA)
5. Total pagado y moneda (EUR, USD, etc.)
6. Categoría sugerida (Supermercado, Restauración, etc.)
7. Desglose de artículos comprados
8. Nivel de confianza ('alta', 'media', 'baja')

Guarda la imagen en el almacenamiento y crea un registro de gasto con estado 'confirmado' (si la confianza es alta) o 'borrador' (si requiere revisión).
        `,
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Foto del ticket en formato JPG, PNG, WEBP o PDF (Máximo 10MB). También se acepta con el nombre de campo "ticket".',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Ticket procesado y guardado con éxito',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Ticket escaneado y procesado con éxito' },
                    data: { $ref: '#/components/schemas/Expense' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Archivo faltante o formato no permitido',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '502': {
            description: 'Fallo al comunicarse con el proveedor de IA',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },

    '/api/v1/expenses': {
      get: {
        tags: ['Gastos & OCR'],
        summary: 'Listar gastos registrados con filtros',
        description: 'Obtiene el listado de gastos filtrados opcionalmente por año, mes, categoría, estado o comercio.',
        parameters: [
          {
            name: 'year',
            in: 'query',
            description: 'Año a filtrar en formato 4 dígitos (ej: 2026)',
            required: false,
            schema: { type: 'string', example: '2026' },
          },
          {
            name: 'month',
            in: 'query',
            description: 'Mes a filtrar (1 a 12 o con 2 dígitos, ej: 03)',
            required: false,
            schema: { type: 'string', example: '3' },
          },
          {
            name: 'categoria',
            in: 'query',
            description: 'Filtrar por categoría específica',
            required: false,
            schema: {
              type: 'string',
              enum: [...EXPENSE_CATEGORIES],
              example: 'Supermercado',
            },
          },
          {
            name: 'estado',
            in: 'query',
            description: 'Filtrar por estado del gasto',
            required: false,
            schema: {
              type: 'string',
              enum: ['borrador', 'confirmado'],
              example: 'confirmado',
            },
          },
          {
            name: 'comercio',
            in: 'query',
            description: 'Búsqueda por nombre de comercio (coincidencia parcial)',
            required: false,
            schema: { type: 'string', example: 'Mercadona' },
          },
        ],
        responses: {
          '200': {
            description: 'Lista de gastos obtenida correctamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Expense' },
                    },
                    meta: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer', example: 1 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/v1/expenses/{id}': {
      get: {
        tags: ['Gastos & OCR'],
        summary: 'Obtener detalle de un gasto por ID',
        description: 'Retorna toda la información extraída y el enlace de la imagen del ticket.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Identificador único del gasto (UUID)',
            schema: { type: 'string', example: '3ecb803d-91ec-479a-9ff9-17e6f56e2df5' },
          },
        ],
        responses: {
          '200': {
            description: 'Gasto encontrado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Expense' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Gasto no encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Gastos & OCR'],
        summary: 'Actualizar o confirmar datos de un gasto',
        description: 'Permite editar cualquier campo del ticket (ideal para la pantalla de verificación del frontend o correcciones manuales).',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Identificador único del gasto (UUID)',
            schema: { type: 'string', example: '3ecb803d-91ec-479a-9ff9-17e6f56e2df5' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateExpenseDto' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Gasto actualizado correctamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Gasto actualizado con éxito' },
                    data: { $ref: '#/components/schemas/Expense' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Datos inválidos en el cuerpo de la petición',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Gasto no encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Gastos & OCR'],
        summary: 'Eliminar un gasto',
        description: 'Elimina el registro de la base de datos y borra físicamente la imagen del almacenamiento.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Identificador único del gasto (UUID)',
            schema: { type: 'string', example: '3ecb803d-91ec-479a-9ff9-17e6f56e2df5' },
          },
        ],
        responses: {
          '200': {
            description: 'Gasto eliminado con éxito',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Gasto eliminado con éxito' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Gasto no encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },

    '/api/v1/summaries/monthly': {
      get: {
        tags: ['Resúmenes & Analítica'],
        summary: 'Obtener resumen mensual y desglose por categorías (JSON)',
        description: 'Calcula el total gastado en el mes, la distribución porcentual por categorías y la comparación respecto al presupuesto definido.',
        parameters: [
          {
            name: 'year',
            in: 'query',
            description: 'Año del resumen (por defecto: año actual)',
            required: false,
            schema: { type: 'integer', example: 2026 },
          },
          {
            name: 'month',
            in: 'query',
            description: 'Mes del resumen (1-12, por defecto: mes actual)',
            required: false,
            schema: { type: 'integer', example: 3 },
          },
          {
            name: 'presupuesto',
            in: 'query',
            description: 'Presupuesto total fijado para calcular porcentaje consumido',
            required: false,
            schema: { type: 'number', example: 2500 },
          },
        ],
        responses: {
          '200': {
            description: 'Resumen mensual calculado con éxito',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/MonthlySummary' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/v1/summaries/whatsapp-text': {
      get: {
        tags: ['Resúmenes & Analítica'],
        summary: 'Generar mensaje con barras de progreso listo para WhatsApp',
        description: `
Genera el texto listo para ser enviado a través de la API de WhatsApp, formateado con:
- Emojis por categoría (🛒, 🍽️, 🚗, etc.)
- Barras de progreso visuales con caracteres Unicode ([████████░░] 77%)
- Porcentaje de presupuesto gastado
- Call-to-action para solicitar reportes en Excel
        `,
        parameters: [
          {
            name: 'year',
            in: 'query',
            description: 'Año a consultar',
            required: false,
            schema: { type: 'integer', example: 2026 },
          },
          {
            name: 'month',
            in: 'query',
            description: 'Mes a consultar (1-12)',
            required: false,
            schema: { type: 'integer', example: 3 },
          },
          {
            name: 'presupuesto',
            in: 'query',
            description: 'Presupuesto mensual para calcular la barra de consumo global',
            required: false,
            schema: { type: 'number', example: 250 },
          },
        ],
        responses: {
          '200': {
            description: 'Texto formateado generado correctamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        text: {
                          type: 'string',
                          example: "📊 *Resumen de Marzo 2026*\\n\\n*Total gastado:* $10.30 de $250.00\\n[█░░░░░░░░░░░░░░] 4%\\n\\n*Desglose por categorías:*\\n🛒 Supermercado    : $10.30 [████████] 100%\\n\\n📄 *Responde \"DETALLE\" para ver la lista de tickets o \"EXCEL\" para exportar.*",
                        },
                        summary: { $ref: '#/components/schemas/MonthlySummary' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ExpenseItem: {
        type: 'object',
        required: ['descripcion', 'precio'],
        properties: {
          descripcion: { type: 'string', example: 'LECHE ENTERA 1L' },
          precio: { type: 'number', example: 1.15 },
          cantidad: { type: 'number', nullable: true, example: 1 },
        },
      },

      Expense: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '3ecb803d-91ec-479a-9ff9-17e6f56e2df5' },
          userId: { type: 'string', nullable: true, example: 'user-123' },
          comercio: { type: 'string', example: 'Mercadona' },
          cifNif: { type: 'string', nullable: true, example: 'A-46103834' },
          fecha: { type: 'string', format: 'date', example: '2026-03-15' },
          subtotal: { type: 'number', nullable: true, example: 9.27 },
          impuestos: { type: 'number', nullable: true, example: 1.03 },
          total: { type: 'number', example: 10.3 },
          moneda: { type: 'string', example: 'EUR' },
          categoria: {
            type: 'string',
            enum: [...EXPENSE_CATEGORIES],
            example: 'Supermercado',
          },
          lineasArticulos: {
            type: 'array',
            items: { $ref: '#/components/schemas/ExpenseItem' },
          },
          confianzaExtraccion: {
            type: 'string',
            enum: ['alta', 'media', 'baja'],
            example: 'alta',
          },
          notas: { type: 'string', nullable: true, example: 'Ticket número 042-9982, Hora: 14:32' },
          imageUrl: { type: 'string', example: '/uploads/1790953848714-ticket-mercadona.png' },
          imageOriginalName: { type: 'string', example: 'ticket-mercadona.png' },
          estado: {
            type: 'string',
            enum: ['borrador', 'confirmado'],
            example: 'confirmado',
          },
          createdAt: { type: 'string', format: 'date-time', example: '2026-10-02T15:11:26.048Z' },
          updatedAt: { type: 'string', format: 'date-time', example: '2026-10-02T15:11:26.048Z' },
        },
      },

      UpdateExpenseDto: {
        type: 'object',
        properties: {
          comercio: { type: 'string', example: 'Mercadona S.A.' },
          cifNif: { type: 'string', nullable: true, example: 'A-46103834' },
          fecha: { type: 'string', format: 'date', example: '2026-03-15' },
          subtotal: { type: 'number', nullable: true, example: 9.27 },
          impuestos: { type: 'number', nullable: true, example: 1.03 },
          total: { type: 'number', example: 10.3 },
          moneda: { type: 'string', example: 'EUR' },
          categoria: {
            type: 'string',
            enum: [...EXPENSE_CATEGORIES],
            example: 'Supermercado',
          },
          lineasArticulos: {
            type: 'array',
            items: { $ref: '#/components/schemas/ExpenseItem' },
          },
          notas: { type: 'string', nullable: true, example: 'Revisado y confirmado manualmente' },
          estado: {
            type: 'string',
            enum: ['borrador', 'confirmado'],
            example: 'confirmado',
          },
        },
      },

      CategorySummary: {
        type: 'object',
        properties: {
          categoria: { type: 'string', example: 'Supermercado' },
          total: { type: 'number', example: 10.3 },
          porcentaje: { type: 'number', example: 100 },
          numTickets: { type: 'integer', example: 1 },
        },
      },

      MonthlySummary: {
        type: 'object',
        properties: {
          year: { type: 'integer', example: 2026 },
          month: { type: 'integer', example: 3 },
          totalGastado: { type: 'number', example: 10.3 },
          presupuesto: { type: 'number', nullable: true, example: 250 },
          porcentajePresupuesto: { type: 'number', nullable: true, example: 4 },
          categorias: {
            type: 'array',
            items: { $ref: '#/components/schemas/CategorySummary' },
          },
          numGastos: { type: 'integer', example: 1 },
        },
      },

      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Recurso no encontrado o error de validación' },
              code: { type: 'string', example: 'NOT_FOUND' },
              details: { type: 'object', nullable: true },
            },
          },
        },
      },
    },
  },
};
