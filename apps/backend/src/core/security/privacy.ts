/**
 * Utilidades para minimizar datos personales en logs y respuestas (Ley 1581 de 2012).
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  return `${user.slice(0, 2)}***@${domain}`;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Normaliza números colombianos: 10 dígitos que empiezan por 3 → se antepone 57.
 */
export function normalizeColombianMobile(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length === 10 && digits.startsWith('3')) return `57${digits}`;
  return digits;
}
