# @none-system/backend

Backend REST API en **Express.js** y **TypeScript** con arquitectura modular y principios SOLID para la digitalización y análisis de comprobantes financieros en **Colombia** con IA (**Gemini 3.5 Flash**).

---

## 🇨🇴 Contexto Financiero y Contable (Colombia)

- **Moneda Base**: Siempre en **Pesos Colombianos (COP)**.
- **Tipos de Documento Soportados**:
  1. **`factura`**: Facturas electrónicas de venta comercial (Alkomprar, Éxito, D1, restaurantes), NIT, desglose de IVA (19%/5%) y artículos detallados.
  2. **`transferencia`**: Comprobantes de recaudo, transferencias bancarias, consignaciones y tirillas de corresponsal (Bancolombia, Wompi, Nequi, Daviplata, Efecty). Asigna el gasto al **Beneficiario/Convenio**, extrae banco, número de aprobación/referencia y omite IVA.
  3. **`auto`**: Clasificación automática del tipo de documento por IA.

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

## 📖 Documentación Interactiva (Swagger UI)

Una vez iniciado el servidor, accede a:
👉 **[http://localhost:4000/docs](http://localhost:4000/docs)** (o `/api-docs`)  
👉 **Especificación OpenAPI JSON**: `http://localhost:4000/docs/openapi.json`

---

## 🚀 Endpoints Principales

### 1. Escaneo y Extracción con IA
- **`POST /api/v1/expenses/scan`**
  - **Content-Type**: `multipart/form-data`
  - **Campos**:
    - `file`: Archivo de imagen o PDF (JPG, PNG, WEBP, PDF).
    - `tipo`: `'factura'` | `'transferencia'` | `'auto'` (Opcional, por defecto `'auto'`).
  - **Ejemplo de respuesta (Transferencia / Recaudo Bancolombia - Wompi)**:
    ```json
    {
      "success": true,
      "data": {
        "id": "uuid",
        "tipoDocumento": "transferencia",
        "comercio": "FUNERARIA SAN VICENT",
        "entidadFinanciera": "Bancolombia / Wompi",
        "numeroReferencia": "42756870",
        "fecha": "2026-09-26",
        "subtotal": null,
        "impuestos": null,
        "total": 50000,
        "moneda": "COP",
        "categoria": "Hogar y Servicios",
        "lineasArticulos": [
          { "descripcion": "Recaudo de factura - FUNERARIA SAN VICENT", "precio": 50000 }
        ],
        "confianzaExtraccion": "alta",
        "imageUrl": "/uploads/...",
        "estado": "confirmado"
      }
    }
    ```
  - **Ejemplo de respuesta (Factura Comercial Alkomprar)**:
    ```json
    {
      "success": true,
      "data": {
        "id": "uuid",
        "tipoDocumento": "factura",
        "comercio": "ALKOMPRAR",
        "cifNif": "890900943-1",
        "numeroReferencia": "X9722525757",
        "fecha": "2025-10-29",
        "subtotal": 4032731,
        "impuestos": 766219,
        "total": 4798950,
        "moneda": "COP",
        "categoria": "Tecnología",
        "lineasArticulos": [
          { "descripcion": "TV SAMSUNG 55\" 55Q7F+ BarC400", "precio": 2199900 },
          { "descripcion": "L/S SAM CF 11,5Kg WD11T4046B\"I", "precio": 2599050 }
        ],
        "confianzaExtraccion": "alta"
      }
    }
    ```

### 2. Gestión de Gastos en COP
- **`GET /api/v1/expenses`**: Lista de gastos con filtros opcionales (`?tipoDocumento=factura&year=2026&month=9&categoria=Tecnología&comercio=Alkomprar`).
- **`GET /api/v1/expenses/:id`**: Detalle completo de un gasto.
- **`PUT /api/v1/expenses/:id`**: Actualizar o confirmar datos editados por el usuario.
- **`DELETE /api/v1/expenses/:id`**: Eliminar un gasto y su imagen física.

### 3. Resúmenes y Mensajes de WhatsApp en Pesos Colombianos
- **`GET /api/v1/summaries/monthly?year=2026&month=9&presupuesto=5000000`**: Métricas en COP.
- **`GET /api/v1/summaries/whatsapp-text?presupuesto=5000000`**: Mensaje formateado listo para WhatsApp con barras de progreso y moneda COP ($).

---

## 🛠️ Comandos

```bash
# Desarrollo con recarga automática
pnpm dev

# Compilar TypeScript
pnpm build

# Ejecutar en producción
pnpm start
```
