import { Expense } from '@/types/expense.types';

/**
 * Escapa valores para formato CSV compatible con Microsoft Excel (España / Colombia).
 * Envuelve en comillas dobles si contiene comas, puntos y comas, comillas o saltos de línea.
 */
function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  // Si contiene comillas, punto y coma, coma o salto de línea, se encierra entre comillas dobles
  if (str.includes('"') || str.includes(';') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Genera y descarga un archivo CSV compatible con Microsoft Excel con delimitador ';',
 * codificación UTF-8 con BOM y estructura contable para Colombia.
 *
 * @param expenses Lista de comprobantes contables a exportar.
 * @param filename Nombre del archivo (sin o con extensión .csv).
 */
export function exportExpensesToCSV(
  expenses: Expense[],
  filename: string = 'Reporte_Contable_Comprobantes'
): void {
  if (!expenses || expenses.length === 0) {
    alert('No hay comprobantes para exportar con los filtros seleccionados.');
    return;
  }

  // Encabezados contables estándar
  const headers = [
    'Tipo de Documento',
    'Fecha',
    'Comercio / Beneficiario',
    'NIT / Cédula',
    'Entidad Financiera',
    'No. Factura / Referencia',
    'Categoría',
    'Base Gravable / Subtotal (COP)',
    'IVA / Impuestos (COP)',
    'Total Pagado (COP)',
    'Conceptos / Artículos',
    'Nivel Confianza IA',
    'Estado Contable',
    'Notas',
  ];

  const rows: string[][] = [];

  let sumSubtotal = 0;
  let sumImpuestos = 0;
  let sumTotal = 0;

  expenses.forEach((exp) => {
    const subtotal = exp.subtotal || 0;
    const impuestos = exp.impuestos || 0;
    const total = exp.total || 0;

    sumSubtotal += subtotal;
    sumImpuestos += impuestos;
    sumTotal += total;

    // Concatenar conceptos o ítems
    const conceptos = exp.lineasArticulos
      ? exp.lineasArticulos
          .map((item) => `${item.cantidad && item.cantidad > 1 ? `${item.cantidad}x ` : ''}${item.descripcion}`)
          .join(' | ')
      : '';

    rows.push([
      exp.tipoDocumento === 'factura' ? 'Factura Comercial' : 'Transferencia Bancaria',
      exp.fecha || '',
      exp.comercio || 'No identificado',
      exp.cifNif || '',
      exp.entidadFinanciera || '',
      exp.numeroReferencia || '',
      exp.categoria || 'Otros',
      String(subtotal),
      String(impuestos),
      String(total),
      conceptos,
      exp.confianzaExtraccion.toUpperCase(),
      exp.estado.toUpperCase(),
      exp.notas || '',
    ]);
  });

  // Fila final de totales
  const totalRow = [
    'TOTALES CONSOLIDADOS',
    '',
    `${expenses.length} comprobantes`,
    '',
    '',
    '',
    '',
    String(sumSubtotal),
    String(sumImpuestos),
    String(sumTotal),
    '',
    '',
    '',
    '',
  ];

  // Construir contenido CSV con delimitador ';' (estándar Excel LatAm / España)
  const csvLines: string[] = [
    headers.map(escapeCsvValue).join(';'),
    ...rows.map((row) => row.map(escapeCsvValue).join(';')),
    totalRow.map(escapeCsvValue).join(';'),
  ];

  // \uFEFF es el BOM (Byte Order Mark) para forzar a Microsoft Excel a abrir en UTF-8 con tildes y caracteres especiales
  const csvContent = '\uFEFF' + csvLines.join('\r\n');

  // Crear Blob y disparar descarga
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const safeFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', safeFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
