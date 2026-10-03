export type UserRole = 'user' | 'admin' | 'contador';

export const HABEAS_DATA_POLICY_VERSION = 'Ley-1581-2012/v2026-10';

export type ConsentChannel = 'web' | 'whatsapp';

export interface HabeasDataConsent {
  accepted: boolean;
  acceptedAt?: string | null;
  ipAddress?: string | null;
  version?: string | null;
  channel?: ConsentChannel | null;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  phoneNumber: string; // Número de WhatsApp (+57)
  phoneVerified: boolean;
  sessionVersion: number;
  welcomeSentAt?: string | null;
  role: UserRole;
  emailVerified: boolean;
  verificationToken?: string | null;
  verificationTokenExpires?: string | null;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: string | null;
  habeasDataConsent: HabeasDataConsent;
  createdAt: string;
  updatedAt: string;
}

export type UserProfile = Omit<
  User,
  'passwordHash' | 'verificationToken' | 'verificationTokenExpires' | 'resetPasswordToken' | 'resetPasswordExpires' | 'sessionVersion'
> & { isWhatsAppOnly: boolean };

/** Dominio reservado para cuentas creadas automáticamente desde WhatsApp (sin acceso web). */
export const WHATSAPP_ACCOUNT_EMAIL_DOMAIN = '@whatsapp.none-system.com';

export function isWhatsAppOnlyAccount(user: Pick<User, 'email'>): boolean {
  return user.email.endsWith(WHATSAPP_ACCOUNT_EMAIL_DOMAIN);
}
