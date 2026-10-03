import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  const { method } = req;
  // Sin query string: puede contener tokens (ej. hub.verify_token) o datos personales
  const path = req.originalUrl.split('?')[0];

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const color = statusCode >= 500 ? '\x1b[31m' : statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
    const reset = '\x1b[0m';
    console.log(`[HTTP] ${method} ${path} ${color}${statusCode}${reset} - ${duration}ms`);
  });

  next();
};
