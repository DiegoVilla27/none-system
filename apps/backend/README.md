# @none-system/backend

Backend REST API en **Express.js** y **TypeScript** con arquitectura modular y principios SOLID para la digitalización y análisis de tickets de gastos con IA.

---

## 🏛️ Arquitectura y Principios

- **Modular Architecture (Vertical Slices)**: Módulos independientes (`expenses`, `summaries`, `whatsapp`).
- **SOLID**:
  - **S (Single Responsibility)**: Controladores (HTTP), Servicios (Lógica de negocio), Repositorios (Persistencia), Proveedores (Integraciones externas).
  - **O (Open/Closed) & D (Dependency Inversion)**: Extractor OCR (`IOcrExtractor`) y almacenamiento (`IStorageService`) desacoplados tras interfaces.
  - **L (Liskov Substitution)**: Los repositorios y servicios de almacenamiento se pueden alternar (Memoria, Postgres, Supabase, S3) sin tocar el código de negocio.
- **DRY & KISS**: Validación de entrada y tipado TypeScript estricto unificado con **Zod**.
- **YAGNI**: Sin sobreingeniería ni colas prematuras. Monolito modular ágil y robusto.

---

## 🚀 Endpoints Principales

### 1. Escaneo y Extracción de Tickets
- **`POST /api/v1/expenses/scan`**
  - **Content-Type**: `multipart/form-data`
  - **Campo de archivo**: `file` o `ticket` (Formatos: JPG, PNG, WEBP, PDF)
  - **Respuesta**: Datos estructurados extraídos por Gemini Flash:
    ```json
    {
      "success": true,
      "data": {
        "id": "uuid",
        "comercio": "Mercadona",
        "cifNif": "A-46103834",
        "fecha": "2026-03-15",
        "subtotal": 9.27,
        "impuestos": 1.03,
        "total": 10.30,
        "moneda": "EUR",
        "categoria": "Supermercado",
        "lineasArticulos": [...],
        "confianzaExtraccion": "alta",
        "imageUrl": "/uploads/...",
        "estado": "confirmado"
      }
    }
    ```

### 2. Gestión de Gastos
- **`GET /api/v1/expenses`**: Lista de gastos con filtros opcionales (`?year=2026&month=3&categoria=Supermercado&comercio=Mercadona`).
- **`GET /api/v1/expenses/:id`**: Detalle de un gasto.
- **`PUT /api/v1/expenses/:id`**: Actualizar o corregir datos del ticket.
- **`DELETE /api/v1/expenses/:id`**: Eliminar un gasto y su imagen asociada.

### 3. Resúmenes y Mensajes de WhatsApp
- **`GET /api/v1/summaries/monthly?year=2026&month=3&presupuesto=250`**: Totales por categoría y porcentaje de presupuesto consumido.
- **`GET /api/v1/summaries/whatsapp-text?year=2026&month=3&presupuesto=250`**: Mensaje formateado listo para enviar a WhatsApp con barras de progreso Unicode y emojis.

---

## 🛠️ Comandos

```bash
# Desarrollo con recarga automática
pnpm dev

# Compilar TypeScript
pnpm build

# Ejecutar build de producción
pnpm start

# Ejecutar prueba End-to-End con Gemini Flash
pnpm test:e2e
```
