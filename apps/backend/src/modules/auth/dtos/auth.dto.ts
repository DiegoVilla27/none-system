import { z } from 'zod';
import { normalizeColombianMobile } from '../../../core/security/privacy.js';

const email = z.string().trim().toLowerCase().max(254).email('Correo electrónico inválido');
const password = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128, 'La contraseña no puede superar 128 caracteres')
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'La contraseña debe incluir letras y números');
const otpCode = z.string().trim().regex(/^\d{6}$/, 'El código debe tener 6 dígitos');

export const phoneNumberSchema = z
  .string()
  .max(25)
  .transform(normalizeColombianMobile)
  .refine((v) => /^\d{11,15}$/.test(v), 'Ingresa un número de WhatsApp válido (ej: 300 123 4567)');

export const registerSchema = z.object({
  email,
  password,
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(120),
  phoneNumber: phoneNumberSchema,
  habeasDataAccepted: z.literal(true, {
    errorMap: () => ({
      message: 'Es obligatorio autorizar el tratamiento de datos personales (Ley 1581 de 2012)',
    }),
  }),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar los Términos y Condiciones' }),
  }),
});

export const confirmRegistrationSchema = z.object({
  verificationId: z.string().uuid('Solicitud de verificación inválida'),
  code: otpCode,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'La contraseña es obligatoria').max(128),
});

export const forgotPasswordSchema = z.object({
  email,
});

export const resetPasswordSchema = z.object({
  email,
  code: otpCode,
  newPassword: password,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida').max(128),
  newPassword: password,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'El token de verificación es requerido').max(200),
});

export const verifyPhoneSchema = z.object({
  code: otpCode,
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Confirma tu contraseña').max(128),
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type ConfirmRegistrationDto = z.infer<typeof confirmRegistrationSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;
