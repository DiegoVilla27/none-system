import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../../../core/errors/index.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  phoneNumber: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'none-system-colombia-jwt-secret-key-2026';

/**
 * Middleware que exige autenticación mediante JWT Bearer Token.
 */
export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Se requiere token de autenticación Bearer');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    throw new UnauthorizedError('Token de autenticación expirado o inválido');
  }
};

/**
 * Middleware opcional: si viene token lo valida y adjunta a req.user,
 * pero no rechaza la petición si no viene token.
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      req.user = decoded;
    } catch {
      // Ignorar si es inválido en modo opcional
    }
  }

  next();
};
