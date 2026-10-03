# none-system

Monorepo integral para la plataforma de gestión contable, facturas electrónicas DIAN y comprobantes bancarios en **Colombia (COP)** con IA multimodal (Google Gemini) y bot de WhatsApp oficial.

---

## 📁 Estructura del Monorepo

- **`apps/landing`** (Puerto 3001):
  - **Aplicación de captación y ventas** en **Next.js 15 (App Router)**.
  - **Demostrador interactivo de IA**: Simulación en tiempo real de escaneo de tirillas colombianas (Éxito, transferencias Nequi/Bancolombia, restaurantes con Impoconsumo 8%).
  - **Calculadora interactiva de ROI**: Cálculo dinámico de horas ahorradas y retorno de inversión en COP según el volumen del negocio.
  - **Tabla de Planes y Precios en COP**:
    - *Plan Gratuito*: 10 comprobantes/mes ($0 COP)
    - *Plan Independiente*: 50 comprobantes/mes ($19.900 COP/mes)
    - *Plan Negocio*: 200 comprobantes/mes ($49.900 COP/mes)
    - *Plan Empresarial*: 600+ comprobantes/mes ($99.900 COP/mes)
  - **Compra de planes**: redirige al backoffice (`/billing`), donde el usuario activa el plan con su número verificado. La landing **no recoge datos de tarjeta**; el checkout es simulado hasta integrar una pasarela certificada.
  - **Páginas legales**: `/privacidad` (Política de Tratamiento de Datos, Ley 1581) y `/terminos` (Términos y Condiciones, Ley 1480). Los datos del responsable se configuran en `src/lib/legal.ts` o con variables `NEXT_PUBLIC_LEGAL_*`.

- **`apps/backoffice`** (Puerto 3000):
  - **Panel privado de administración y contabilidad** en **Next.js 15 (App Router)**.
  - **Diseño Atómico** (Atoms, Molecules, Organisms, Templates) en **Dark Mode Lujoso** con acentos **azul turquesa / eléctrico**.
  - **Visor Lado a Lado**: Visualización del comprobante original a la izquierda y formulario de verificación contable a la derecha.
  - **Filtros Avanzados y Exportación a Excel/CSV**: Exportación contable con delimitador `;` y BOM UTF-8 para Excel colombiano, compatible con Siigo, Alegra y World Office.
  - **Pruebas Automatizadas**: 12 suites de pruebas (46 tests unitarios y de integración) con Vitest, React Testing Library y MSW (Mock Service Worker).

- **`apps/backend`** (Puerto 4000):
  - API REST en **Express.js + TypeScript**.
  - Extracción OCR multimodal con **Google Gemini (gemini-2.5-flash-lite / gemini-2.5-flash)** adaptado a Colombia (Facturas con IVA 19% e Impoconsumo 8%, NITs con DV, Transferencias bancarias).
  - **Integración con Meta WhatsApp Cloud API**: Webhook oficial (`/api/v1/whatsapp/webhook`) con firma `X-Hub-Signature-256`, autorización de datos en el primer mensaje (`ACEPTO`), descarga segura de medios y comandos (`RESUMEN`, `CUPO`, `DESHACER`, `CAMBIAR`, `PRIVACIDAD`, `ELIMINAR MIS DATOS`).
  - **Tres tipos de registro**: `factura` (factura o recibo con foto/PDF), `transferencia` (comprobante bancario con foto/PDF) y `manual` (texto sin soporte, ej. "arroz 5000"; no consume cupo y nunca es deducible).
  - **Módulo de Suscripciones**: Control de cupos mensuales por número de WhatsApp, reinicio automático de ciclo y pasarela de checkout (`/api/v1/subscriptions`).
  - **Documentación Swagger / OpenAPI**: Disponible en `/docs` y `/api-docs`.

---

## 🚀 Inicio Rápido

### 1. Requisitos
- Node.js >= 20
- [pnpm](https://pnpm.io/) >= 10

### 2. Instalación de dependencias
```bash
pnpm install
```

### 3. Ejecutar los servicios en desarrollo

```bash
# Iniciar Landing Page de Captación y Pagos (http://localhost:3001):
pnpm dev:landing

# Iniciar Backoffice Contable (http://localhost:3000):
pnpm dev:backoffice

# Iniciar Backend API + WhatsApp Webhook + Swagger (http://localhost:4000):
pnpm dev:backend
```

### 4. Base de datos
```bash
pnpm db:push                # aplica el esquema Prisma
# Una sola vez por entorno existente, tras el cambio de verificación/consentimiento:
#   npx prisma db execute --file prisma/data-fixes/2026-10-03-consent-phone-verification.sql --schema prisma/schema.prisma
pnpm db:seed                # admin de demo (en producción exige SEED_ADMIN_PASSWORD)
```

### 5. Pruebas Automatizadas
```bash
pnpm test           # backend (node:test) + backoffice (Vitest)
pnpm test:backend   # solo backend: seguridad, aislamiento de datos, WhatsApp y gastos manuales
```

---

## 🔐 Seguridad y cumplimiento

- **Aislamiento de datos**: todas las rutas de gastos, resúmenes y archivos exigen sesión; cada usuario solo accede a lo suyo (lo ajeno responde 404).
- **Número verificado**: el registro web exige un código OTP enviado por WhatsApp; el bot solo vincula datos a números verificados.
- **Soportes cifrados**: imágenes y PDF se guardan con AES-256-GCM (`ENCRYPTION_SECRET`) y se sirven solo a su dueño.
- **Habeas Data**: autorización explícita (web y WhatsApp), descarga gratuita de datos y eliminación de cuenta (web o `ELIMINAR MIS DATOS`).
- **Producción**: el backend no arranca sin `DATABASE_URL`, `JWT_SECRET`/`ENCRYPTION_SECRET` fuertes, `WHATSAPP_APP_SECRET` y token de verificación propio; Swagger y pagos simulados quedan deshabilitados.
- **Sesiones**: JWT en cookie HttpOnly + SameSite=Lax, verificación de `Origin` en escrituras (CSRF) y revocación por `sessionVersion` (cambio de contraseña, "cerrar todas las sesiones", cuenta eliminada).
- **Pagos**: Wompi Web Checkout con firma de integridad; el plan se activa solo con el evento firmado o la consulta directa a Wompi, validando monto y moneda, una sola vez por pago.
- **Bot persistente**: el estado de `DESHACER`/`CAMBIAR`/borrado y la deduplicación de mensajes de Meta viven en PostgreSQL.
- **Pendiente antes de lanzar**: datos legales reales en `apps/landing/src/lib/legal.ts`, plantilla OTP de autenticación aprobada en Meta (`WHATSAPP_OTP_TEMPLATE_NAME`), pasarela de pagos certificada y revisión de los textos legales por un abogado.
