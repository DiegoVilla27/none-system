export interface HabeasDataConsent {
  accepted: boolean;
  acceptedAt: string;
  ipAddress?: string;
  version: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phoneNumber: string;
  role: 'user' | 'admin' | 'contador';
  emailVerified: boolean;
  habeasDataConsent: HabeasDataConsent;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionInfo {
  phoneNumber: string;
  plan: 'gratuito' | 'basico' | 'pro' | 'empresarial';
  monthlyLimit: number;
  currentUsage: number;
  billingCycleMonth: string;
  status: 'activo' | 'suspendido';
}

export interface AuthSession {
  user: User;
  token: string;
  verificationToken?: string;
}
