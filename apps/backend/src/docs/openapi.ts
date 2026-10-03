import { EXPENSE_CATEGORIES } from '../modules/expenses/entities/expense.entity.js';

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'none-system Financial & OCR API (Colombia COP)',
    version: '1.1.0',
    description: `
API REST de **none-system** para gestión contable y financiera inteligente en **Colombia**.
Procesamiento automatizado de **Facturas Electrónicas Comerciales** y **Comprobantes Bancarios / Consignaciones** con IA (**Gemini Flash**).

### Características Clave:
- 🇨🇴 **Adaptado 100% a Colombia**: Moneda siempre en **Pesos Colombianos (COP)**, formato de miles/decimales y validación de NIT.
- 🧾 **Modo Factura**: Extracción especializada de facturas de venta (Alkomprar, Éxito, D1, etc.), NIT, desglose de IVA (19%/5%) y artículos.
- 🏦 **Modo Transferencia / Consignación**: Extracción especializada de comprobantes bancarios (Bancolombia, Wompi, Nequi, Daviplata, Efecty), convenios/beneficiarios y referencias de recaudo.
- ⚡ **Rápido y Económico**: Procesamiento con \`gemini-3.5-flash\` en ~1.2 segundos sin errores de congestión.
- ✍️ **Gastos manuales**: registro de gastos sin soporte (ej: "arroz 5000"), nunca deducibles ante la DIAN.
- 📱 **Resúmenes para WhatsApp**: Generación mensual de mensajes con barras de progreso Unicode y formato de moneda COP ($).
- 🔐 **Seguridad**: todas las rutas de datos exigen \`Authorization: Bearer <token>\` y cada usuario solo accede a lo suyo.
    `,
    contact: {
      name: 'Equipo none-system Colombia',
    },
  },
  security: [{ bearerAuth: [] }],
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Servidor Local de Desarrollo',
    },
  ],
  tags: [
    {
      name: 'Gastos & OCR',
      description: 'Escaneo de facturas y transferencias bancarias con IA, consulta y actualización de gastos.',
    },
    {
      name: 'Resúmenes & Analítica',
      description: 'Cálculo de métricas mensuales y formato para mensajes de WhatsApp en Pesos Colombianos (COP).',
    },
    {
      name: 'Autenticación',
      description: 'Registro con verificación del número por WhatsApp (OTP), sesión, recuperación de contraseña y supresión de cuenta.',
    },
    {
      name: 'Suscripciones',
      description: 'Planes, cupo del usuario y checkout (modo de prueba hasta integrar una pasarela certificada).',
    },
    {
      name: 'Sistema',
      description: 'Monitoreo de estado y healthcheck.',
    },
    {
      name: 'WhatsApp Cloud API',
      description: 'Webhook oficial de Meta para recepción automática de comprobantes contables y respuestas automatizadas.',
    },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Sistema'],
        security: [],
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
                    version: { type: 'string', example: '1.1.0' },
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
        summary: 'Escanear Factura o Transferencia Bancaria con IA',
        description: `
Sube una imagen (JPEG, PNG, WEBP) o PDF de un documento financiero en Colombia.

### Selección de Tipo de Documento:
El usuario o frontend puede enviar el campo **\`tipo\`**:
- **\`factura\`**: Para facturas de venta comerciales (Alkomprar, Éxito, D1, Falabella). Busca NIT, número de factura electrónica, subtotal, IVA desglosado y líneas de artículos.
- **\`transferencia\`**: Para consignaciones, recibos de corresponsal bancario (Bancolombia, Wompi, Efecty), transferencias Nequi/Daviplata o comprobantes de pago. Asigna el gasto al **Beneficiario/Convenio**, extrae el banco/pasarela, número de aprobación/referencia y omite IVA.
- **\`auto\`**: (Por defecto) La IA determina automáticamente si es factura o comprobante bancario.
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
                    description: 'Archivo de imagen o PDF (JPG, PNG, WEBP, PDF hasta 10MB). También aceptado como "ticket".',
                  },
                  tipo: {
                    type: 'string',
                    enum: ['factura', 'transferencia', 'auto'],
                    default: 'auto',
                    description: 'Tipo de documento a escanear para activar el prompt especializado.',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Documento procesado y guardado con éxito en COP',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Documento (transferencia) escaneado y procesado con éxito' },
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
            description: 'Error con la API de IA',
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
        summary: 'Listar gastos registrados en Colombia (COP)',
        description: 'Obtiene el listado de gastos filtrados por tipo de documento, año, mes, categoría o comercio.',
        parameters: [
          {
            name: 'tipoDocumento',
            in: 'query',
            description: 'Filtrar por tipo de documento',
            required: false,
            schema: {
              type: 'string',
              enum: ['factura', 'transferencia', 'manual'],
            },
          },
          {
            name: 'year',
            in: 'query',
            description: 'Año a filtrar (ej: 2026)',
            required: false,
            schema: { type: 'string', example: '2026' },
          },
          {
            name: 'month',
            in: 'query',
            description: 'Mes a filtrar (1 a 12)',
            required: false,
            schema: { type: 'string', example: '9' },
          },
          {
            name: 'categoria',
            in: 'query',
            description: 'Filtrar por categoría',
            required: false,
            schema: {
              type: 'string',
              enum: [...EXPENSE_CATEGORIES],
            },
          },
          {
            name: 'estado',
            in: 'query',
            description: 'Filtrar por estado',
            required: false,
            schema: {
              type: 'string',
              enum: ['borrador', 'confirmado'],
            },
          },
          {
            name: 'comercio',
            in: 'query',
            description: 'Búsqueda por nombre de comercio o beneficiario',
            required: false,
            schema: { type: 'string', example: 'Funeraria San Vicente' },
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
                        total: { type: 'integer', example: 2 },
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
        description: 'Retorna la información contable completa del gasto en COP y el enlace a la imagen.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID del gasto',
            schema: { type: 'string' },
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
        description: 'Permite editar cualquier campo del registro (comercio, NIT, montos en COP, categoría, referencia).',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID del gasto',
            schema: { type: 'string' },
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
            description: 'Gasto actualizado con éxito',
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
        },
      },
      delete: {
        tags: ['Gastos & OCR'],
        summary: 'Eliminar un gasto',
        description: 'Elimina el registro y borra físicamente la imagen del almacenamiento.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID del gasto',
            schema: { type: 'string' },
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
        },
      },
    },

    '/api/v1/summaries/monthly': {
      get: {
        tags: ['Resúmenes & Analítica'],
        summary: 'Obtener resumen mensual y desglose por categorías en COP',
        description: 'Calcula el total gastado en Pesos Colombianos (COP), porcentajes por categoría y porcentaje de presupuesto consumido.',
        parameters: [
          {
            name: 'year',
            in: 'query',
            description: 'Año (ej: 2026)',
            required: false,
            schema: { type: 'integer', example: 2026 },
          },
          {
            name: 'month',
            in: 'query',
            description: 'Mes (1-12)',
            required: false,
            schema: { type: 'integer', example: 9 },
          },
          {
            name: 'presupuesto',
            in: 'query',
            description: 'Presupuesto mensual en COP (ej: 5000000 para $5.000.000 COP)',
            required: false,
            schema: { type: 'number', example: 5000000 },
          },
        ],
        responses: {
          '200': {
            description: 'Resumen mensual calculado con éxito en COP',
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
        summary: 'Generar mensaje formateado para WhatsApp en COP',
        description: 'Genera el texto con emojis, barras de progreso y formato de moneda en Pesos Colombianos ($ COP) listo para enviar por WhatsApp.',
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
            schema: { type: 'integer', example: 9 },
          },
          {
            name: 'presupuesto',
            in: 'query',
            description: 'Presupuesto mensual en COP',
            required: false,
            schema: { type: 'number', example: 5000000 },
          },
        ],
        responses: {
          '200': {
            description: 'Texto formateado para WhatsApp en COP',
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
                          example: "📊 *Resumen de Septiembre 2026*\\n\\n*Total gastado:* $4.848.950 COP de $5.000.000 COP\\n[██████████████░] 97%\\n\\n*Desglose por categorías:*\\n💻 Tecnología          : $4.798.950 COP [████████] 99%\\n🏠 Hogar y Servicios   : $50.000 COP    [░░░░░░░░] 1%\\n\\n📄 *Responde \"DETALLE\" para ver la lista de comprobantes o \"EXCEL\" para exportar.*",
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
    '/api/v1/whatsapp/webhook': {
      get: {
        tags: ['WhatsApp Cloud API'],
        security: [],
        summary: 'Verificación del Webhook de Meta (Handshake)',
        description: 'Endpoint consumido por Meta para verificar la suscripción del Webhook usando el Verify Token.',
        parameters: [
          {
            name: 'hub.mode',
            in: 'query',
            required: true,
            schema: { type: 'string', example: 'subscribe' },
          },
          {
            name: 'hub.verify_token',
            in: 'query',
            required: true,
            schema: { type: 'string', example: 'none_system_verify_token' },
          },
          {
            name: 'hub.challenge',
            in: 'query',
            required: true,
            schema: { type: 'string', example: '1158201444' },
          },
        ],
        responses: {
          '200': {
            description: 'Handshake exitoso. Retorna el valor de hub.challenge.',
            content: {
              'text/plain': {
                schema: { type: 'string', example: '1158201444' },
              },
            },
          },
          '403': {
            description: 'Verify Token no coincide.',
          },
        },
      },
      post: {
        tags: ['WhatsApp Cloud API'],
        security: [],
        summary: 'Recepción de eventos de WhatsApp (Fotos, PDFs, Mensajes)',
        description: 'Recibe eventos en tiempo real de Meta cuando un usuario envía un comprobante o mensaje por chat.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  object: { type: 'string', example: 'whatsapp_business_account' },
                  entry: { type: 'array', items: { type: 'object' } },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Evento recibido y procesado asíncronamente.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'EVENT_RECEIVED' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/expenses/manual': {
      post: {
        tags: ['Gastos & OCR'],
        summary: 'Registrar un gasto manual (sin soporte)',
        description: 'Gasto escrito a mano (ej: Arroz $5.000). No consume cupo y nunca es deducible ante la DIAN.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['descripcion', 'total'],
                properties: {
                  descripcion: { type: 'string', example: 'Arroz' },
                  total: { type: 'number', example: 5000 },
                  fecha: { type: 'string', example: '2026-10-03', description: 'YYYY-MM-DD, por defecto hoy (Colombia). No puede ser futura.' },
                  categoria: { type: 'string', enum: [...EXPENSE_CATEGORIES] },
                  comercio: { type: 'string', nullable: true, example: 'Tienda de la esquina' },
                  cantidad: { type: 'number', nullable: true, example: 1 },
                  notas: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Gasto registrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Expense' } } } },
          '400': { description: 'Datos inválidos' },
          '401': { description: 'Sin sesión' },
        },
      },
    },
    '/uploads/{filename}': {
      get: {
        tags: ['Gastos & OCR'],
        summary: 'Descargar el soporte (imagen/PDF) de un gasto propio',
        description: 'Acepta Bearer token o la cookie de sesión none_auth_token. Responde 404 si el archivo no es del usuario.',
        parameters: [{ name: 'filename', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Archivo descifrado' }, '401': { description: 'Sin sesión' }, '404': { description: 'No encontrado' } },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Autenticación'],
        security: [],
        summary: 'Paso 1: solicitar registro (envía código por WhatsApp)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name', 'phoneNumber', 'habeasDataAccepted', 'termsAccepted'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string', description: 'Mínimo 8 caracteres con letras y números' },
                  name: { type: 'string' },
                  phoneNumber: { type: 'string', example: '300 123 4567' },
                  habeasDataAccepted: { type: 'boolean', enum: [true] },
                  termsAccepted: { type: 'boolean', enum: [true] },
                },
              },
            },
          },
        },
        responses: { '202': { description: 'Código enviado. Devuelve verificationId (y devCode fuera de producción).' } },
      },
    },
    '/api/v1/auth/register/confirm': {
      post: {
        tags: ['Autenticación'],
        security: [],
        summary: 'Paso 2: confirmar el código y crear la cuenta',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { verificationId: { type: 'string' }, code: { type: 'string', example: '123456' } } } } },
        },
        responses: { '201': { description: 'Cuenta creada; devuelve token y usuario' }, '400': { description: 'Código inválido o expirado' } },
      },
    },
    '/api/v1/auth/login': {
      post: { tags: ['Autenticación'], security: [], summary: 'Iniciar sesión', responses: { '200': { description: 'Token y usuario' }, '401': { description: 'Credenciales incorrectas' } } },
    },
    '/api/v1/auth/forgot-password': {
      post: { tags: ['Autenticación'], security: [], summary: 'Enviar código de recuperación al WhatsApp verificado', responses: { '200': { description: 'Respuesta genérica (no revela si el correo existe)' } } },
    },
    '/api/v1/auth/reset-password': {
      post: { tags: ['Autenticación'], security: [], summary: 'Restablecer contraseña con email + código', responses: { '200': { description: 'Contraseña actualizada' } } },
    },
    '/api/v1/auth/phone/send-code': {
      post: { tags: ['Autenticación'], summary: 'Enviar código para verificar el número (cuentas antiguas)', responses: { '200': { description: 'Código enviado' } } },
    },
    '/api/v1/auth/phone/verify': {
      post: { tags: ['Autenticación'], summary: 'Confirmar el número con el código', responses: { '200': { description: 'Número verificado' } } },
    },
    '/api/v1/auth/me': {
      get: { tags: ['Autenticación'], summary: 'Perfil y suscripción del usuario', responses: { '200': { description: 'Perfil' } } },
      delete: {
        tags: ['Autenticación'],
        summary: 'Eliminar la cuenta y todos sus datos (derecho de supresión)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { password: { type: 'string' } } } } } },
        responses: { '200': { description: 'Cuenta eliminada' }, '400': { description: 'Contraseña incorrecta' } },
      },
    },
    '/api/v1/subscriptions/plans': {
      get: { tags: ['Suscripciones'], security: [], summary: 'Planes y precios en COP', responses: { '200': { description: 'Planes' } } },
    },
    '/api/v1/subscriptions/me': {
      get: { tags: ['Suscripciones'], summary: 'Cupo y plan del usuario autenticado', responses: { '200': { description: 'Suscripción' } } },
    },
    '/api/v1/subscriptions/checkout': {
      post: {
        tags: ['Suscripciones'],
        summary: 'Activar un plan (modo de prueba, sin cobro real)',
        description: 'Deshabilitado en producción hasta integrar una pasarela de pagos certificada. Nunca recibe datos de tarjeta.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { plan: { type: 'string', enum: ['basico', 'pro', 'empresarial'] }, paymentMethod: { type: 'string', enum: ['pse', 'card', 'nequi'] } } } } } },
        responses: { '200': { description: 'Plan activado (simulado)' }, '503': { description: 'Pagos en línea no habilitados' } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      ExpenseItem: {
        type: 'object',
        required: ['descripcion', 'precio'],
        properties: {
          descripcion: { type: 'string', example: 'TV SAMSUNG 55" 55Q7F+ BarC400' },
          precio: { type: 'number', example: 2199900 },
          cantidad: { type: 'number', nullable: true, example: 1 },
        },
      },

      Expense: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '3ecb803d-91ec-479a-9ff9-17e6f56e2df5' },
          userId: { type: 'string', nullable: true, example: 'user-123' },
          tipoDocumento: {
            type: 'string',
            enum: ['factura', 'transferencia', 'manual'],
            example: 'transferencia',
          },
          comercio: {
            type: 'string',
            example: 'Funeraria San Vicente',
            description: 'En factura: comercio/proveedor. En transferencia: beneficiario o convenio.',
          },
          entidadFinanciera: {
            type: 'string',
            nullable: true,
            example: 'Bancolombia / Wompi (Corresponsal Districampo)',
            description: 'Banco, pasarela o canal (Bancolombia, Wompi, Nequi, etc.)',
          },
          cifNif: {
            type: 'string',
            nullable: true,
            example: '890900943-1',
            description: 'NIT en Colombia o documento de identidad',
          },
          numeroReferencia: {
            type: 'string',
            nullable: true,
            example: 'Ref: 42756870, Aprob: 807611',
            description: 'Número de factura electrónica o referencia de recaudo/aprobación',
          },
          fecha: { type: 'string', format: 'date', example: '2026-09-26' },
          subtotal: { type: 'number', nullable: true, example: 4032731 },
          impuestos: { type: 'number', nullable: true, example: 766219, description: 'IVA en Colombia' },
          total: { type: 'number', example: 50000, description: 'Monto total en Pesos Colombianos (COP)' },
          moneda: { type: 'string', enum: ['COP'], example: 'COP' },
          categoria: {
            type: 'string',
            enum: [...EXPENSE_CATEGORIES],
            example: 'Hogar y Servicios',
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
          notas: { type: 'string', nullable: true },
          imageUrl: { type: 'string', nullable: true, example: '/uploads/1790956849624-6f1c2a3e.png', description: 'Soporte cifrado en reposo; solo lo descarga su dueño. null en gastos manuales.' },
          imageOriginalName: { type: 'string', example: 'comprobante-wompi.png' },
          estado: {
            type: 'string',
            enum: ['borrador', 'confirmado'],
            example: 'confirmado',
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      UpdateExpenseDto: {
        type: 'object',
        properties: {
          tipoDocumento: { type: 'string', enum: ['factura', 'transferencia', 'manual'] },
          comercio: { type: 'string', example: 'Funeraria San Vicente S.A.' },
          entidadFinanciera: { type: 'string', nullable: true, example: 'Bancolombia' },
          cifNif: { type: 'string', nullable: true, example: '890900943-1' },
          numeroReferencia: { type: 'string', nullable: true, example: '42756870' },
          fecha: { type: 'string', format: 'date', example: '2026-09-26' },
          subtotal: { type: 'number', nullable: true },
          impuestos: { type: 'number', nullable: true },
          total: { type: 'number', example: 50000 },
          categoria: { type: 'string', enum: [...EXPENSE_CATEGORIES] },
          lineasArticulos: {
            type: 'array',
            items: { $ref: '#/components/schemas/ExpenseItem' },
          },
          notas: { type: 'string', nullable: true },
          estado: { type: 'string', enum: ['borrador', 'confirmado'] },
        },
      },

      MonthlySummary: {
        type: 'object',
        properties: {
          year: { type: 'integer', example: 2026 },
          month: { type: 'integer', example: 9 },
          totalGastado: { type: 'number', example: 4848950, description: 'Total en COP' },
          presupuesto: { type: 'number', nullable: true, example: 5000000, description: 'Presupuesto en COP' },
          porcentajePresupuesto: { type: 'number', nullable: true, example: 97 },
          categorias: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                categoria: { type: 'string', example: 'Tecnología' },
                total: { type: 'number', example: 4798950 },
                porcentaje: { type: 'number', example: 99 },
                numTickets: { type: 'integer', example: 1 },
              },
            },
          },
          numGastos: { type: 'integer', example: 2 },
        },
      },

      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Error de validación o recurso no encontrado' },
              code: { type: 'string', example: 'BAD_REQUEST' },
              details: { type: 'object', nullable: true },
            },
          },
        },
      },
    },
  },
};
