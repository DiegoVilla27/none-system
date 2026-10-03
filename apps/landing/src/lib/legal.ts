/**
 * Datos del Responsable del Tratamiento (Ley 1581 de 2012, Decreto 1074 de 2015).
 * ⚠️ Completa estos valores con los datos reales de la empresa antes de publicar.
 */
export const LEGAL_ENTITY = {
  name: process.env.NEXT_PUBLIC_LEGAL_NAME || 'None System S.A.S.',
  nit: process.env.NEXT_PUBLIC_LEGAL_NIT || '[NIT por definir]',
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || '[Dirección por definir], Bogotá D.C., Colombia',
  privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL || '[correo de protección de datos por definir]',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '[correo de soporte por definir]',
};

export const POLICY_EFFECTIVE_DATE = '3 de octubre de 2026';
export const POLICY_VERSION = 'v2026-10';
