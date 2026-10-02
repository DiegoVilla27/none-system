import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUserRepository } from '../repositories/user.repository.interface.js';
import { User, UserProfile } from '../entities/user.entity.js';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from '../dtos/auth.dto.js';
import { SubscriptionService } from '../../subscriptions/subscription.service.js';
import { CryptoService } from '../../../core/security/crypto.service.js';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../../../core/errors/index.js';

export interface AuthSession {
  user: UserProfile;
  token: string;
  verificationToken?: string;
}

export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn = '7d';

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly subscriptionService: SubscriptionService
  ) {
    this.jwtSecret = process.env.JWT_SECRET || 'none-system-colombia-jwt-secret-key-2026';
  }

  private toProfile(user: User): UserProfile {
    const {
      passwordHash,
      verificationToken,
      verificationTokenExpires,
      resetPasswordToken,
      resetPasswordExpires,
      ...profile
    } = user;
    return profile;
  }

  private generateToken(user: User): string {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn }
    );
  }

  async register(dto: RegisterDto, ipAddress?: string): Promise<AuthSession> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const cleanPhone = dto.phoneNumber.replace(/\D/g, '');

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new BadRequestError('El correo electrónico ya se encuentra registrado');
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(dto.password, salt);
    const now = new Date();
    const verificationToken = CryptoService.generateSecureToken(24);
    const verificationExpires = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const newUser: User = {
      id: `usr-${randomUUID()}`,
      email: normalizedEmail,
      passwordHash,
      name: dto.name.trim(),
      phoneNumber: cleanPhone,
      role: 'user',
      emailVerified: false,
      verificationToken,
      verificationTokenExpires: verificationExpires,
      habeasDataConsent: {
        accepted: true,
        acceptedAt: now.toISOString(),
        ipAddress: ipAddress || '127.0.0.1',
        version: 'Ley-1581-2012',
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const savedUser = await this.userRepository.create(newUser);

    // Inicializar suscripción gratuita asociada a su teléfono de WhatsApp
    await this.subscriptionService.getOrCreateSubscription(cleanPhone, dto.name.trim());

    const token = this.generateToken(savedUser);

    return {
      user: this.toProfile(savedUser),
      token,
      verificationToken,
    };
  }

  async login(dto: LoginDto): Promise<AuthSession> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new UnauthorizedError('Credenciales incorrectas');
    }

    const isMatch = bcrypt.compareSync(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Credenciales incorrectas');
    }

    const token = this.generateToken(user);

    return {
      user: this.toProfile(user),
      token,
    };
  }

  async verifyEmail(token: string): Promise<{ message: string; user: UserProfile }> {
    const user = await this.userRepository.findByVerificationToken(token);
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

  async requestPasswordReset(
    dto: ForgotPasswordDto
  ): Promise<{ message: string; resetToken?: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      // Por seguridad evitamos revelar si el email existe
      return {
        message: 'Si el correo está registrado, recibirás un enlace de recuperación.',
      };
    }

    const resetToken = CryptoService.generateSecureToken(24);
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hora

    await this.userRepository.update(user.id, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: expires,
    });

    return {
      message: 'Enlace de restablecimiento generado con éxito.',
      resetToken, // Devuelto en desarrollo para pruebas inmediatas sin servidor SMTP
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.userRepository.findByResetToken(dto.token);
    if (!user) {
      throw new BadRequestError('El enlace de restablecimiento es inválido o ha caducado');
    }

    if (user.resetPasswordExpires && new Date(user.resetPasswordExpires) < new Date()) {
      throw new BadRequestError('El enlace de restablecimiento ha expirado');
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(dto.newPassword, salt);

    await this.userRepository.update(user.id, {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    return {
      message: 'Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión.',
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    const isMatch = bcrypt.compareSync(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestError('La contraseña actual es incorrecta');
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(dto.newPassword, salt);

    await this.userRepository.update(user.id, {
      passwordHash,
    });

    return {
      message: 'Contraseña modificada correctamente.',
    };
  }

  async getMe(userId: string): Promise<{ user: UserProfile; subscription: any }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    const subscription = await this.subscriptionService.getOrCreateSubscription(
      user.phoneNumber,
      user.name
    );

    return {
      user: this.toProfile(user),
      subscription,
    };
  }
}
