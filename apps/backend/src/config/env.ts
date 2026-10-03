import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env
dotenv.config();

// Valores de desarrollo: nunca deben llegar a producción (ver validación más abajo).
export const DEV_JWT_SECRET = 'dev-only-none-system-jwt-secret-change-me';
export const DEV_ENCRYPTION_SECRET = 'dev-only-none-system-encryption-secret-change-me';
export const DEV_WHATSAPP_VERIFY_TOKEN = 'none_system_verify_token_2026';

const booleanFromString = z
  .enum(['true', 'false', '1', '0'])
  .transform((val) => val === 'true' || val === '1');

const envSchema = z
  .object({
    PORT: z.string().default('4000').transform((val) => parseInt(val, 10)),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    API_PREFIX: z.string().default('/api/v1'),
    STORAGE_DRIVER: z.enum(['local', 's3', 'supabase']).default('local'),
    UPLOAD_DIR: z.string().default('uploads'),
    GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
    GEMINI_MODEL: z.string().default('gemini-3.5-flash'),

    // Database and Security
    DATABASE_URL: z.string().optional(),
    JWT_SECRET: z.string().default(DEV_JWT_SECRET),
    ENCRYPTION_SECRET: z.string().default(DEV_ENCRYPTION_SECRET),
    // Orígenes permitidos por CORS separados por coma (backoffice y landing)
    CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),
    // Número de proxies inversos delante del backend (para obtener la IP real del cliente)
    TRUST_PROXY: z.string().default('1').transform((val) => parseInt(val, 10)),

    // URLs públicas usadas en mensajes y enlaces legales
    BACKOFFICE_URL: z.string().default('http://localhost:3000'),
    LANDING_URL: z.string().default('http://localhost:3001'),

    // Pagos simulados (sin pasarela): solo fuera de producción y solo si Wompi no está configurado.
    ALLOW_SIMULATED_PAYMENTS: booleanFromString.optional(),

    // Pasarela de pagos Wompi (sandbox: pub_test_..., producción: pub_prod_...)
    WOMPI_PUBLIC_KEY: z.string().default(''),
    WOMPI_INTEGRITY_SECRET: z.string().default(''),
    WOMPI_EVENTS_SECRET: z.string().default(''),

    // Correo transaccional (Resend). Sin API key, los correos se imprimen en consola (desarrollo).
    RESEND_API_KEY: z.string().default(''),
    EMAIL_FROM: z.string().default('none-system <onboarding@resend.dev>'),

    // WhatsApp Meta Cloud API Configuration
    WHATSAPP_VERIFY_TOKEN: z.string().default(DEV_WHATSAPP_VERIFY_TOKEN),
    WHATSAPP_API_TOKEN: z.string().default(''),
    WHATSAPP_PHONE_NUMBER_ID: z.string().default(''),
    WHATSAPP_API_VERSION: z.string().default('v21.0'),
    // "App Secret" de la app de Meta: firma X-Hub-Signature-256 de cada webhook
    WHATSAPP_APP_SECRET: z.string().default(''),
    // Plantilla de autenticación aprobada en Meta para enviar códigos OTP
    WHATSAPP_OTP_TEMPLATE_NAME: z.string().default(''),
    WHATSAPP_OTP_TEMPLATE_LANG: z.string().default('es'),
    // URL pública (https) de la imagen de bienvenida. Si no se define, se sube assets/welcome.jpg a Meta.
    WHATSAPP_WELCOME_IMAGE_URL: z.string().default(''),
  })
  .superRefine((cfg, ctx) => {
    if (cfg.NODE_ENV !== 'production') return;

    const requireStrong = (key: 'JWT_SECRET' | 'ENCRYPTION_SECRET', devValue: string) => {
      const value = cfg[key];
      if (value === devValue || value.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} debe definirse en producción con al menos 32 caracteres aleatorios`,
        });
      }
    };

    requireStrong('JWT_SECRET', DEV_JWT_SECRET);
    requireStrong('ENCRYPTION_SECRET', DEV_ENCRYPTION_SECRET);

    if (!cfg.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL es obligatoria en producción (no se permite el modo en memoria)',
      });
    }

    if (cfg.WHATSAPP_VERIFY_TOKEN === DEV_WHATSAPP_VERIFY_TOKEN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['WHATSAPP_VERIFY_TOKEN'],
        message: 'WHATSAPP_VERIFY_TOKEN debe ser un valor propio y secreto en producción',
      });
    }

    if (cfg.WHATSAPP_API_TOKEN && !cfg.WHATSAPP_APP_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['WHATSAPP_APP_SECRET'],
        message: 'WHATSAPP_APP_SECRET es obligatorio en producción para validar la firma de los webhooks',
      });
    }

    if (cfg.WOMPI_PUBLIC_KEY.startsWith('pub_test_')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['WOMPI_PUBLIC_KEY'],
        message: 'En producción se requieren llaves de Wompi de producción (pub_prod_)',
      });
    }

    if (cfg.ALLOW_SIMULATED_PAYMENTS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ALLOW_SIMULATED_PAYMENTS'],
        message: 'Los pagos simulados no pueden habilitarse en producción',
      });
    }
  });

const parseEnv = () => {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    throw new Error('Invalid environment configuration');
  }
  const data = parsed.data;
  const wompiConfigured = Boolean(
    data.WOMPI_PUBLIC_KEY && data.WOMPI_INTEGRITY_SECRET && data.WOMPI_EVENTS_SECRET
  );
  return {
    ...data,
    WOMPI_CONFIGURED: wompiConfigured,
    WOMPI_API_URL: data.WOMPI_PUBLIC_KEY.startsWith('pub_prod_')
      ? 'https://production.wompi.co/v1'
      : 'https://sandbox.wompi.co/v1',
    ALLOW_SIMULATED_PAYMENTS:
      !wompiConfigured && (data.ALLOW_SIMULATED_PAYMENTS ?? data.NODE_ENV !== 'production'),
    CORS_ORIGIN_LIST: data.CORS_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  };
};

export const env = parseEnv();
export type Env = typeof env;

export const isProduction = env.NODE_ENV === 'production';
export const isWhatsAppConfigured = Boolean(env.WHATSAPP_API_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
