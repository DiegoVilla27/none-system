import { Request, Response } from 'express';
import { AuthService, AuthSession } from '../services/auth.service.js';
import {
  registerSchema,
  confirmRegistrationSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  verifyPhoneSchema,
  deleteAccountSchema,
} from '../dtos/auth.dto.js';
import { asyncHandler } from '../../../core/middlewares/async-handler.js';
import { UnauthorizedError } from '../../../core/errors/index.js';
import { setSessionCookie, clearSessionCookie } from '../middlewares/auth.middleware.js';

const currentUserId = (req: Request): string => {
  if (!req.user?.sub) throw new UnauthorizedError('Debes iniciar sesión');
  return req.user.sub;
};

/** Entrega la sesión en una cookie HttpOnly; el token nunca viaja en el cuerpo de la respuesta. */
const startSession = (res: Response, session: AuthSession) => {
  setSessionCookie(res, session.token);
  const { token: _token, ...body } = session;
  return body;
};

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = asyncHandler(async (req: Request, res: Response) => {
    const validated = registerSchema.parse(req.body);
    const pending = await this.authService.register(validated, req.ip || req.socket.remoteAddress);

    res.status(202).json({
      status: 'success',
      message: `Te enviamos un código de verificación por WhatsApp al número ${pending.phoneHint}`,
      data: pending,
    });
  });

  confirmRegistration = asyncHandler(async (req: Request, res: Response) => {
    const validated = confirmRegistrationSchema.parse(req.body);
    const session = await this.authService.confirmRegistration(validated);

    res.status(201).json({
      status: 'success',
      message: 'Cuenta creada y número de WhatsApp verificado',
      data: startSession(res, session),
    });
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const validated = loginSchema.parse(req.body);
    const session = await this.authService.login(validated);

    res.status(200).json({
      status: 'success',
      message: 'Sesión iniciada correctamente',
      data: startSession(res, session),
    });
  });

  logout = asyncHandler(async (_req: Request, res: Response) => {
    clearSessionCookie(res);
    res.status(200).json({ status: 'success', message: 'Sesión cerrada' });
  });

  logoutEverywhere = asyncHandler(async (req: Request, res: Response) => {
    await this.authService.logoutEverywhere(currentUserId(req));
    clearSessionCookie(res);
    res.status(200).json({ status: 'success', message: 'Cerramos tu sesión en todos los dispositivos' });
  });

  verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const validated = verifyEmailSchema.parse(req.body);
    const result = await this.authService.verifyEmail(validated.token);

    res.status(200).json({
      status: 'success',
      message: result.message,
      data: result.user,
    });
  });

  resendEmailVerification = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.authService.resendEmailVerification(currentUserId(req));
    res.status(200).json({ status: 'success', message: result.message, data: result });
  });

  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const validated = forgotPasswordSchema.parse(req.body);
    const result = await this.authService.requestPasswordReset(validated);

    res.status(200).json({
      status: 'success',
      message: result.message,
      data: { message: result.message, devCode: result.devCode },
    });
  });

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const validated = resetPasswordSchema.parse(req.body);
    const result = await this.authService.resetPassword(validated);

    res.status(200).json({
      status: 'success',
      message: result.message,
      data: result,
    });
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const validated = changePasswordSchema.parse(req.body);
    const { message, token } = await this.authService.changePassword(currentUserId(req), validated);
    setSessionCookie(res, token);

    res.status(200).json({ status: 'success', message, data: { message } });
  });

  sendPhoneVerification = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.authService.sendPhoneVerification(currentUserId(req));
    res.status(200).json({
      status: 'success',
      message: `Te enviamos un código por WhatsApp al número ${result.phoneHint}`,
      data: result,
    });
  });

  confirmPhoneVerification = asyncHandler(async (req: Request, res: Response) => {
    const { code } = verifyPhoneSchema.parse(req.body);
    const result = await this.authService.confirmPhoneVerification(currentUserId(req), code);
    res.status(200).json({ status: 'success', message: 'Número de WhatsApp verificado', data: result });
  });

  deleteAccount = asyncHandler(async (req: Request, res: Response) => {
    const { password } = deleteAccountSchema.parse(req.body);
    const result = await this.authService.deleteAccount(currentUserId(req), password);
    clearSessionCookie(res);
    res.status(200).json({ status: 'success', message: result.message, data: result });
  });

  getMe = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.authService.getMe(currentUserId(req));

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });
}
