import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
} from '../dtos/auth.dto.js';
import { UnauthorizedError } from '../../../core/errors/index.js';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = registerSchema.parse(req.body);
      const ip = req.ip || req.socket.remoteAddress;
      const session = await this.authService.register(validated, ip);

      res.status(201).json({
        status: 'success',
        message: 'Usuario registrado exitosamente',
        data: session,
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = loginSchema.parse(req.body);
      const session = await this.authService.login(validated);

      res.status(200).json({
        status: 'success',
        message: 'Sesión iniciada correctamente',
        data: session,
      });
    } catch (error) {
      next(error);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = verifyEmailSchema.parse(req.body);
      const result = await this.authService.verifyEmail(validated.token);

      res.status(200).json({
        status: 'success',
        message: result.message,
        data: result.user,
      });
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = forgotPasswordSchema.parse(req.body);
      const result = await this.authService.requestPasswordReset(validated);

      res.status(200).json({
        status: 'success',
        message: result.message,
        data: {
          resetToken: result.resetToken,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = resetPasswordSchema.parse(req.body);
      const result = await this.authService.resetPassword(validated);

      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.sub) {
        throw new UnauthorizedError('Debes iniciar sesión para cambiar la contraseña');
      }

      const validated = changePasswordSchema.parse(req.body);
      const result = await this.authService.changePassword(req.user.sub, validated);

      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.sub) {
        throw new UnauthorizedError('Debes iniciar sesión');
      }

      const result = await this.authService.getMe(req.user.sub);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
