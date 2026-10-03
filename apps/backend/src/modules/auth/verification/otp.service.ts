import { CryptoService } from '../../../core/security/crypto.service.js';
import { BadRequestError } from '../../../core/errors/index.js';
import { TooManyRequestsError } from '../../../core/middlewares/rate-limit.middleware.js';
import { isProduction } from '../../../config/env.js';
import { WhatsAppMessenger } from '../../whatsapp/whatsapp.messenger.js';
import {
  IPhoneVerificationRepository,
  PhoneVerificationRecord,
  VerificationPurpose,
} from './phone-verification.repository.js';

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_WINDOW = 3;
const CODES_WINDOW_MS = 15 * 60 * 1000;
const MAX_CODES_PER_DAY = 10;

export interface IssuedCode {
  verificationId: string;
  expiresAt: string;
  /** Solo fuera de producción, para poder probar sin WhatsApp real. */
  devCode?: string;
}

/**
 * Emisión y verificación de códigos de un solo uso enviados por WhatsApp.
 * Los códigos se guardan con HMAC-SHA256, expiran en 10 minutos y admiten 5 intentos.
 */
export class OtpService {
  constructor(
    private readonly repository: IPhoneVerificationRepository,
    private readonly messenger: WhatsAppMessenger
  ) {}

  async issue(
    phoneNumber: string,
    purpose: VerificationPurpose,
    options: { userId?: string; payload?: Record<string, unknown> } = {}
  ): Promise<IssuedCode> {
    const now = Date.now();
    const recent = await this.repository.countCreatedSince(phoneNumber, purpose, new Date(now - CODES_WINDOW_MS));
    const today = await this.repository.countCreatedSince(phoneNumber, purpose, new Date(now - 24 * 60 * 60 * 1000));
    if (recent >= MAX_CODES_PER_WINDOW || today >= MAX_CODES_PER_DAY) {
      throw new TooManyRequestsError('Has solicitado demasiados códigos. Espera unos minutos antes de intentarlo de nuevo.');
    }

    await this.repository.invalidateActive(phoneNumber, purpose);

    const code = CryptoService.generateNumericCode(6);
    const record = await this.repository.create({
      phoneNumber,
      purpose,
      userId: options.userId ?? null,
      codeHash: CryptoService.hashToken(code),
      payload: options.payload ?? null,
      expiresAt: new Date(now + CODE_TTL_MS),
    });

    const sent = await this.messenger.sendOtp(phoneNumber, code);
    if (!sent && isProduction) {
      await this.repository.consume(record.id);
      throw new BadRequestError(
        'No pudimos enviar el código a tu WhatsApp. Verifica el número o escríbele primero a nuestro bot e inténtalo de nuevo.'
      );
    }

    return {
      verificationId: record.id,
      expiresAt: record.expiresAt.toISOString(),
      devCode: isProduction ? undefined : code,
    };
  }

  /**
   * Verifica el código y lo consume. Lanza error si es inválido, expiró o superó los intentos.
   */
  async verify(
    record: PhoneVerificationRecord | null,
    code: string,
    expectedPurpose: VerificationPurpose
  ): Promise<PhoneVerificationRecord> {
    const invalid = new BadRequestError('El código es inválido o ya expiró. Solicita uno nuevo.');

    if (!record || record.purpose !== expectedPurpose || record.consumedAt) throw invalid;
    if (record.expiresAt.getTime() <= Date.now()) throw invalid;
    if (record.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestError('Superaste el número de intentos permitidos. Solicita un código nuevo.');
    }

    const normalized = code.replace(/\D/g, '');
    if (!CryptoService.safeEqual(CryptoService.hashToken(normalized), record.codeHash)) {
      await this.repository.incrementAttempts(record.id);
      const remaining = MAX_ATTEMPTS - record.attempts - 1;
      throw new BadRequestError(
        remaining > 0
          ? `Código incorrecto. Te quedan ${remaining} intento${remaining === 1 ? '' : 's'}.`
          : 'Superaste el número de intentos permitidos. Solicita un código nuevo.'
      );
    }

    const consumed = await this.repository.consume(record.id);
    if (!consumed) throw invalid;
    return record;
  }
}
