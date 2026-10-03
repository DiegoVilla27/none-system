import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUserRepository } from '../repositories/user.repository.interface.js';
import {
  User,
  UserProfile,
  HABEAS_DATA_POLICY_VERSION,
  isWhatsAppOnlyAccount,
} from '../entities/user.entity.js';
import {
  RegisterDto,
  ConfirmRegistrationDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from '../dtos/auth.dto.js';
import { SubscriptionService } from '../../subscriptions/subscription.service.js';
import { UserSubscription } from '../../subscriptions/subscription.entity.js';
import { CryptoService } from '../../../core/security/crypto.service.js';
import { maskPhone } from '../../../core/security/privacy.js';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../../../core/errors/index.js';
import { env, isProduction } from '../../../config/env.js';
import { JWT_ALGORITHM } from '../middlewares/auth.middleware.js';
import { OtpService } from '../verification/otp.service.js';
import { IPhoneVerificationRepository } from '../verification/phone-verification.repository.js';
import { AccountService } from './account.service.js';
import { EmailService, EmailTemplates } from '../../../core/email/email.service.js';

export interface AuthSession {
  user: UserProfile;
  /** JWT de sesión: el controlador lo entrega en una cookie HttpOnly, nunca en el cuerpo. */
  token: string;
  /** Solo en desarrollo sin proveedor de correo configurado. */
  devEmailVerificationToken?: string;
}

export interface PendingRegistration {
  verificationId: string;
  phoneHint: string;
  expiresAt: string;
  devCode?: string;
}

interface RegistrationPayload {
  email: string;
  name: string;
  passwordHash: string;
  ipAddress?: string | null;
  consentAt: string;
  policyVersion: string;
}

const BCRYPT_ROUNDS = 12;
// Hash señuelo para igualar tiempos cuando el usuario no existe (evita enumeración por timing)
const DUMMY_HASH = bcrypt.hashSync('none-system-dummy-password', BCRYPT_ROUNDS);

export class AuthService {
  private readonly jwtExpiresIn = '7d';

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly subscriptionService: SubscriptionService,
    private readonly otpService: OtpService,
    private readonly verificationRepository: IPhoneVerificationRepository,
    private readonly accountService: AccountService,
    private readonly emailService: EmailService
  ) {}

  private toProfile(user: User): UserProfile {
    const {
      passwordHash: _passwordHash,
      verificationToken: _verificationToken,
      verificationTokenExpires: _verificationTokenExpires,
      resetPasswordToken: _resetPasswordToken,
      resetPasswordExpires: _resetPasswordExpires,
      sessionVersion: _sessionVersion,
      ...profile
    } = user;
    return { ...profile, isWhatsAppOnly: isWhatsAppOnlyAccount(user) };
  }

  private generateToken(user: User): string {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        sv: user.sessionVersion,
      },
      env.JWT_SECRET,
      { expiresIn: this.jwtExpiresIn, algorithm: JWT_ALGORITHM }
    );
  }

  /** Envía el enlace de verificación de correo; devuelve el token solo en desarrollo sin proveedor. */
  private async sendEmailVerification(user: User, token: string): Promise<string | undefined> {
    const url = `${env.BACKOFFICE_URL}/verify-email?token=${encodeURIComponent(token)}`;
    await this.emailService.send({ to: user.email, ...EmailTemplates.verifyEmail(user.name, url) });
    return !isProduction && !this.emailService.isConfigured ? token : undefined;
  }

  private notify(user: User, template: ReturnType<(typeof EmailTemplates)[keyof typeof EmailTemplates]>): void {
    if (isWhatsAppOnlyAccount(user)) return;
    // Notificación de cortesía: un fallo de correo no debe interrumpir la operación
    this.emailService.send({ to: user.email, ...template }).catch(() => undefined);
  }

  private newEmailVerification(): { token: string; hash: string; expires: string } {
    const token = CryptoService.generateSecureToken(24);
    return {
      token,
      hash: CryptoService.hashToken(token),
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Paso 1 del registro: valida los datos y envía un código por WhatsApp al número indicado.
   * La cuenta solo se crea cuando el usuario demuestra que el número es suyo.
   */
  async register(dto: RegisterDto, ipAddress?: string): Promise<PendingRegistration> {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestError('El correo electrónico ya se encuentra registrado');
    }

    const existingByPhone = await this.userRepository.findByPhone(dto.phoneNumber);
    if (existingByPhone && !isWhatsAppOnlyAccount(existingByPhone)) {
      throw new BadRequestError('Este número de WhatsApp ya está vinculado a otra cuenta. Si es tuyo, recupera tu contraseña.');
    }

    const payload: RegistrationPayload = {
      email: dto.email,
      name: dto.name,
      passwordHash: bcrypt.hashSync(dto.password, BCRYPT_ROUNDS),
      ipAddress: ipAddress ?? null,
      consentAt: new Date().toISOString(),
      policyVersion: HABEAS_DATA_POLICY_VERSION,
    };

    const issued = await this.otpService.issue(dto.phoneNumber, 'register', {
      payload: payload as unknown as Record<string, unknown>,
    });

    return {
      verificationId: issued.verificationId,
      phoneHint: maskPhone(dto.phoneNumber),
      expiresAt: issued.expiresAt,
      devCode: issued.devCode,
    };
  }

  /**
   * Paso 2 del registro: verifica el código y crea la cuenta (o vincula la cuenta de WhatsApp existente).
   */
  async confirmRegistration(dto: ConfirmRegistrationDto): Promise<AuthSession> {
    const record = await this.verificationRepository.findById(dto.verificationId);
    const verified = await this.otpService.verify(record, dto.code, 'register');
    const payload = verified.payload as unknown as RegistrationPayload | null;
    if (!payload?.email || !payload.passwordHash) {
      throw new BadRequestError('La solicitud de registro no es válida. Vuelve a registrarte.');
    }

    // Revalidar: pudo registrarse otra cuenta mientras tanto
    if (await this.userRepository.findByEmail(payload.email)) {
      throw new BadRequestError('El correo electrónico ya se encuentra registrado');
    }

    const now = new Date().toISOString();
    const emailVerification = this.newEmailVerification();
    const consent = {
      accepted: true,
      acceptedAt: payload.consentAt,
      ipAddress: payload.ipAddress ?? null,
      version: payload.policyVersion,
      channel: 'web' as const,
    };

    const existingByPhone = await this.userRepository.findByPhone(verified.phoneNumber);
    let savedUser: User;

    if (existingByPhone) {
      if (!isWhatsAppOnlyAccount(existingByPhone)) {
        throw new BadRequestError('Este número de WhatsApp ya está vinculado a otra cuenta.');
      }
      // El titular del número ya usaba el bot: se le habilita el acceso web conservando sus gastos
      const updated = await this.userRepository.update(existingByPhone.id, {
        email: payload.email,
        name: payload.name,
        passwordHash: payload.passwordHash,
        phoneVerified: true,
        emailVerified: false,
        verificationToken: emailVerification.hash,
        verificationTokenExpires: emailVerification.expires,
        habeasDataConsent: consent,
        sessionVersion: existingByPhone.sessionVersion + 1,
      });
      if (!updated) throw new BadRequestError('Error vinculando la cuenta de WhatsApp');
      savedUser = updated;
    } else {
      savedUser = await this.userRepository.create({
        id: `usr-${randomUUID()}`,
        email: payload.email,
        passwordHash: payload.passwordHash,
        name: payload.name,
        phoneNumber: verified.phoneNumber,
        phoneVerified: true,
        sessionVersion: 0,
        role: 'user',
        emailVerified: false,
        verificationToken: emailVerification.hash,
        verificationTokenExpires: emailVerification.expires,
        habeasDataConsent: consent,
        createdAt: now,
        updatedAt: now,
      });
    }

    await this.subscriptionService.getOrCreateSubscription(savedUser.phoneNumber, savedUser.name, savedUser.id);

    return {
      user: this.toProfile(savedUser),
      token: this.generateToken(savedUser),
      devEmailVerificationToken: await this.sendEmailVerification(savedUser, emailVerification.token),
    };
  }

  async login(dto: LoginDto): Promise<AuthSession> {
    const user = await this.userRepository.findByEmail(dto.email);
    const isMatch = bcrypt.compareSync(dto.password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !isMatch || isWhatsAppOnlyAccount(user)) {
      throw new UnauthorizedError('Credenciales incorrectas');
    }

    return {
      user: this.toProfile(user),
      token: this.generateToken(user),
    };
  }

  async resendEmailVerification(userId: string): Promise<{ message: string; devEmailVerificationToken?: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('Usuario no encontrado');
    if (user.emailVerified) throw new BadRequestError('Tu correo ya está verificado.');
    if (isWhatsAppOnlyAccount(user)) throw new BadRequestError('Tu cuenta no tiene un correo registrado.');

    const verification = this.newEmailVerification();
    await this.userRepository.update(user.id, {
      verificationToken: verification.hash,
      verificationTokenExpires: verification.expires,
    });
    return {
      message: `Te enviamos un enlace de verificación a ${user.email}`,
      devEmailVerificationToken: await this.sendEmailVerification(user, verification.token),
    };
  }

  async verifyEmail(token: string): Promise<{ message: string; user: UserProfile }> {
    const user = await this.userRepository.findByVerificationToken(CryptoService.hashToken(token));
    if (!user) {
      throw new BadRequestError('El token de verificación es inválido o ya fue utilizado');
    }

    if (user.verificationTokenExpires && new Date(user.verificationTokenExpires) < new Date()) {
      throw new BadRequestError('El token de verificación ha expirado');
    }

    const updated = await this.userRepository.update(user.id, {
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpires: null,
    });

    if (!updated) {
      throw new NotFoundError('Usuario no encontrado');
    }

    return {
      message: 'Correo electrónico verificado exitosamente',
      user: this.toProfile(updated),
    };
  }

  /**
   * Envía un código de recuperación al WhatsApp verificado del usuario.
   * La respuesta es idéntica exista o no el correo (evita enumeración de cuentas).
   */
  async requestPasswordReset(dto: ForgotPasswordDto): Promise<{ message: string; devCode?: string }> {
    const message =
      'Si el correo está registrado, enviamos un código de recuperación al WhatsApp asociado a la cuenta.';
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user || !user.phoneVerified || isWhatsAppOnlyAccount(user)) {
      return { message };
    }

    try {
      const issued = await this.otpService.issue(user.phoneNumber, 'reset_password', { userId: user.id });
      return { message, devCode: issued.devCode };
    } catch (err) {
      // No revelar límites ni errores de envío ligados a una cuenta concreta
      console.warn('[Auth] No se pudo emitir código de recuperación:', (err as Error).message);
      return { message };
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.userRepository.findByEmail(dto.email);
    const record = user ? await this.verificationRepository.findLatestActive(user.phoneNumber, 'reset_password') : null;
    if (!user || !record || record.userId !== user.id) {
      throw new BadRequestError('El código es inválido o ya expiró. Solicita uno nuevo.');
    }

    await this.otpService.verify(record, dto.code, 'reset_password');

    // Cambiar la contraseña cierra todas las sesiones abiertas
    await this.userRepository.update(user.id, {
      passwordHash: bcrypt.hashSync(dto.newPassword, BCRYPT_ROUNDS),
      sessionVersion: user.sessionVersion + 1,
    });
    this.notify(user, EmailTemplates.passwordChanged(user.name));

    return {
      message: 'Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión.',
    };
  }

  /** Cambia la contraseña, revoca las demás sesiones y devuelve un token nuevo para la sesión actual. */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string; token: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    const isMatch = bcrypt.compareSync(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestError('La contraseña actual es incorrecta');
    }

    const updated = await this.userRepository.update(user.id, {
      passwordHash: bcrypt.hashSync(dto.newPassword, BCRYPT_ROUNDS),
      sessionVersion: user.sessionVersion + 1,
    });
    this.notify(user, EmailTemplates.passwordChanged(user.name));

    return {
      message: 'Contraseña modificada. Cerramos las sesiones abiertas en otros dispositivos.',
      token: this.generateToken(updated!),
    };
  }

  /** Cierra todas las sesiones del usuario en todos los dispositivos. */
  async logoutEverywhere(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) return;
    await this.userRepository.update(user.id, { sessionVersion: user.sessionVersion + 1 });
  }

  /**
   * Cuentas creadas antes de la verificación obligatoria: envía un código para confirmar el número.
   */
  async sendPhoneVerification(userId: string): Promise<{ phoneHint: string; expiresAt: string; devCode?: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('Usuario no encontrado');
    if (user.phoneVerified) throw new BadRequestError('Tu número de WhatsApp ya está verificado.');

    const issued = await this.otpService.issue(user.phoneNumber, 'verify_phone', { userId: user.id });
    return { phoneHint: maskPhone(user.phoneNumber), expiresAt: issued.expiresAt, devCode: issued.devCode };
  }

  async confirmPhoneVerification(userId: string, code: string): Promise<{ user: UserProfile }> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('Usuario no encontrado');

    const record = await this.verificationRepository.findLatestActive(user.phoneNumber, 'verify_phone');
    if (!record || record.userId !== user.id) {
      throw new BadRequestError('El código es inválido o ya expiró. Solicita uno nuevo.');
    }
    await this.otpService.verify(record, code, 'verify_phone');

    const updated = await this.userRepository.update(user.id, { phoneVerified: true });
    await this.subscriptionService.getOrCreateSubscription(user.phoneNumber, user.name, user.id);
    return { user: this.toProfile(updated!) };
  }

  async deleteAccount(userId: string, password: string): Promise<{ message: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('Usuario no encontrado');
    if (!bcrypt.compareSync(password, user.passwordHash)) {
      throw new BadRequestError('La contraseña es incorrecta');
    }

    await this.accountService.deleteAccount(user.id);
    this.notify(user, EmailTemplates.accountDeleted(user.name));
    return { message: 'Tu cuenta y todos tus datos fueron eliminados de forma permanente.' };
  }

  async getMe(userId: string): Promise<{ user: UserProfile; subscription: UserSubscription | null }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('Tu sesión ya no es válida');
    }

    // El cupo solo se asocia a números verificados
    const subscription = user.phoneVerified
      ? await this.subscriptionService.getOrCreateSubscription(user.phoneNumber, user.name, user.id)
      : null;

    return {
      user: this.toProfile(user),
      subscription,
    };
  }
}
