import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { ForbiddenError, UnauthorizedError } from '../../../core/errors/index.js';
import { env, isProduction } from '../../../config/env.js';
import { IUserRepository } from '../repositories/user.repository.interface.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  phoneNumber: string;
  /** Versión de sesión del usuario al emitir el token. */
  sv?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const AUTH_COOKIE_NAME = 'none_auth_token';
export const JWT_ALGORITHM = 'HS256';
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Cookie de sesión: inaccesible desde JavaScript (HttpOnly) y no enviada en peticiones cross-site (SameSite=Lax). */
export function setSessionCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/' });
}

function bearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim() || null;
  }
  return null;
}

function cookieToken(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const [rawName, ...rest] = part.trim().split('=');
    if (rawName === AUTH_COOKIE_NAME) {
      const value = decodeURIComponent(rest.join('='));
      return value || null;
    }
  }
  return null;
}

/**
 * Protección CSRF para sesiones por cookie: las peticiones que modifican datos deben venir
 * de un origen propio (backoffice). Los navegadores siempre envían Origin en POST/PUT/DELETE.
 */
function isTrustedOrigin(req: Request): boolean {
  const origin = req.get('origin') || (req.get('referer') ? safeOrigin(req.get('referer')!) : null);
  return Boolean(origin && env.CORS_ORIGIN_LIST.includes(origin));
}

function safeOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export interface AuthMiddleware {
  requireAuth: RequestHandler;
  requireAdmin: RequestHandler;
}

/**
 * Autenticación por cookie HttpOnly (navegador) o Bearer token (clientes de API).
 * En cada petición se valida contra la base de datos que el usuario exista y que la sesión
 * no haya sido revocada (cambio de contraseña, "cerrar todas las sesiones" o cuenta eliminada).
 */
export function createAuthMiddleware(userRepository: IUserRepository): AuthMiddleware {
  const requireAuth: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
    const bearer = bearerToken(req);
    const token = bearer || cookieToken(req);
    if (!token) return next(new UnauthorizedError('Debes iniciar sesión'));

    if (!bearer && !SAFE_METHODS.has(req.method) && !isTrustedOrigin(req)) {
      return next(new ForbiddenError('Origen de la solicitud no permitido'));
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET, { algorithms: [JWT_ALGORITHM] }) as JwtPayload;
    } catch {
      return next(new UnauthorizedError('Tu sesión expiró. Inicia sesión de nuevo.'));
    }

    userRepository
      .findById(payload.sub)
      .then((user) => {
        if (!user || (payload.sv ?? 0) !== user.sessionVersion) {
          return next(new UnauthorizedError('Tu sesión ya no es válida. Inicia sesión de nuevo.'));
        }
        // El rol se toma de la base de datos, no del token (un cambio de rol aplica de inmediato)
        req.user = { sub: user.id, email: user.email, role: user.role, phoneNumber: user.phoneNumber, sv: user.sessionVersion };
        next();
      })
      .catch(next);
  };

  const requireAdmin: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
    if (req.user?.role !== 'admin') return next(new ForbiddenError('No tienes permisos para esta operación'));
    next();
  };

  return { requireAuth, requireAdmin };
}
