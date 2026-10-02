export type UserRole = 'user' | 'admin' | 'contador';

export interface HabeasDataConsent {
  accepted: boolean;
  acceptedAt: string;
  ipAddress?: string;
  version: 'Ley-1581-2012';
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  phoneNumber: string; // Número de WhatsApp (+57)
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
  'passwordHash' | 'verificationToken' | 'verificationTokenExpires' | 'resetPasswordToken' | 'resetPasswordExpires'
>;
