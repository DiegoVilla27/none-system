/**
 * Configuración conversacional del número en Meta: sugerencias iniciales (ice breakers)
 * y menú de comandos con "/". Se aplica con `pnpm --filter @none-system/backend whatsapp:setup`.
 */

/**
 * Botones de texto que se ven al abrir el chat vacío (máx. 4, 80 caracteres).
 * Sin emojis: Meta no los conserva en las sugerencias (los guarda como "�").
 */
export const ICE_BREAKERS = [
  '¿Cómo registro una factura?',
  '¿Cómo anoto un gasto sin recibo?',
  'Ver mi resumen del mes',
  '¿Cuánto cupo me queda?',
] as const;

/** Menú que aparece al escribir "/" (nombre en minúsculas, máx. 32; descripción máx. 256). */
export const BOT_COMMANDS: Array<{ command_name: string; command_description: string }> = [
  { command_name: 'resumen', command_description: 'Tus gastos del mes por tipo y categoría' },
  { command_name: 'detalle', command_description: 'Los últimos registros del mes' },
  { command_name: 'meses', command_description: 'Meses en los que tienes registros' },
  { command_name: 'cupo', command_description: 'Comprobantes y gastos escritos disponibles' },
  { command_name: 'corregir', command_description: 'Corrige un dato del último registro (24 h)' },
  { command_name: 'deshacer', command_description: 'Elimina el último registro (24 h)' },
  { command_name: 'ayuda', command_description: 'Cómo usar el asistente' },
  { command_name: 'web', command_description: 'Acceso a tu panel web' },
  { command_name: 'privacidad', command_description: 'Tus datos personales y derechos' },
];
