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
  - **Pasarela de Pago Integrada**: Flujo de pago simulado adaptado a Colombia (**PSE**, Tarjetas de Crédito/Débito, **Nequi Push**) con activación inmediata de cupo y vinculación telefónica.
  - **Cumplimiento y Confianza**: Meta Cloud API oficial (0% riesgo de baneo), DIAN, Habeas Data (Ley 1581) y FAQ.

- **`apps/backoffice`** (Puerto 3000):
  - **Panel privado de administración y contabilidad** en **Next.js 15 (App Router)**.
  - **Diseño Atómico** (Atoms, Molecules, Organisms, Templates) en **Dark Mode Lujoso** con acentos **azul turquesa / eléctrico**.
  - **Visor Lado a Lado**: Visualización del comprobante original a la izquierda y formulario de verificación contable a la derecha.
  - **Filtros Avanzados y Exportación a Excel/CSV**: Exportación contable con delimitador `;` y BOM UTF-8 para Excel colombiano, compatible con Siigo, Alegra y World Office.
  - **Pruebas Automatizadas**: 12 suites de pruebas (46 tests unitarios y de integración) con Vitest, React Testing Library y MSW (Mock Service Worker).

- **`apps/backend`** (Puerto 4000):
  - API REST en **Express.js + TypeScript**.
  - Extracción OCR multimodal con **Google Gemini (gemini-2.5-flash-lite / gemini-2.5-flash)** adaptado a Colombia (Facturas con IVA 19% e Impoconsumo 8%, NITs con DV, Transferencias bancarias).
  - **Integración con Meta WhatsApp Cloud API**: Webhook oficial (`/api/v1/whatsapp/webhook`), descarga segura de medios y comandos de consulta (`CUPO`, `PLAN`, `RESUMEN`).
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

### 4. Pruebas Automatizadas
```bash
# Ejecutar todas las pruebas unitarias y de integración del backoffice:
pnpm test
```
