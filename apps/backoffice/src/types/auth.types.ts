export interface HabeasDataConsent {
  accepted: boolean;
  acceptedAt?: string | null;
  ipAddress?: string | null;
  version?: string | null;
  channel?: 'web' | 'whatsapp' | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phoneNumber: string;
  phoneVerified: boolean;
  isWhatsAppOnly?: boolean;
  role: 'user' | 'admin' | 'contador';
  emailVerified: boolean;
  habeasDataConsent: HabeasDataConsent;
  createdAt: string;
  updatedAt: string;
}

export type PlanId = 'gratuito' | 'basico' | 'pro' | 'empresarial';

export interface SubscriptionInfo {
  phoneNumber: string;
  plan: PlanId;
  monthlyLimit: number;
  currentUsage: number;
  /** Gastos escritos registrados en el periodo. */
  manualUsage?: number;
  /** Límite de gastos escritos; null = ilimitados. */
  manualMonthlyLimit?: number | null;
  billingCycleMonth: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  status: 'activo' | 'suspendido';
}

/** El token de sesión llega en una cookie HttpOnly, nunca en el cuerpo. */
export interface AuthSession {
  user: User;
  /** Solo en desarrollo (sin proveedor de correo). */
  devEmailVerificationToken?: string;
}

export interface PendingRegistration {
  verificationId: string;
  phoneHint: string;
  expiresAt: string;
  /** Solo en desarrollo, para probar sin WhatsApp real. */
  devCode?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  phoneNumber: string;
  habeasDataAccepted: true;
  termsAccepted: true;
}
