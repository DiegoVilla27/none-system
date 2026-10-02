# none-system

Monorepo para la plataforma de gestión de tickets, gastos y control financiero inteligente.

## Estructura de Proyectos

- **`apps/backend`**: API REST en Express.js + TypeScript con extracción OCR impulsada por Gemini Flash, resúmenes mensuales y endpoints para WhatsApp / Web.
- **`apps/frontend`** *(próximamente)*: Interfaz Web / Dashboard de usuario.

---

## Inicio Rápido (Backend)

### 1. Requisitos
- Node.js >= 20
- [pnpm](https://pnpm.io/) >= 10

### 2. Instalación de dependencias
```bash
pnpm install
```

### 3. Ejecución en desarrollo
```bash
pnpm dev:backend
```

### 4. Ejecutar pruebas End-to-End
```bash
pnpm --filter @none-system/backend run test:e2e
```
