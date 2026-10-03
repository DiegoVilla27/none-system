import { Request, Response, NextFunction } from 'express';

/**
 * Cabeceras HTTP de endurecimiento para una API JSON.
 * (Las rutas de Swagger UI necesitan scripts propios y se excluyen de la CSP estricta.)
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  if (!req.path.startsWith('/docs') && !req.path.startsWith('/api-docs')) {
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  }
  res.removeHeader('X-Powered-By');
  next();
};
