# none-system

Monorepo para la plataforma de gestión de tickets, facturas electrónicas y comprobantes bancarios en **Colombia (COP)** con IA multimodal.

---

## 📁 Proyectos en el Monorepo

- **`apps/backend`**: API REST en Express.js + TypeScript con extracción OCR (Gemini 3.5 Flash), Swagger UI (`/docs`), resúmenes mensuales y soporte para Colombia (Facturas vs Transferencias).
- **`apps/frontend`**: Aplicación web en **Next.js (App Router, SSR, SEO)** con diseño atómico (**Atomic Design**), tema **Dark Mode lujoso** con acentos **azul turquesa / eléctrico** sutiles y vista de verificación lado a lado.

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
# Iniciar Frontend (Next.js en http://localhost:3000):
pnpm dev:frontend

# Iniciar Backend (Express + Swagger en http://localhost:4000):
pnpm dev:backend
```

---

## 🎨 Arquitectura del Frontend (`apps/frontend`)

- **Atomic Design**:
  - `atoms/`: `Button` (acento eléctrico turquesa), `Badge` (estados/confianza), `Input` (dark luxury con prefijos/sufijos), `Typography` (`Heading`, `Text`).
  - `molecules/`: `StatCard` (KPIs financieros), `FileUploader` (selector Factura vs Transferencia + dropzone), `ProgressBar` (presupuesto), `Tabs`.
  - `organisms/`: `Navbar` (glassmorphism con indicador 🇨🇴 COP), `SideBySideViewer` (soporte original a la izquierda + formulario editable a la derecha), `ExpenseTable` (historial contable), `MonthlySummaryCard` (tarjeta para WhatsApp).
  - `templates/`: `DashboardLayout` (contenedor general con resplandor ambiental y pie de página).
- **Totalmente tipado con TypeScript y documentado con TSDoc**.
- **Cero duplicación de componentes (DRY & KISS)**.
